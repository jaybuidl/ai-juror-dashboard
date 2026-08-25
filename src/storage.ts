/**
 * `localStorage`, where there is one that works.
 *
 * Shared because two things now want it — the query cache in `persistence.ts` and the block
 * timestamps in `performance/block-times.ts` — and the check is not the one-liner it looks
 * like. A browser set to block site data does not report `undefined`; it throws from the
 * property getter, and again from every method. `typeof localStorage === "undefined"` alone
 * passes there and then fails on first use, inside whatever was unlucky enough to touch it.
 *
 * So the probe is a real read. Anything that throws means no storage, and every caller here
 * degrades to keeping its state for the life of the page — which costs a re-read and never a
 * wrong figure, because nothing in this dashboard exists only in a cache.
 */
export function browserStorage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    localStorage.getItem("kleros-ai-juror-dashboard:probe");
    return localStorage;
  } catch {
    return null;
  }
}
