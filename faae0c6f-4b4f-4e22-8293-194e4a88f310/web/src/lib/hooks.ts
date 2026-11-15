import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { api } from "./api";
import type { ReferenceOptions } from "@/types";

/** Thin wrapper so pages do not repeat query boilerplate. */
export function useApi<T>(
  key: unknown[],
  path: string,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">,
) {
  return useQuery<T>({
    queryKey: key,
    queryFn: () => api.get<T>(path),
    staleTime: 15_000,
    ...options,
  });
}

export function useReference() {
  return useApi<ReferenceOptions>(["reference"], "/reference/options", { staleTime: 5 * 60 * 1000 });
}
