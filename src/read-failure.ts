/**
 * What a failed read knows about itself.
 *
 * Ticket 13's banner has to name "the failing source, the status it returned". Both of those
 * exist at the moment of the throw and nowhere else afterwards: by the time react-query hands
 * an `Error` to a view, the only thing left is an English sentence. Parsing that sentence back
 * apart would make the banner's content a property of the prose, so a reworded message would
 * silently blank the status line with nothing to catch it.
 *
 * Kept at the root rather than under `disputes/` or `performance/` because both halves throw
 * it, and neither owns the other. It deliberately holds no React and no styling: what a
 * failure *is* belongs here, and what it looks like belongs in `chrome/Failure.tsx`.
 */

/**
 * One endpoint this dashboard reads.
 *
 * Two names because they are read in two places. `label` is how a message refers to it —
 * "The core subgraph rejected the query" — and `name` is what the banner prints under
 * SOURCE, which has to be the thing a reader could go and check: a Goldsky deployment name
 * or a host, not a description of it.
 */
export type Source = {
  name: string;
  label: string;
};

/**
 * Every source a figure on this dashboard can rest on — except the one that cannot be a
 * constant.
 *
 * **Arbitrum is deliberately absent.** Its name is `arbitrumSource()` in
 * `performance/arbitrum.ts`, derived from the URL in use, because every endpoint here is
 * overridable through a `VITE_` variable and a literal is then a claim about configuration
 * that the code has no way to keep true. The literal that used to sit here named
 * `arb1.arbitrum.io` on a deploy reading Alchemy, and reported an outage at an endpoint that
 * had never been contacted. It is removed rather than left beside the accessor so that the
 * wrong one cannot be reached for: this module is the first place anyone composing a failure
 * looks.
 *
 * The three that remain are falsifiable in exactly the same way, and are still literals
 * because nothing has overridden them yet — not because they are safe. The derivation is not
 * uniform, which is why it lives beside each URL rather than here: a subgraph's name is the
 * Goldsky deployment inside its *path*, where an RPC's is its host, and only the module that
 * owns the URL knows which part of it a reader could go and check.
 */
export const SOURCES = {
  core: { name: "kleros-v2-coreneo", label: "The core subgraph" },
  templates: { name: "kleros-v2-drt", label: "The template subgraph" },
  mainnet: { name: "ethereum-rpc.publicnode.com", label: "The Ethereum endpoint" },
} as const satisfies Record<string, Source>;

/**
 * A read that failed, with the two things the banner has to say about it.
 *
 * `status` is nullable and often null, which is the honest answer rather than a gap: a DNS
 * failure, a CORS rejection and an aborted request all reach the catch with no status at all,
 * and inventing one — "HTTP 0", "Unknown error" — would put a figure on a public page that
 * nothing measured. The banner words the absence instead.
 */
export class ReadFailure extends Error {
  readonly source: Source;
  readonly status: string | null;

  constructor(message: string, { source, status }: { source: Source; status: string | null }) {
    super(message);
    this.name = "ReadFailure";
    this.source = source;
    this.status = status;
  }
}

/** A failed read as a view states it: which source, what it answered, and what it cost. */
export type FailedRead = {
  source: Source;
  /** What the endpoint answered, or `null` where it never answered at all. */
  status: string | null;
  /** What the reader loses by this failure, in one sentence. */
  what: string;
};

/**
 * An error as a banner can state it.
 *
 * `source` is taken from the call site rather than only from the error because not every
 * failure here is ours to shape: viem raises its own errors from inside the ENS resolver and
 * the log scan, and `UnknownRpcError` carries no source and no status (see `CLAUDE.md` on what
 * arb1 returns under a rate limit). The call site always knows which endpoint it asked, so
 * that is where the name comes from; a `ReadFailure` only ever refines it.
 */
export function failureOf(error: Error | null, source: Source, what: string): FailedRead | null {
  if (error === null) return null;
  if (error instanceof ReadFailure) {
    return { source: error.source, status: error.status, what };
  }
  return { source, status: null, what };
}

/**
 * How long ago a moment was, as the banner prints it.
 *
 * Pure, and takes `now` rather than reading the clock, so the one place a clock is read is the
 * component that renders it — the same discipline the seam keeps, for the same reason: a
 * function that consults `Date.now()` cannot be tested against a fixed answer.
 *
 * Seconds are kept alongside minutes up to the hour because this figure exists to tell a reader
 * whether what they are looking at is a minute old or an afternoon old, and the first hour is
 * where that distinction actually decides whether to quote the page.
 */
export function formatAgo(at: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m ago`;

  return `${Math.floor(hours / 24)}d ${hours % 24}h ago`;
}
