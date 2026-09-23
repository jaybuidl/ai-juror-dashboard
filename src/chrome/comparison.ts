import { formatElapsedSeconds } from "../performance/latency";
import {
  type Comparison,
  type ReferenceReading,
  referenceCourtName,
} from "../performance/reference";
import { type FailedRead, failureOf, SOURCES } from "../read-failure";
import { formatDateUtc } from "./provenance";

/**
 * What a page says in words about the comparison band (ticket 23).
 *
 * One module for both pages that draw the band. The matrix view and the agent juror view put it
 * on plots sharing one axis, and two copies of these sentences would fork in the prose long
 * before the figure did. `strip.ts` used to hold the band's words for the same reason, while the
 * band was a constant. It is a reading now, so the words are built from the reading.
 *
 * Two channels, kept apart as everywhere else: the footer says what the band rests on, and the
 * banner says what is missing from it. A failed or short read is the banner's alone. The footer
 * says nothing about it, because a reader who meets one failure in two voices counts two.
 */

/** Which plot a sentence is about, as that page calls it. */
export type ComparisonPlot = "latency strip" | "latency plot";

/**
 * The footer's sentence about the band, or `null` where the banner owns the story.
 *
 * Callers gate this on the plot being on the screen. It names the band's provenance, and a
 * sentence about a band the reader cannot see sends them looking for it.
 */
export function comparisonCaveatOf(comparison: Comparison, plot: ComparisonPlot): string | null {
  if (comparison.state === "pending") {
    return `The comparison band on the ${plot} is still being read, so none is drawn yet.`;
  }

  if (comparison.state === "missing") {
    const reading = comparison.reading;
    // A whole read of a court that has ruled nothing single-round is a fact about that court,
    // not a failure. The banner is silent about it, so the footer is the one voice it has.
    if (reading?.state === "unmeasured") {
      return `No comparison band is drawn on the ${plot}: ${referenceCourtName(reading.court)} has ruled no single-round dispute to measure one from.`;
    }
    return null;
  }

  const { reading } = comparison;
  const { appealed, undecided } = reading.excluded;
  const from = formatDateUtc(reading.firstCreatedAt * 1000);
  const to = formatDateUtc(reading.lastCreatedAt * 1000);

  // "Left out" is said even when nothing was, and says so. That appealed disputes *would have
  // been* excluded is the half of the claim that makes the comparison like-for-like. That none
  // exist yet is the half a reader could otherwise only take on trust.
  const appeals =
    appealed === 0
      ? "Appealed disputes are left out, to keep the comparison single-round against single-round; that court has had none."
      : `Its ${appealed} appealed ${appealed === 1 ? "dispute is" : "disputes are"} left out, to keep the comparison single-round against single-round.`;
  const pending =
    undecided === 0
      ? ""
      : ` ${undecided} ${undecided === 1 ? "dispute" : "disputes"} not yet ruled ${undecided === 1 ? "is" : "are"} left out too.`;

  return `The comparison band on the ${plot} is read from another Kleros court, not drawn by hand. It begins at ${formatElapsedSeconds(reading.medianSeconds)}, the median time from creation to final ruling over the ${reading.count} single-round ${reading.count === 1 ? "dispute" : "disputes"} ${referenceCourtName(reading.court)} has ruled, created between ${from} and ${to}. ${appeals}${pending}`;
}

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
