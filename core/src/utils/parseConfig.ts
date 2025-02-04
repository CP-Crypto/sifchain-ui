import { Network, NetworkChainConfigLookup, IAsset, Asset } from "../entities";
import { getMetamaskProvider } from "../clients/wallets/ethereum/getMetamaskProvider";

type BaseAssetConfig = {
  name: string;
  symbol: string;
  displaySymbol: string;
  decimals: number;
  label?: string;
  imageUrl?: string;
  network: Network;
  homeNetwork: Network;
};

type TokenConfig = BaseAssetConfig & {
  address: string;
};

type CoinConfig = BaseAssetConfig & {};

export type AssetConfig = CoinConfig | TokenConfig;

function parseAsset(a: AssetConfig): IAsset {
  return Asset({
    ...a,
    displaySymbol: a.displaySymbol || a.symbol,
  });
}

export type KeplrChainConfig = {
  rest: string;
  rpc: string;
  chainId: string;
  chainName: string;
  stakeCurrency: {
    coinDenom: string;
    coinMinimalDenom: string;
    coinDecimals: number;
  };
  bip44: {
    coinType: number;
  };
  bech32Config: {
    bech32PrefixAccAddr: string;
    bech32PrefixAccPub: string;
    bech32PrefixValAddr: string;
    bech32PrefixValPub: string;
    bech32PrefixConsAddr: string;
    bech32PrefixConsPub: string;
  };
  currencies: {
    coinDenom: string;
    coinMinimalDenom: string;
    coinDecimals: number;
  }[];
  feeCurrencies: {
    coinDenom: string;
    coinMinimalDenom: string;
    coinDecimals: number;
  }[];
  coinType: number;
  gasPriceStep: {
    low: number;
    average: number;
    high: number;
  };
};

export type CoreConfig = {
  sifAddrPrefix: string;
  sifApiUrl: string;
  sifRpcUrl: string;
  vanirUrl: string;
  sifChainId: string;
  blockExplorerUrl: string;
  web3Provider: "metamask" | string;
  nativeAsset: string; // symbol
  bridgebankContractAddress: string;
  keplrChainConfig: KeplrChainConfig;
};

export function parseAssets(configAssets: AssetConfig[]): IAsset[] {
  return configAssets.map(parseAsset);
}

export function parseConfig(
  config: CoreConfig,
  assets: IAsset[],
  chainConfigsByNetwork: NetworkChainConfigLookup,
  peggyCompatibleCosmosBaseDenoms: Set<string>,
) {
  const nativeAsset = assets.find((a) => a.symbol === config.nativeAsset);

  if (!nativeAsset)
    throw new Error(
      "No nativeAsset defined for chain config:" + JSON.stringify(config),
    );

  const bridgetokenContractAddress = assets.find(
    (token) => token.symbol === "erowan",
  )?.address!;

  const sifAssets = assets
    .filter((asset) => asset.network === "sifchain")
    .map((sifAsset) => {
      return {
        coinDenom: sifAsset.symbol,
        coinDecimals: sifAsset.decimals,
        coinMinimalDenom: sifAsset.symbol,
      };
    });

  return {
    peggyCompatibleCosmosBaseDenoms,
    chains: [],
    chainConfigsByNetwork: chainConfigsByNetwork,
    sifAddrPrefix: config.sifAddrPrefix,
    sifApiUrl: config.sifApiUrl,
    sifRpcUrl: config.sifRpcUrl,
    sifChainId: config.sifChainId,
    blockExplorerUrl: config.blockExplorerUrl,
    getWeb3Provider:
      config.web3Provider === "metamask"
        ? getMetamaskProvider
        : async () => config.web3Provider,
    assets,
    nativeAsset,
    bridgebankContractAddress: config.bridgebankContractAddress,
    bridgetokenContractAddress,
    vanirUrl: config.vanirUrl,
    keplrChainConfig: {
      ...config.keplrChainConfig,
      rest: config.sifApiUrl,
      rpc: config.sifRpcUrl,
      chainId: config.sifChainId,
      currencies: sifAssets,
    },
  };
}
