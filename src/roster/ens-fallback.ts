import type { DegradedRead } from "../chrome/failures";
import { SOURCES } from "../read-failure";
import type { RosterView } from "./useRoster";

/**
 * The one documented exception to "every failed read is loud".
 *
 * Written once and read by all three views that show a nickname or an avatar — the matrix's
 * column headers, the agent-juror index, and whatever ticket 11 adds — because the sentence
 * that matters is the last one, and three copies of it would be three chances for one of them
 * to stop saying it. Ethereum mainnet carries ENS names and avatars and nothing else, so a
 * failure here costs a label and never a figure, and the panel has to say so outright: a reader
 * who sees any caveat at all on a page of measurements will assume the measurements are affected
 * unless told otherwise.
 *
 * `isResolving` as well as `isResolvedFromEns`, always. The second is false while the mainnet
 * lookup is still out *and* after it has failed, so a caveat keyed on it alone announces a
 * failure that has not happened for the length of every cold load and then retracts it — and a
 * caveat that comes and goes teaches a reader to ignore caveats. This bit three call sites on
 * ticket 15; having one function is what stops it biting a fourth.
 */
export function ensFallbackOf(roster: RosterView): DegradedRead | null {
  if (roster.isResolving || roster.isResolvedFromEns) return null;

  return {
    source: SOURCES.mainnet,
    heading: "Names are falling back to the roster.",
    what: "ENS could not be reached, so every nickname here is the one held in this repository and avatars show initials. No measurement on this dashboard depends on ENS, so nothing on this page is partial — only the portraits are missing.",
  };
}
