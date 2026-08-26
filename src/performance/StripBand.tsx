import styled from "styled-components";
import { ORDINARY_COURT_FROM_SECONDS, ORDINARY_COURT_LABEL, stripFraction } from "./strip";

/**
 * The comparison band: where an ordinary Kleros court sits on either latency plot.
 *
 * One component rather than a pair of copies because both plots draw it and both label it, and
 * this repo has learned twice over that two renderings of one thing fork in the *prose* long
 * before they fork in the model — `cell.ts`, `row-flags.ts` and `panel.ts` were all lifted out
 * for that reason. A band that said five days on one page and something else on the other would
 * be the same defect on the one element whose whole purpose is a comparison.
 *
 * It is decoration behind the marks and never in front of them, and it lives inside a plot that
 * is `aria-hidden` — so nothing here is the carrier of a fact. What it means, and that it is
 * illustrative rather than read, is said in words in each page's provenance footer.
 *
 * **The label sits to the left of the boundary, right-aligned against it.** At five days the
 * band is the last eighth of the axis, and a label placed inside it — which is what the canvas
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

export function StripBand() {
  const from = stripFraction(ORDINARY_COURT_FROM_SECONDS);

  return (
    <>
      <Band $from={from} />
      <Label $from={from}>
        Ordinary Kleros court
        <br />
        {/* A minimum, and one round. Court 34 is single-round throughout, so the comparison is
            like-for-like; that an appeal makes it longer still is said in the footer, where a
            reader who cannot see this label meets it. */}
        <Quiet>{ORDINARY_COURT_LABEL} minimum, single round</Quiet>
      </Label>
    </>
  );
}
