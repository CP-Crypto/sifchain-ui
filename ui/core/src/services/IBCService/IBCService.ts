import {
  SigningStargateClient,
  StargateClient,
  MsgTransferEncodeObject,
  BroadcastTxResponse,
  IndexedTx,
  MsgSendEncodeObject,
  AminoTypes,
  SignerData,
  isAminoMsgDelegate,
} from "@cosmjs/stargate";
import { OfflineSigner } from "@cosmjs/proto-signing";
import * as inflection from "inflection";
import {
  Asset,
  IAssetAmount,
  Network,
  getChainsService,
  NetworkChainConfigLookup,
  IBCChainConfig,
} from "../../entities";
import getKeplrProvider from "../SifService/getKeplrProvider";
import { findAttribute, parseRawLog } from "@cosmjs/stargate/build/logs";
import {
  QueryClient,
  setupBankExtension,
  setupIbcExtension,
  setupAuthExtension,
} from "@cosmjs/stargate/build/queries";
import { Tendermint34Client } from "@cosmjs/tendermint-rpc";
import { fetch } from "cross-fetch";
import * as IbcTransferV1Tx from "@cosmjs/stargate/build/codec/ibc/applications/transfer/v1/tx";
import Long from "long";
import JSBI from "jsbi";
import { calculateGasForIBCTransfer } from "./utils/calculateGasForIBCTransfer";
import { TokenRegistryService } from "../TokenRegistryService/TokenRegistryService";
import { KeplrWalletProvider } from "../../clients/wallets";
import { IBC_EXPORT_FEE_ADDRESS } from "../../utils/ibcExportFees";
import {
  AminoMsg,
  encodeSecp256k1Pubkey,
  makeSignDoc as makeSignDocAmino,
  OfflineAminoSigner,
  StdFee,
} from "@cosmjs/amino";
import { fromBase64 } from "@cosmjs/encoding";
import { Int53 } from "@cosmjs/math";
import {
  EncodeObject,
  encodePubkey,
  makeAuthInfoBytes,
} from "@cosmjs/proto-signing";
import { SignMode } from "@cosmjs/proto-signing/build/codec/cosmos/tx/signing/v1beta1/signing";
import { memoize } from "lodash";

export interface IBCServiceContext {
  // applicationNetworkEnvironment: NetworkEnv;
  sifRpcUrl: string;
  assets: Asset[];
  chainConfigsByNetwork: NetworkChainConfigLookup;
}

export class IBCService {
  networkDenomLookup: Record<Network, Record<string, string>> = {
    ethereum: {},
    cosmoshub: {},
    sifchain: {},
    // iris: {},
    akash: {},
    sentinel: {},
  };
  symbolLookup: Record<string, string> = {};

  tokenRegistry = TokenRegistryService(this.context);

  keplrProvider = KeplrWalletProvider.create(this.context);

  constructor(private context: IBCServiceContext) {}
  static create(context: IBCServiceContext) {
    return new this(context);
  }

  public loadChainConfigByChainId(chainId: string): IBCChainConfig {
    // @ts-ignore
    const chainConfig = Object.values(this.context.chainConfigsByNetwork).find(
      (c) => c?.chainId === chainId,
    );
    if (chainConfig?.chainType !== "ibc") {
      throw new Error(`No IBC chain config for network ${chainId}`);
    }
    return chainConfig;
  }
  public loadChainConfigByNetwork(network: Network): IBCChainConfig {
    // @ts-ignore
    const chainConfig = this.context.chainConfigsByNetwork[network];
    if (chainConfig?.chainType !== "ibc") {
      throw new Error(`No IBC chain config for network ${network}`);
    }
    return chainConfig;
  }

  async extractTransferMetadataFromTx(tx: IndexedTx | BroadcastTxResponse) {
    const logs = parseRawLog(tx.rawLog);
    const sequence = findAttribute(logs, "send_packet", "packet_sequence")
      .value;
    const dstChannel = findAttribute(logs, "send_packet", "packet_dst_channel")
      .value;
    const dstPort = findAttribute(logs, "send_packet", "packet_dst_port").value;
    const packet = findAttribute(logs, "send_packet", "packet_data").value;
    const timeoutTimestampNanoseconds = findAttribute(
      logs,
      "send_packet",
      "packet_timeout_timestamp",
    ).value;
    return {
      sequence,
      dstChannel,
      dstPort,
      packet,
      timeoutTimestampNanoseconds,
    };
  }

  async checkIfPacketReceivedByTx(
    txOrTxHash: string | IndexedTx | BroadcastTxResponse,
    destinationNetwork: Network,
  ) {
    const sourceChain = this.loadChainConfigByNetwork(destinationNetwork);
    const client = await StargateClient.connect(sourceChain.rpcUrl);
    const tx =
      typeof txOrTxHash === "string"
        ? await client.getTx(txOrTxHash)
        : txOrTxHash;
    if (typeof tx !== "object" || tx === null)
      throw new Error("invalid txOrTxHash. not found");
    const meta = await this.extractTransferMetadataFromTx(tx);
    return this.checkIfPacketReceived(
      destinationNetwork,
      meta.dstChannel,
      meta.dstPort,
      meta.sequence,
    );
  }

  async checkIfPacketReceived(
    network: Network,
    receivingChannelId: string,
    receivingPort: string,
    sequence: string | number,
  ) {
    const res: {
      received: boolean;
      proof: null | string;
      proof_height: {
        revision_number: string;
        revision_height: string;
      };
    } = await fetch(
      `${
        this.loadChainConfigByNetwork(network).restUrl
      }/ibc/core/channel/v1beta1/channels/${receivingChannelId}/ports/${receivingPort}/packet_receipts/${sequence}`,
    ).then((r) => r.json());
    return res.received;
  }

  async loadQueryClientByNetwork(network: Network) {
    const destChainConfig = await this.loadChainConfigByNetwork(network);
    const tendermintClient = await Tendermint34Client.connect(
      destChainConfig.rpcUrl,
    );
    const queryClient = QueryClient.withExtensions(
      tendermintClient,
      setupIbcExtension,
      setupBankExtension,
      setupAuthExtension,
    );

    return queryClient;
  }

  async logIBCNetworkMetadata(networks: Network[]) {
    const clientData: {
      chainId: string;
      ctx: {
        chainId: string;
        // ackCount: allAcks.acknowledgements.length,
        connection: string;
        channelId: string;
        counterpartyChannelId?: string;
      }[];
    }[] = [];
    for (let destinationNetwork of networks) {
      await this.keplrProvider.connect(
        getChainsService().get(destinationNetwork),
      );
      const queryClient = await this.loadQueryClientByNetwork(
        destinationNetwork,
      );
      const chainConfig = this.loadChainConfigByNetwork(destinationNetwork);
      const allChannels = await queryClient.ibc.channel.allChannels();
      const clients = await Promise.all(
        allChannels.channels.map(async (channel) => {
          const parsedClientState = await fetch(
            `${chainConfig.restUrl}/ibc/core/connection/v1beta1/connections/${channel.connectionHops[0]}/client_state`,
          ).then((r) => r.json());

          // console.log(parsedClientState);
          // const allAcks = await queryClient.ibc.channel.allPacketAcknowledgements(
          //   channel.portId,
          //   channel.channelId,
          // );

          return {
            chainId:
              parsedClientState.identified_client_state.client_state.chain_id,
            // ackCount: allAcks.acknowledgements.length,
            connection: channel.connectionHops[0],
            channelId: channel.channelId,
            counterpartyChannelId: channel.counterparty?.channelId,
          };
        }),
      );
      clientData.push({
        chainId: chainConfig.chainId,
        ctx: clients,
      });
    }
    console.log("\n\nNETWORK CONNECTIONS TABLE");
    clientData.forEach((d) => {});
    console.log("\n\n");
    // const allCxns = await Promise.all(
    //   (await queryClient.ibc.connection.allConnections()).connections.map(
    //     async (cxn) => {
    //       return {
    //         cxn,
    //       };
    //     },
    //   ),
    // );
    // console.log({ destinationNetwork, allChannels, allCxns, clients });
  }

  async transferIBCTokens(
    params: {
      sourceNetwork: Network;
      destinationNetwork: Network;
      assetAmountToTransfer: IAssetAmount;
    },
    // Load testing options
    {
      shouldBatchTransfers = false,
      maxMsgsPerBatch = 800,
      maxAmountPerMsg = `9223372036854775807`,
      gasPerBatch = undefined,
      loadOfflineSigner = async (
        chainId: string,
      ): Promise<OfflineSigner | undefined> => {
        const keplr = await getKeplrProvider();
        const signer = await keplr?.getOfflineSigner(chainId);
        const keplrKey = await keplr?.getKey(chainId);
        // @ts-ignore
        if (keplrKey["isNanoLedger"] && signer) {
          // @ts-ignore
          signer.signDirect = undefined;
          // @ts-ignore
          signer.signAmino = (...args) => keplr?.signAmino(chainId, ...args);
        }
        return signer;
      },
    } = {},
  ): Promise<BroadcastTxResponse[]> {
    const sourceChain = this.loadChainConfigByNetwork(params.sourceNetwork);
    const destinationChain = this.loadChainConfigByNetwork(
      params.destinationNetwork,
    );
    console.log({ sourceChain, destinationChain });
    const keplr = await getKeplrProvider();
    await keplr?.experimentalSuggestChain(sourceChain.keplrChainInfo);
    await keplr?.experimentalSuggestChain(destinationChain.keplrChainInfo);
    await keplr?.enable(destinationChain.chainId);
    const recievingSigner = await loadOfflineSigner(destinationChain.chainId);

    if (!recievingSigner) throw new Error("No recieving signer");
    const [toAccount] = (await recievingSigner?.getAccounts()) || [];
    if (!toAccount) throw new Error("No account found for recieving signer");

    await keplr?.enable(sourceChain.chainId);
    const sendingSigner = await loadOfflineSigner(sourceChain.chainId);
    if (!sendingSigner) throw new Error("No sending signer");

    console.log(
      `${params.sourceNetwork}/${await sendingSigner
        .getAccounts()
        .then(([a]) => a.address)} -> ${
        params.destinationNetwork
      }/${await recievingSigner.getAccounts().then(([a]) => a.address)}`,
    );
    const [fromAccount] = (await sendingSigner?.getAccounts()) || [];
    if (!fromAccount) {
      throw new Error("No account found for sending signer");
    }

    const receivingStargateCient = await SigningStargateClient?.connectWithSigner(
      destinationChain.rpcUrl,
      recievingSigner,
      {
        gasLimits: {
          send: 80000,
          transfer: 250000,
          delegate: 250000,
          undelegate: 250000,
          redelegate: 250000,
          // The gas multiplication per rewards.
          withdrawRewards: 140000,
          govVote: 250000,
        },
      },
    );

    const sendingStargateClient = await SigningStargateClient?.connectWithSigner(
      sourceChain.rpcUrl,
      sendingSigner,
      {
        gasLimits: {
          send: 80000,
          transfer: 250000,
          delegate: 250000,
          undelegate: 250000,
          redelegate: 250000,
          // The gas multiplication per rewards.
          withdrawRewards: 140000,
          govVote: 250000,
        },
      },
    );

    const { channelId } = await this.tokenRegistry.loadConnectionByNetworks({
      sourceNetwork: params.sourceNetwork,
      destinationNetwork: params.destinationNetwork,
    });

    const symbol = params.assetAmountToTransfer.asset.symbol;

    // initially set low
    const timeoutInMinutes = 5;
    const timeoutTimestampInSeconds = Math.floor(
      new Date().getTime() / 1000 + 60 * timeoutInMinutes,
    );
    const timeoutTimestampNanoseconds = timeoutTimestampInSeconds
      ? Long.fromNumber(timeoutTimestampInSeconds).multiply(1_000_000_000)
      : undefined;
    const currentHeight = await receivingStargateCient.getHeight();
    const timeoutHeight = Long.fromNumber(currentHeight + 150);
    const registry = await this.tokenRegistry.load();
    const transferTokenEntry = registry.find((t) => t.baseDenom === symbol);

    if (!transferTokenEntry) {
      throw new Error("Invalid transfer symbol not in whitelist: " + symbol);
    }

    let transferDenom: string;

    if (sourceChain.nativeAssetSymbol === transferTokenEntry.baseDenom) {
      // transfering FROM token entry's token's chain: use baseDenom
      transferDenom = transferTokenEntry.baseDenom;
    } else {
      // transfering this entry's token elsewhere: use ibc hash
      transferDenom =
        params.assetAmountToTransfer.asset.ibcDenom || transferTokenEntry.denom;
    }

    const transferMsg: MsgTransferEncodeObject = {
      typeUrl: "/ibc.applications.transfer.v1.MsgTransfer",
      value: IbcTransferV1Tx.MsgTransfer.fromPartial({
        sourcePort: "transfer",
        sourceChannel: channelId,
        sender: fromAccount.address,
        receiver: toAccount.address,
        token: {
          denom: transferDenom,
          // denom: symbol,
          amount: params.assetAmountToTransfer.toBigInt().toString(),
        },
        timeoutHeight: {
          // revisionHeight: timeoutHeight,
          // revisionHeight: timeoutHeight,
        },
        timeoutTimestamp: timeoutTimestampNanoseconds, // timeoutTimestampNanoseconds,
      }),
    };

    let encodeMsgs: MsgTransferEncodeObject[] = [transferMsg];
    while (
      shouldBatchTransfers &&
      JSBI.greaterThanOrEqual(
        JSBI.BigInt(encodeMsgs[0].value.token?.amount || "0"),
        // Max uint64
        JSBI.BigInt(maxAmountPerMsg),
      )
    ) {
      encodeMsgs = [...encodeMsgs, ...encodeMsgs].map((tfMsg) => {
        return {
          ...tfMsg,
          value: {
            ...tfMsg.value,
            token: {
              denom: tfMsg.value.token?.denom as string,
              amount: JSBI.divide(
                JSBI.BigInt(tfMsg.value.token?.amount || "0"),
                JSBI.BigInt("2"),
              ).toString(),
            },
          },
        };
      });
    }

    const transferMsgs: Array<MsgTransferEncodeObject | MsgSendEncodeObject> = [
      ...encodeMsgs,
    ];

    const feeAmount = getChainsService()
      .get(params.destinationNetwork)
      .calculateTransferFeeToChain(params.assetAmountToTransfer);
    if (feeAmount?.amount.greaterThan("0")) {
      const feeEntry = registry.find(
        (item) => item.baseDenom === feeAmount.asset.symbol,
      );
      if (!feeEntry) {
        throw new Error(
          "Failed to find whiteliste entry for fee symbol " +
            feeAmount.asset.symbol,
        );
      }
      const sendFeeMsg: MsgSendEncodeObject = {
        typeUrl: "/cosmos.bank.v1beta1.MsgSend",
        value: {
          fromAddress: fromAccount.address,
          toAddress: IBC_EXPORT_FEE_ADDRESS,
          amount: [
            {
              denom: feeEntry.denom,
              amount: feeAmount.toBigInt().toString(),
            },
          ],
        },
      };
      transferMsgs.unshift(sendFeeMsg);
    }

    const batches = [];
    while (transferMsgs.length) {
      batches.push(transferMsgs.splice(0, maxMsgsPerBatch));
    }
    console.log({ batches });
    const responses: BroadcastTxResponse[] = [];
    for (let batch of batches) {
      console.log("transfer msg count", batch.length);

      try {
        // const gasPerMessage = 39437;
        // const gasPerMessage = 39437;
        // console.log(JSON.(batch));
        let externalGasPrices: any = {};
        try {
          externalGasPrices = await fetch(
            "https://gas-meter.vercel.app/gas-v1.json",
          )
            .then((r) => r.json())
            .catch((e) => {});
        } catch (e) {}
        const brdcstTxRes = await sendingStargateClient.signAndBroadcast(
          fromAccount.address,
          batch,
          {
            ...sendingStargateClient.fees.transfer,
            amount: [
              {
                denom: sourceChain.keplrChainInfo.feeCurrencies[0].coinDenom.toLowerCase(),
                amount:
                  sourceChain.keplrChainInfo.gasPriceStep?.average.toString() ||
                  "",
              },
            ],
            ...(externalGasPrices &&
            externalGasPrices[sourceChain.chainId || ""]
              ? {
                  gas: externalGasPrices[sourceChain.chainId || ""],
                }
              : {}),
            // gas: gasPerBatch || calculateGasForIBCTransfer(batch.length),
          },
        );
        console.log({ brdcstTxRes });
        responses.push(brdcstTxRes);
      } catch (e) {
        console.error(e);
        responses.push({
          code:
            +e.message.split("code ").pop().split(" ")[0] || 100000000000000000,
          log: e.message,
          rawLog: e.message,
          transactionHash: "invalidtx",
          hash: new Uint8Array(),
          events: [],
          height: -1,
        } as BroadcastTxResponse);
      }
    }
    console.log({ responses });
    return responses;
  }
}

export default function createIBCService(context: IBCServiceContext) {
  return IBCService.create(context);
}

const createAminoFromEncodeObject = (encodeObject: EncodeObject): AminoMsg => {
  const { typeUrl, value } = encodeObject;
  const [_namespace, cosmosModule, _version, messageType] = typeUrl.split(".");
  const convertToSnakeCaseDeep = (obj: any): any => {
    if (typeof obj !== "object") {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => convertToSnakeCaseDeep(item));
    }
    const newObj: any = {};
    for (let prop in obj) {
      newObj[inflection.underscore(prop)] = convertToSnakeCaseDeep(obj[prop]);
    }
    return newObj;
  };
  const aminoValue = convertToSnakeCaseDeep(value);
  return {
    type: `${cosmosModule}/${messageType}`,
    value: aminoValue,
  };
};

interface NativeSigning {
  sendingSigner: OfflineAminoSigner;
  signWMeta: (
    signerAddress: string,
    messages: readonly EncodeObject[],
    fee: StdFee,
    memo: string,
    signerData: SignerData,
  ) => Promise<Uint8Array>;
}

interface NativeSigning {
  sendingSigner: OfflineAminoSigner;
  signWMeta: (
    signerAddress: string,
    messages: readonly EncodeObject[],
    fee: StdFee,
    memo: string,
    signerData: SignerData,
  ) => Promise<Uint8Array>;
}
class NativeSigningClient
  extends SigningStargateClient
  implements NativeSigning {
  sendingSigner: OfflineAminoSigner;
  constructor(...args: any[]) {
    super(args[0], args[1], args[2]);
    this.sendingSigner = args[1];
  }
  async signWMeta(
    signerAddress: string,
    messages: readonly EncodeObject[],
    fee: StdFee,
    memo = "",
    signerData: SignerData,
  ): Promise<Uint8Array> {
    const { chainId, accountNumber, sequence } = signerData;
    const accountFromSigner = (await this.sendingSigner.getAccounts()).find(
      (account) => account.address === signerAddress,
    );
    if (!accountFromSigner) {
      throw new Error("Failed to retrieve account from signer");
    }
    const aminoTypes = new AminoTypes({
      additions: {},
      prefix: undefined,
    });
    const pubkey = encodePubkey(
      encodeSecp256k1Pubkey(accountFromSigner.pubkey),
    );
    const signMode = SignMode.SIGN_MODE_LEGACY_AMINO_JSON;
    const msgs = messages.map((msg) => aminoTypes.toAmino(msg));

    const signDoc = makeSignDocAmino(
      msgs,
      fee,
      chainId,
      memo,
      accountNumber,
      sequence,
    );
    const { signature, signed } = await this.sendingSigner.signAmino(
      signerAddress,
      signDoc,
    );
    const signedTxBody = {
      messages: signed.msgs.map((msg) => aminoTypes.fromAmino(msg)),
      memo: signed.memo,
    };

    const signedTxBodyEncodeObject: TxBodyEncodeObject = {
      typeUrl: "/cosmos.tx.v1beta1.TxBody",
      value: signedTxBody,
    };
    const signedTxBodyBytes = this.registry.encode(signedTxBodyEncodeObject);
    const signedGasLimit = Int53.fromString(signed.fee.gas).toNumber();
    const signedSequence = Int53.fromString(signed.sequence).toNumber();
    const signedAuthInfoBytes = makeAuthInfoBytes(
      [pubkey],
      signed.fee.amount,
      signedGasLimit,
      signedSequence,
      signMode,
    );
    const txRaw: TxRaw = TxRaw.fromPartial({
      bodyBytes: signedTxBodyBytes,
      authInfoBytes: signedAuthInfoBytes,
      signatures: [fromBase64(signature.signature)],
    });

    const enc = TxRaw.encode(txRaw);
    const dec = TxRaw.encode(TxRaw.decode(enc.finish())).finish();
    return dec;
  }
}
