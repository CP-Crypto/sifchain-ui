import { defineComponent } from "vue";
import { AppCookies, NetworkEnv, networkEnvsByIndex } from "@sifchain/sdk";

// This is for internal testing & development only.
// Once we release the ability to switch environments
// as a feature we can refactor this to look nice.
export default defineComponent({
  setup() {
    const appCookies = AppCookies();
    let env = appCookies.getEnv();

    if (typeof env === "undefined") {
      return () => null;
    }

    let networkEnv: NetworkEnv = env as NetworkEnv;
    if (env && networkEnvsByIndex[+env]) {
      networkEnv = networkEnvsByIndex[+env];
    }

    const styles = {
      mainnet: "bg-green-500 text-white",
      devnet: "bg-cyan-500 text-white",
      testnet: "bg-yellow-500 text-white",
      localnet: "bg-orange-500 text-white",
      panel: "bg-red-500 text-white",
    };

    const classesByNetworkEnv = {
      [NetworkEnv.MAINNET]: styles.mainnet,
      [NetworkEnv.LOCALNET]: styles.localnet,
      [NetworkEnv.TESTNET]: styles.testnet,
      [NetworkEnv.TESTNET_042_IBC]: styles.testnet,
      [NetworkEnv.DEVNET]: styles.devnet,
      [NetworkEnv.DEVNET_042]: styles.devnet,
      [NetworkEnv.TEMPNET_PMTP]: styles.devnet,
    };

    const classNames = classesByNetworkEnv[networkEnv];

    let selectedEnv = Object.entries(NetworkEnv).find(
      (e) => e[1] === networkEnv,
    )?.[0];

    return () => (
      <div class="fixed bottom-0 left-64 h-8 w-36 overflow-hidden rounded-t">
        {networkEnv && classNames ? (
          <div class={["p-1 text-center font-semibold", classNames]}>
            {Object.entries(NetworkEnv).find((e) => e[1] === networkEnv)?.[0]}
          </div>
        ) : null}
        <select
          value={networkEnv}
          class={["absolute left-0 top-0 h-full w-full opacity-0"]}
          onInput={(e) => {
            appCookies.setEnv(
              (e.target as HTMLInputElement).value as NetworkEnv,
            );
            window.location.reload();
          }}
        >
          {Object.entries(NetworkEnv).map(([key, value]) => (
            <option
              class={[classNames, "p-2"]}
              selected={key === networkEnv.toLowerCase()}
              key={key}
              value={value}
            >
              {key}
            </option>
          ))}
        </select>
      </div>
    );
  },
});
