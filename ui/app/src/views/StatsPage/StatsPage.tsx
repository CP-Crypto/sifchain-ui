import { defineComponent, computed, Ref } from "vue";
import { Asset, IAsset } from "@sifchain/sdk";
import PageCard from "@/components/PageCard";
import { TokenIcon } from "@/components/TokenIcon";
import { StatsPageState, useStatsPageData } from "./useStatsPageData";
import AssetIcon from "@/componentsLegacy/utilities/AssetIcon";

function prettyNumber(n: number, precision: number = 2) {
  return n
    .toFixed(precision)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default defineComponent({
  name: "StatsPage",
  props: {},
  setup() {
    const { res, statsRef, state } = useStatsPageData({
      sortBy: "asset",
      sortDirection: "asc",
    } as StatsPageState);

    return () => {
      if (res.isLoading.value) {
        return (
          <div class="absolute left-0 top-[180px] w-full flex justify-center">
            <img
              class="w-[64px] h-[64px]"
              src="/images/siflogo.png"
              style={{
                boxShadow: "0 0 0 0 rgba(0, 0, 0, 1)",
                animation: "animation-pulse 1s infinite both",
              }}
            />
          </div>
        );
      }

      const columns: Array<{
        name: string;
        sortBy: StatsPageState["sortBy"];
        class?: string;
      }> = [
        {
          name: "Token",
          sortBy: "asset",
          class: "min-w-[120px] text-left",
        },
        {
          name: "Price of Token",
          sortBy: "price",
          class: "min-w-[90px] text-right",
        },
        {
          name: "Arbitrage Opportunity",
          sortBy: "arbitrage",
          class: "min-w-[120px] text-right",
        },
        {
          name: "Pool Depth (USD)",
          sortBy: "depth",
          class: "min-w-[120px] text-right",
        },
        {
          name: "Total Volume (24hr)",
          sortBy: "volume",
          class: "min-w-[110px] text-right",
        },
        {
          name: "Pool APY",
          sortBy: "poolApy",
          class: "min-w-[80px] text-right",
        },
      ];

      return (
        <PageCard
          heading="Pool Stats"
          iconName="navigation/pool-stats"
          class="!w-[940px] !min-w-[940px] !max-w-[940px]"
        >
          <table class="w-full">
            <thead>
              <tr class="height-[40px] align-text-bottom text-xxs font-semibold">
                {columns.map((column) => (
                  <td class={[column.class]}>
                    <div
                      class="inline-flex items-center cursor-pointer opacity-50 hover:opacity-60"
                      onClick={() => {
                        if (state.sortBy === column.sortBy) {
                          state.sortDirection =
                            state.sortDirection === "asc" ? "desc" : "asc";
                        } else {
                          state.sortDirection = "asc";
                        }
                        state.sortBy = column.sortBy;
                      }}
                    >
                      {column.name}
                      {state.sortBy === column.sortBy && (
                        <AssetIcon
                          icon="interactive/arrow-down"
                          class="transition-all w-[12px] h-[12px]"
                          style={{
                            transform:
                              state.sortDirection === "asc"
                                ? "rotate(0deg)"
                                : "rotate(180deg)",
                          }}
                        />
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            </thead>
            <tbody class="w-full text-sm font-medium">
              {statsRef.value.map((item) => {
                return (
                  <tr
                    key={item.asset.symbol}
                    class="align-middle h-8 border-dashed border-b border-white border-opacity-40 last:border-transparent"
                  >
                    <td class="align-middle">
                      <div class="flex items-center">
                        <TokenIcon
                          assetValue={item.asset}
                          size={22}
                          class="mr-[10px]"
                        />
                        {(
                          item.asset.displaySymbol || item.asset.symbol
                        ).toUpperCase()}
                      </div>
                    </td>
                    <td class="align-middle text-right text-mono">
                      ${prettyNumber(item.price)}
                    </td>
                    <td
                      class={[
                        "align-middle text-mono text-right",
                        item.arbitrage >= 0
                          ? `text-connected-base`
                          : `text-danger-base`,
                      ]}
                    >
                      {prettyNumber(item.arbitrage)}%
                    </td>
                    <td class="align-middle text-right text-mono">
                      ${prettyNumber(item.depth)}
                    </td>
                    <td class="align-middle text-right text-mono">
                      ${prettyNumber(item.volume)}
                    </td>
                    <td class="align-middle text-right text-mono">
                      {prettyNumber(item.poolApy)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </PageCard>
      );
    };
  },
});
