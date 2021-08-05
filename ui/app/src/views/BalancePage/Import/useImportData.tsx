import { RouteLocationRaw, useRoute, useRouter } from "vue-router";
import { reactive, ref, computed, Ref, watch, onMounted } from "vue";
import { proxyRefs, toRefs, ToRefs } from "@vue/reactivity";
import { TokenIcon } from "@/components/TokenIcon";
import { TokenListItem, useTokenList, useToken } from "@/hooks/useToken";
import { toBaseUnits } from "@sifchain/sdk/src/utils";
import {
  formatAssetAmount,
  getPeggedSymbol,
} from "@/componentsLegacy/shared/utils";
import { useCore } from "@/hooks/useCore";
import { Network, IAssetAmount, AssetAmount } from "@sifchain/sdk";
import { PegEvent } from "@sifchain/sdk/src/usecases/peg/peg";
import { Button } from "@/components/Button/Button";
import { FormDetailsType } from "@/components/Form";

export type ImportParams = {
  amount: string;
  network: Network;
  displaySymbol: string;
};

export type ImportStep = "select" | "confirm" | "processing";

export type ImportData = {
  importParams: ToRefs<ImportParams>;
  networksRef: Ref<Network[]>;
  importTokenRef: Ref<TokenListItem | undefined>;
  pickableTokensRef: Ref<TokenListItem[]>;
  importAmountRef: Ref<IAssetAmount | null>;
  pegEventRef: Ref<PegEvent | undefined>;
  runImport: () => void;
  exitImport: () => void;
  detailsRef: Ref<FormDetailsType>;
};

export function getImportLocation(
  step: ImportStep,
  params: Partial<ImportParams>,
): RouteLocationRaw {
  return {
    name: "Import",
    params: { step, symbol: params.displaySymbol },
    query: {
      network: params.network,
      amount: params.amount,
    },
  } as RouteLocationRaw;
}

export const useImportData = (): ImportData => {
  const { usecases } = useCore();
  const route = useRoute();
  const router = useRouter();
  const importParams = reactive<ImportParams>({
    displaySymbol: String(route.params.symbol || ""),
    amount: String(route.query.amount || ""),
    network: Network.ETHEREUM,
  });
  const importParamsRefs = toRefs(importParams);
  watch(
    () => importParams,
    () => {
      router.replace(
        getImportLocation(route.params.step as ImportStep, {
          ...proxyRefs(importParamsRefs),
        }),
      );
    },
    { deep: true },
  );

  const exitImport = () => {
    router.replace({ name: "Balances" });
  };

  const networksRef = ref(
    Object.values(Network).filter((network) => network !== Network.SIFCHAIN),
  );

  const tokenListRef = useTokenList({
    networks: networksRef,
  });

  const importTokenRef = computed<TokenListItem | undefined>(() => {
    if (!tokenListRef.value?.length) return undefined; // Wait for token list to load

    if (!importParams.displaySymbol) {
      return tokenListRef.value[0];
    }

    const token =
      tokenListRef.value.find((t) => {
        return (
          importParams.displaySymbol.toLowerCase() ===
            t.asset.displaySymbol.toLowerCase() &&
          importParams.network === t.asset.network
        );
      }) || tokenListRef.value[0];

    importParams.displaySymbol = token.asset.displaySymbol;
    return token;
  });

  onMounted(() => {
    importParams.network = route.params.network
      ? importParams.network
      : importTokenRef.value?.asset.homeNetwork || importParams.network;
  });

  const importAmountRef = computed(() => {
    if (!importTokenRef.value?.asset) return null;
    return AssetAmount(
      importTokenRef.value?.asset || "rowan",
      toBaseUnits(
        importParams.amount?.trim() || "0.0",
        importTokenRef.value?.asset,
      ),
    );
  });

  const sifchainTokenRef = useToken({
    network: ref(Network.SIFCHAIN),
    symbol: computed(() =>
      importParams.network === Network.ETHEREUM
        ? getPeggedSymbol(
            importParams.displaySymbol?.toLowerCase() || "",
          ).toLowerCase()
        : importParams.displaySymbol?.toLowerCase() || "",
    ),
  });

  const pickableTokensRef = computed(() => {
    return tokenListRef.value.filter((token) => {
      return token.asset.network === importParams.network;
    });
  });

  const pegEventRef = ref<PegEvent>();
  async function runImport() {
    if (!importAmountRef.value) throw new Error("Please provide an amount");
    pegEventRef.value = undefined;

    for await (const event of usecases.peg.peg(importAmountRef.value)) {
      pegEventRef.value = event;
    }
  }

  const detailsRef = computed<[any, any][]>(() => [
    [
      "Current Sifchain Balance",
      <span class="flex items-center font-mono">
        {sifchainTokenRef.value ? (
          <>
            {formatAssetAmount(sifchainTokenRef.value.amount)}{" "}
            {(
              sifchainTokenRef.value.asset.displaySymbol ||
              sifchainTokenRef.value.asset.symbol
            ).toUpperCase()}
            <TokenIcon
              size={18}
              assetValue={sifchainTokenRef.value.asset}
              class="ml-[4px]"
            />
          </>
        ) : (
          "0"
        )}
      </span>,
    ],
    [
      "Direction",
      <span class="capitalize">
        {importParams.network}
        <span
          class="mx-[6px] inline-block"
          style={{ transform: "translateY(-1px)" }}
        >
          ⟶
        </span>
        Sifchain
      </span>,
    ],
    [
      "Import Amount",
      <span class="flex items-center font-mono">
        {importParams.amount} {importParams.displaySymbol?.toUpperCase()}
        <TokenIcon
          size={18}
          assetValue={importTokenRef.value?.asset}
          class="ml-[4px]"
        />
      </span>,
    ],
    [
      <>
        New Sifchain Balance
        <Button.InlineHelp>Estimated amount</Button.InlineHelp>
      </>,
      <span class="flex items-center font-mono">
        {sifchainTokenRef.value ? (
          <>
            {(
              parseFloat(formatAssetAmount(sifchainTokenRef.value.amount)) +
              parseFloat(importParams.amount || "0")
            ).toFixed(
              Math.max(
                formatAssetAmount(sifchainTokenRef.value.amount).split(".")[1]
                  ?.length ||
                  importParams.amount.split(".")[1]?.length ||
                  0,
              ),
            )}{" "}
            {(
              sifchainTokenRef.value.asset.displaySymbol ||
              sifchainTokenRef.value.asset.symbol
            ).toUpperCase()}{" "}
            <TokenIcon
              size={18}
              assetValue={sifchainTokenRef.value.asset}
              class="ml-[4px]"
            />
          </>
        ) : (
          "0"
        )}
      </span>,
    ],
  ]);

  return {
    importParams: toRefs(importParams),
    networksRef,
    pickableTokensRef,
    importTokenRef,
    importAmountRef,
    runImport,
    pegEventRef,
    exitImport: exitImport,
    detailsRef,
  };
};
