import { mutationOptions, queryOptions, type QueryClient } from "@tanstack/react-query";
import { ensureNativeApi } from "~/nativeApi";

export const serverQueryKeys = {
  all: ["server"] as const,
  config: () => ["server", "config"] as const,
};

export const serverMutationKeys = {
  recheckProviderHealth: () => ["server", "mutation", "recheckProviderHealth"] as const,
};

export function serverConfigQueryOptions() {
  return queryOptions({
    queryKey: serverQueryKeys.config(),
    queryFn: async () => {
      const api = ensureNativeApi();
      return api.server.getConfig();
    },
    staleTime: Infinity,
  });
}

export function serverRecheckProviderHealthMutationOptions(input: { queryClient: QueryClient }) {
  return mutationOptions({
    mutationKey: serverMutationKeys.recheckProviderHealth(),
    mutationFn: async (codexBinaryPath: string | undefined) => {
      const api = ensureNativeApi();
      return api.server.recheckProviderHealth({
        codexBinaryPath,
      });
    },
    onSuccess: async () => {
      // The server also broadcasts a push that triggers invalidation in
      // __root.tsx, but invalidate eagerly so the settings page reflects
      // changes without waiting for the push round-trip.
      await input.queryClient.invalidateQueries({ queryKey: serverQueryKeys.config() });
    },
  });
}
