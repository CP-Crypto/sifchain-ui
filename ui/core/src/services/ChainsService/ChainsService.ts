import {
  IAsset,
  JsonChainConfig,
  Chain,
  Network,
  setChainsService,
} from "../../entities";
import { SifchainChain, EthereumChain, CosmoshubChain } from "./chains";

export * from "./chains";

export type AnyChain = SifchainChain | EthereumChain | CosmoshubChain;

// This is private, only to make recordkeeping easier in this file so we don't
// have to keep up with a bunch of strings
enum ChainId {
  ethereum,
  cosmoshub,
  sifchain,
}

export type ChainsServiceContext = {
  assets: IAsset[];
  chains: JsonChainConfig[];
};

export class ChainsService {
  private _list: Chain[] = [];
  private _map: Map<ChainId, AnyChain> = new Map();

  addChain(chainId: ChainId, chain: AnyChain) {
    this._list.push(chain);
    this._map.set(chainId, chain);
  }

  findChainAssetMatch(match: Partial<IAsset>) {
    const matchKeys = Object.keys(match) as Array<keyof IAsset>;
    let chain, asset: IAsset;
    for (chain of this.getAll()) {
      for (asset of chain.assets) {
        const isMatch = matchKeys.every((key) => asset[key] === match[key]);
        if (isMatch) return { asset, chain };
      }
    }
  }
  findChainAssetMatchOrThrow(
    match: Partial<IAsset>,
  ): {
    chain: Chain;
    asset: IAsset;
  } {
    const result = this.findChainAssetMatch(match);
    if (!result) {
      throw new Error(
        `No matching chain + asset found for ${JSON.stringify(match)}`,
      );
    }
    return result;
  }

  constructor(p: { assets: IAsset[]; chains: JsonChainConfig[] }) {
    this.addChain(
      ChainId.sifchain,
      new SifchainChain({
        assets: p.assets,
        chainConfig: p.chains.find(
          (c) => c.id === Network.SIFCHAIN,
        ) as JsonChainConfig,
      }),
    );
    this.addChain(
      ChainId.ethereum,
      new EthereumChain({
        assets: p.assets,
        chainConfig: p.chains.find(
          (c) => c.id === Network.ETHEREUM,
        ) as JsonChainConfig,
      }),
    );
    this.addChain(
      ChainId.cosmoshub,
      new CosmoshubChain({
        assets: p.assets,
        chainConfig: p.chains.find(
          (c) => c.id === Network.COSMOSHUB,
        ) as JsonChainConfig,
      }),
    );

    setChainsService(this);
  }

  getAll() {
    return this._list;
  }
  getByNetwork(network: Network): AnyChain {
    switch (network) {
      case Network.SIFCHAIN:
        return this.sifchain;
      case Network.COSMOSHUB:
        return this.cosmoshub;
      case Network.ETHEREUM:
        return this.ethereum;
    }
  }

  get sifchain() {
    return this._map.get(ChainId.sifchain) as SifchainChain;
  }
  get cosmoshub() {
    return this._map.get(ChainId.cosmoshub) as CosmoshubChain;
  }
  get ethereum() {
    return this._map.get(ChainId.ethereum) as EthereumChain;
  }
}

export default function createChainsService(c: ChainsServiceContext) {
  return new ChainsService(c);
}