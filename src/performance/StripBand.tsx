import styled from "styled-components";
import type { Comparison } from "./reference";
import { stripFraction } from "./strip";

/**
 * The comparison band: where an ordinary Kleros court sits on either plot — the court's time to
 * appeal on the matrix page, and one agent juror's reveal latency on its own view.
 *
 * One component rather than a pair of copies because both plots draw it and both label it, and
 * this repo has learned twice over that two renderings of one thing fork in the *prose* long
 * before they fork in the model — `cell.ts`, `row-flags.ts` and `panel.ts` were all lifted out
 * for that reason. A band that said five days on one page and something else on the other would
 * be the same defect on the one element whose whole purpose is a comparison.
 *
 * It is decoration behind the marks and never in front of them, and it lives inside a plot that
 * is `aria-hidden` — so nothing here is the carrier of a fact. Which court it was read from,
 * over how many disputes and what period, was said in the provenance footer until the maintainer
 * removed it on 2026-09-24; the method page describes the band in general terms.
 *
 * **Since ticket 23 it is a reading, so it has states, and none of them is a band at a
 * default.** The boundary is court 29's median time to ruling, read on every load. While that
 * read is out, and wherever it failed or came back short, there is no band. The label moves to
 * the plot's right-hand edge and says which of those it is. A band drawn at the old five days
 * "until the reading lands" would put a boundary nothing measured on the chart whose subject is
 * that comparison, in the same violet as the one that was measured.
 *
 * **The label sits to the left of the boundary, right-aligned against it.** At four or five days
 * the band is the last seventh or eighth of the axis, and a label placed inside it — which is what the canvas
 * does at an hour, with 27% to lay out in — has about 12% and would wrap to a column of single
 * words or overflow the plot. Hard against the band's own edge it reads as annotating the line,
 * and it has the whole left of the axis to lay out in.
 *
 * **And below the median's own value, which is why it is not at the top of the plot.** Both
 * plots print their median as text at `top: 0`, and both were drawn at 1440 where that text
 * ends around a third of the way across and this label's ink begins at three quarters. At 390pt
 * the agent juror plot is 300px wide: the median value ran 95→211 and this label's first line
 * 103→256, so the two overprinted — one figure that is measured, illegible under one that is
 * not. Dropping the label a line clears it on both plots at every width, and the marks cannot
 * reach it, because they stack up from the axis and the tallest stack the live court has is
 * less than half the plot's height.
 *
 * jsdom lays nothing out, so none of the above is a test: it was measured in a browser at both
 * widths, and the collision it fixes was invisible to 862 passing tests.
 */

const Band = styled.div<{ $from: number }>`
  position: absolute;
  left: ${({ $from }) => `${$from * 100}%`};
  right: 0;
  top: 0;
  bottom: 26px;
  background-color: ${({ theme }) => theme.washViolet};
  border-left: 1px solid ${({ theme }) => theme.orbitLine};
  border-radius: 0 ${({ theme }) => theme.radiusChip} ${({ theme }) => theme.radiusChip} 0;
`;

const Label = styled.div<{ $from: number }>`
  position: absolute;
  left: 0;
  right: calc(${({ $from }) => `${(1 - $from) * 100}%`} + 8px);
  top: 22px;
  text-align: right;
  font: ${({ theme }) => theme.typeMonoSm};
  /* The second line names a duration, and the shorthand above resets the tabular figures
     base.css puts on the body. */
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMonoTight};
  color: ${({ theme }) => theme.textBody};
`;

const Quiet = styled.span`
  color: ${({ theme }) => theme.textMeta};
`;

/** What the label's second line says where there is no band to draw. */
function absenceOf(comparison: Exclude<Comparison, { state: "measured" }>): string {
  if (comparison.state === "pending") return "being read";
  // A court that has ruled no single-round dispute is a fact about that court, not a failure,
  // and must not be worded as one.
  if (comparison.reading?.state === "unmeasured") return "nothing to compare";
  return "not read";
}

export function StripBand({
  comparison,
  min,
}: {
  comparison: Comparison;
  /** The axis origin in seconds, as `stripFraction` takes it. */
  min?: number;
}) {
  if (comparison.state !== "measured") {
    return (
      <Label $from={1}>
        Other Kleros courts
        <br />
        <Quiet>{absenceOf(comparison)}</Quiet>
      </Label>
    );
  }

  const { reading } = comparison;
  const from = stripFraction(reading.medianSeconds, min);

  return (
    <>
      <Band $from={from} />
      <Label $from={from}>
        {/* One line, ruled 2026-09-24: the court and its median are on /method#comparison. */}
        Other Kleros courts
      </Label>
    </>
  );
}
