import { QueryClient } from "@tanstack/react-query";

/**
 * One client for the app. Defaults are left alone and tuning happens per hook, which is
 * the convention in the Kleros court frontend — the data here varies too much between
 * sources to share one staleness policy: ENS records are near-immutable, an open
 * dispute's period is not.
 */
export const queryClient = new QueryClient();
