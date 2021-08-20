import {
  SigningStargateClient,
  StargateClient,
  MsgTransferEncodeObject,
  BroadcastTxResponse,
  IndexedTx,
} from "@cosmjs/stargate";
import { OfflineSigner } from "@cosmjs/proto-signing";

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
import { TokenRegistry } from "./tokenRegistry";
import { KeplrWalletProvider } from "../WalletService";

export interface IBCServiceContext {
  // applicationNetworkEnvironment: NetworkEnv;
  sifApiUrl: string;
  assets: Asset[];
  chainConfigsByNetwork: NetworkChainConfigLookup;
}

export class IBCService {
  networkDenomLookup: Record<Network, Record<string, string>> = {
    ethereum: {},
    cosmoshub: {},
    sifchain: {},
    iris: {},
    akash: {},
    sentinel: {},
  };
  symbolLookup: Record<string, string> = {};

  tokenRegistry = TokenRegistry(this.context);

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

  async logIBCNetworkMetadata(destinationNetwork: Network) {
    await this.keplrProvider.connect(
      getChainsService().get(destinationNetwork),
    );
    const queryClient = await this.loadQueryClientByNetwork(destinationNetwork);

    const allChannels = await queryClient.ibc.channel.allChannels();
    const clients = await Promise.all(
      allChannels.channels.map(async (channel) => {
        const parsedClientState = await fetch(
          `${
            this.loadChainConfigByNetwork(destinationNetwork).restUrl
          }/ibc/core/connection/v1beta1/connections/${
            channel.connectionHops[0]
          }/client_state`,
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
    console.log(destinationNetwork.toUpperCase());
    console.table(
      clients.filter((c) => {
        return true;
      }),
    );
    const allCxns = await Promise.all(
      (await queryClient.ibc.connection.allConnections()).connections.map(
        async (cxn) => {
          return {
            cxn,
          };
        },
      ),
    );
    console.log({ destinationNetwork, allChannels, allCxns, clients });
  }

  // NOTE(ajoslin):
  // We can have for example 1inch from testnet and 1inch from devnet both in our cosmoshub testnet wallet.
  // This makes sure both don't show up.
  async isValidEnvironmentChannel(network: Network, channelId: string) {
    const tokenRegistry = await this.tokenRegistry.load();
    return tokenRegistry.some(
      (item) =>
        item.src_channel === channelId || item.dest_channel === channelId,
    );
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
      loadOfflineSigner = (
        chainId: string,
      ): Promise<OfflineSigner | undefined> | undefined =>
        getKeplrProvider().then((keplr) => keplr?.getOfflineSigner(chainId)),
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
    const transferMsg: MsgTransferEncodeObject = {
      typeUrl: "/ibc.applications.transfer.v1.MsgTransfer",
      value: IbcTransferV1Tx.MsgTransfer.fromPartial({
        sourcePort: "transfer",
        sourceChannel: channelId,
        sender: fromAccount.address,
        receiver: toAccount.address,
        token: {
          denom:
            this.networkDenomLookup[sourceChain.network as Network][symbol] ||
            symbol,
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
    let transferMsgs: MsgTransferEncodeObject[] = [transferMsg];
    while (
      shouldBatchTransfers &&
      JSBI.greaterThanOrEqual(
        JSBI.BigInt(transferMsgs[0].value.token?.amount || "0"),
        // Max uint64
        JSBI.BigInt(maxAmountPerMsg),
      )
    ) {
      transferMsgs = [...transferMsgs, ...transferMsgs].map((tfMsg) => {
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
            // gas: gasPerBatch || calculateGasForIBCTransfer(batch.length),
          },
        );
        console.log({ brdcstTxRes });
        responses.push(brdcstTxRes);
      } catch (e) {
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
