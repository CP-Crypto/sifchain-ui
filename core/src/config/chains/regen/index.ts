import { NetworkEnv } from "../../getEnv";
import { NetEnvChainConfigLookup } from "../NetEnvChainConfigLookup";
import { REGEN_MAINNET } from "./regen-mainnet";

export default <NetEnvChainConfigLookup>{
  [NetworkEnv.LOCALNET]: REGEN_MAINNET,
  [NetworkEnv.DEVNET]: REGEN_MAINNET,
  [NetworkEnv.TESTNET]: REGEN_MAINNET,
  [NetworkEnv.MAINNET]: REGEN_MAINNET,
  [NetworkEnv.TEMPNET]: REGEN_MAINNET,
  [NetworkEnv.STAGING]: REGEN_MAINNET,
};
