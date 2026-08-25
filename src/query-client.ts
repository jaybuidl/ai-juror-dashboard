import { QueryClient } from "@tanstack/react-query";
import { PERSISTED_MAX_AGE_MS } from "./persistence";

/**
 * One client for the app. Defaults are left alone and tuning happens per hook, which is
 * the convention in the Kleros court frontend — the data here varies too much between
 * sources to share one staleness policy: ENS records are near-immutable, an open
 * dispute's period is not.
 *
 * `gcTime` is the one exception, and it is not a staleness policy: it is how long a query the
 * app is no longer rendering stays in memory, and the persisted cache is written *from* memory.
 * At the five-minute default a query dropped from the cache is dropped from the next write to
 * storage too, so a shorter `gcTime` than the persister's `maxAge` quietly evicts the very
 * record the cache exists to keep. TanStack's own requirement is that it be at least as long.
 */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { gcTime: PERSISTED_MAX_AGE_MS } },
});
