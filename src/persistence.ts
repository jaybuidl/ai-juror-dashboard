import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import type { Persister } from "@tanstack/react-query-persist-client";
import { type Dispute, type RawDispute, toDisputes } from "./disputes/disputes";
import { browserStorage } from "./storage";

/**
 * What survives a reload, and what makes it safe to.
 *
 * The court's finalised record is the great majority of what this page shows and none of it can
 * change: the great majority of the court's disputes are ruled, and a ruled dispute's draws,
 * votes, latencies
 * and commitments are fixed for ever. Reading all of it again on every load is a round trip to
 * Goldsky and a scan of Arbitrum for an answer that was already known, which is what makes
 * returning to the dashboard slow.
 *
 * What is persisted is the **payloads**, not the figures. That distinction is the whole safety
 * argument: `buildCourtPerformance` is pure and runs on every render, so a restored cache is
 * re-derived by whatever the code says a latency is *today*. A cache of computed medians would
 * have to be invalidated whenever anyone changed the arithmetic; this one does not.
 *
 * That argument has exactly one hole, and `PERSISTED_MODEL_VERSION` below is the plug.
 */

/**
 * Bump this whenever the shape of a **raw payload** changes — a renamed subgraph field, a
 * changed enum, a new selection the model reads.
 *
 * Deliberately not the arithmetic, and that is enforced rather than asked for. `useDisputes`
 * stores `{ raw, disputes: toDisputes(raw) }`, so the modelled disputes are as persisted as
 * the payload they came from — and `toDisputes` is where `ruling.state` is decided, which is
 * the finalised predicate this whole ticket turns on. A restored cache would then serve
 * yesterday's definition of a ruling with today's code and nothing would say so, which is
 * exactly what the acceptance criterion forbids: *"a change to how a metric is derived does not
 * serve stale values computed by an older definition"*.
 *
 * `stripDerived` and `rederive` below close that: the derived half is dropped on the way out
 * and rebuilt on the way in by whatever `toDisputes` says today. What is left to version is the
 * raw shape, which changes when Goldsky's schema does and not when this repository changes its
 * mind. `persistence.test.ts` pins both halves.
 *
 * The date is when the raw shape last changed, not when the file was last touched.
 */
export const PERSISTED_MODEL_VERSION = "2026-08-25";

/** Namespaced, so nothing else this origin stores can collide with it. */
export const PERSISTED_CACHE_KEY = "kleros-ai-juror-dashboard:query-cache";

/**
 * The queries that survive a reload, named one at a time.
 *
 * An allowlist and not a filter, because the failure it prevents is silent and the default has
 * to be "no". The cache is written with `JSON.stringify`, and **not every value in this app
 * survives that round trip**: the `disputeTemplates` query holds a `Map`, which serialises to
 * `{}` and comes back as an object with no `get` on it. Nothing would throw at write time and
 * nothing would throw at read time either — `templateFor` would simply find no template, and
 * every row on the page would render untitled, which is exactly what a dispute that never had
 * a template looks like. Ticket 04 built a whole counted notice to keep those two apart.
 *
 * So titles are re-read on every load. That is one request against a keyless endpoint whose
 * answers are already an hour stale-time within a session, and it is the cheap half of what
 * this ticket is speeding up: the expensive halves are the draw list and the Arbitrum scan.
 *
 * The ENS identities are **not** persisted, and the reason is the second question to ask of any
 * candidate. `resolveAgentJurorIdentity` catches a mainnet failure and returns the checked-in
 * roster entry with `resolvedFromEns: false`, so a failed ENS read is a *successful* query — by
 * design, because the roster must render whether or not ENS answers. Persisted, with the hour of
 * staleness `useRoster` holds and a restored `dataUpdatedAt`, one failed load would be re-served
 * for an hour across reloads without a retry, and the page would go on saying ENS could not be
 * reached long after it could. That is a read that failed rendering as a fact, which is the
 * failure `docs/knowledge/react-query-and-persistence.md` names most often. It costs one mainnet read per load not to.
 *
 * So a query added by a later ticket is not persisted until it is named here, and there are two
 * questions to answer first:
 *
 * 1. Does its value survive a JSON round trip — no `Map`, no `Set`, no `bigint`, no `Date`?
 * 2. Does a *failed* read of it produce a successful query? If it has a fallback, it does.
 *
 * Ticket 08's parameter history reads from a chain, and a `bigint` anywhere in it would throw on
 * the way out rather than degrade quietly — the better failure, still not one to discover in
 * production. Ticket 10's rewards were expected to raise the same question and did not: they are
 * read from the subgraph, which serves every amount as a decimal **string**, and the `bigint`
 * only appears above the seam where nothing is stored. Answering the question is what showed
 * that; assuming the answer is what this list exists to prevent.
 */
const PERSISTED_QUERIES: readonly string[] = [
  "courtDisputes",
  "courtDraws",
  "commitCasts",
  // Ticket 09's `disputeDetail` is **not** here, and it answered for itself first. Its value
  // is a raw payload that survives JSON, and a failed read of it is a failed query rather than
  // a successful one — so it passes both of the questions above. It is left out on a third
  // ground the others did not raise: **size**. It carries the justification prose, which is
  // 124 KB across the court today and grows with every draw, and it is keyed per dispute, so
  // persisting it would accumulate one entry per dispute a reader ever opened inside a cache
  // that is rewritten whole every five seconds while the court is live. The read is one round
  // trip against a keyless endpoint for one dispute; the cache is not the place for it.
  //
  // Added when ticket 08 met this list, which is the question that list exists to be asked.
  // `RawCourtParameters[]` is a raw payload of plain numbers — no Map, no bigint, no Date — and
  // `toRegimes`/`windowsFor` re-derive from it inside the pure seam on every render, so it is
  // the same bargain as the three above. It is also the read that most wants persisting: a
  // court is reconfigured roughly never, and without it a return visit renders the whole
  // restored matrix under a footnote saying the parameter history is not in hand, which then
  // retracts itself a moment later. A caveat that comes and goes teaches a reader to ignore
  // caveats — see `docs/knowledge/prose-and-caveats.md`.
  "courtParameters",
  // Ticket 10's payouts, admitted on the same two questions. The value is the raw
  // `TokenAndETHShift` payload — decimal strings, no Map, no bigint, no Date — and it is parsed
  // to `bigint` inside the pure seam on every render, so a restored cache is re-summed by
  // today's code exactly as the draws are. A failed read is a failed query: `fetchCourtRewards`
  // has no fallback and throws a `ReadFailure`, so there is no successful-but-empty result to
  // re-serve for an hour, which is what kept the ENS identities out.
  //
  // It is also a read that wants persisting, for the reason `courtParameters` does. These two
  // figures are sums, so the state before they land is not a dash on a median but every column
  // header reading "—" under a footer saying the payouts are still being read. Without this,
  // every return visit renders that and then retracts it a moment later — a caveat that comes
  // and goes teaches a reader to ignore caveats.
  "courtRewards",
];

/** Whether one query's result is written to storage. Keyed on the head of the query key. */
export function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  const [name] = queryKey;
  return typeof name === "string" && PERSISTED_QUERIES.includes(name);
}

/** What `useDisputes` stores: the payload, and the model built from it in the same breath. */
type DisputesData = { raw: readonly RawDispute[]; disputes: readonly Dispute[] };

function holdsDisputes(data: unknown): data is DisputesData {
  return typeof data === "object" && data !== null && Array.isArray((data as DisputesData).raw);
}

/**
 * Drop everything derived on the way to storage.
 *
 * The only derived value in the persisted set is `useDisputes`'s modelled list, and it is
 * recomputable from the `raw` beside it in microseconds. Storing it would be storing an
 * *opinion* — what a ruling is, what a round's timeline means — next to the fact it came from,
 * and only the fact is safe to keep.
 */
export function stripDerived(data: unknown): unknown {
  return holdsDisputes(data) ? { raw: data.raw } : data;
}

/**
 * Rebuild it on the way back, with today's code.
 *
 * This is what makes the criterion true rather than merely intended: change what `rulingOf`
 * counts as a ruling and every restored dispute is re-read under the new rule on the next load,
 * with no version to remember to bump.
 *
 * A payload this cannot model is dropped rather than half-restored — `toDisputes` throws on
 * exactly the values that would otherwise become a confident wrong figure, and a cache written
 * by an older raw shape is precisely where that can happen. Returning `undefined` leaves the
 * query with no data, which is a cold read: slower, and correct.
 */
export function rederive(data: unknown): unknown {
  if (!holdsDisputes(data)) return data;

  try {
    return { raw: data.raw, disputes: toDisputes(data.raw) };
  } catch {
    return undefined;
  }
}

/**
 * How long a restored cache may be shown before it is discarded rather than displayed.
 *
 * A day, and it is not a staleness policy — every query here refetches on mount, and the live
 * ones every five seconds. It is the backstop for a tab reopened after a week: the provenance
 * footer prints when the court was read, so old data is *labelled* rather than hidden, but past
 * some point restoring it buys nothing and a cold read is the honest answer.
 */
export const PERSISTED_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Where the cache is written, or nothing.
 *
 * `null` for any browser that will not have it — a blocked cookie policy, a full quota, a
 * context with no `localStorage` at all. The dashboard then behaves exactly as it did before
 * any of this existed: it reads the court on every load. Persistence is an optimisation here
 * and never a source, and there is no state that exists only in the cache.
 */
export function dashboardPersister(): Persister | null {
  const storage = browserStorage();
  if (storage === null) return null;

  return createSyncStoragePersister({
    storage,
    key: PERSISTED_CACHE_KEY,
    // The court is re-read every five seconds while a dispute is live. Serialising the whole
    // cache that often would be a synchronous JSON pass on the main thread on every tick.
    throttleTime: 5_000,
  });
}
