import { type ReferenceReading, referenceCourtName } from "../performance/reference";
import { type FailedRead, failureOf, SOURCES } from "../read-failure";

/**
 * What a page says in words about the comparison band (ticket 23).
 *
 * One module for both pages that draw the band. The matrix view and the agent juror view put it
 * on plots sharing one axis, and two copies of these sentences would fork in the prose long
 * before the figure did. `strip.ts` used to hold the band's words for the same reason, while the
 * band was a constant. It is a reading now, so the words are built from the reading.
 *
 * What remains is the banner's line: what is missing from the band. The footer sentence saying
 * what the band rests on went with the provenance footer (maintainer's ruling, 2026-09-24).
 */

/**
 * The banner's line about the comparison read, or `null` where there is nothing to say.
 *
 * Read from the core subgraph, so a caller ranks this with its other core-subgraph failures and
 * states one of them, not one each. It ranks last. What it costs is where the band begins, and
 * no other figure.
 *
 * The short read is its own branch, and it has no error to come from. A subgraph that answers
 * HTTP 200 with part of a court raises nothing, and the only evidence is the count. So the count
 * is what the banner prints.
 */
export function comparisonFailureOf(
  reading: ReferenceReading | null,
  error: Error | null,
): FailedRead | null {
  if (error !== null) {
    return failureOf(
      error,
      SOURCES.core,
      reading?.state === "measured"
        ? "The comparison court's disputes could not be re-read, so the comparison band on the latency plots comes from an earlier read."
        : "The comparison court's disputes could not be read, so no comparison band is drawn on the latency plots.",
    );
  }

  if (reading?.state === "short") {
    return {
      source: SOURCES.core,
      status: "Short read",
      what: `The disputes of ${referenceCourtName(reading.court)} came back short, ${reading.returned} of the ${reading.expected} it holds, so no comparison band is drawn on the latency plots: a median over part of a court is not that court's.`,
    };
  }

  return null;
}
