import { NetworkEnv } from "../../getEnv";
import { AKASH_TESTNET } from "./akash-testnet";
import { NetEnvChainConfigLookup } from "../NetEnvChainConfigLookup";
import { AKASH_MAINNET } from "./akash-mainnet";

export default <NetEnvChainConfigLookup>{
  [NetworkEnv.LOCALNET]: AKASH_TESTNET,
  [NetworkEnv.DEVNET]: AKASH_TESTNET,
  [NetworkEnv.TESTNET]: AKASH_TESTNET,
  [NetworkEnv.MAINNET]: AKASH_MAINNET,
  [NetworkEnv.TEMPNET]: AKASH_TESTNET,
  [NetworkEnv.STAGING]: AKASH_TESTNET,
};
