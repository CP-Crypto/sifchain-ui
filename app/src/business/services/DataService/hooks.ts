import { useAsyncDataCached } from "@/hooks/useAsyncDataCached";
import { computed, Ref } from "vue";
import { useQuery } from "vue-query";

import DataService, { LPUserReward } from "./DataService";

const dataService = new DataService();

export function useTokenStats() {
  return useAsyncDataCached("tokenStats", dataService.getTokenStats);
}

export function useRewardsPrograms() {
  return useQuery("rewardsPrograms", dataService.getRewardsPrograms);
}

/**
 * get LPPD distribution for a given account
 * @param account {string} account address
 */
export function useLPUserRewards(account: Ref<string>) {
  return useQuery(
    `lpUserRewards-${account.value}`,
    async () => {
      const { received } = await dataService.getLPUserRewards(account.value);

      if (!received) {
        return {} as Record<string, LPUserReward>;
      }

      return received.reduce(
        (acc, x) => ({
          ...acc,
          [x.poolDenom]: x,
        }),
        {} as Record<string, LPUserReward>,
      );
    },
    {
      enabled: computed(() => account.value !== ""),
    },
  );
}
