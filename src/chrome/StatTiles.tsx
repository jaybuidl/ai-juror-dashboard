import { Link } from "react-router";
import styled from "styled-components";
import { formatLatencySeconds } from "../performance/latency";
import type { CourtTotals } from "../performance/totals";
import { narrow } from "../styles/breakpoints";

/**
 * The four stat tiles, built against `canvas/Main.dc.html:57-76`.
 *
 * Every figure comes from `performance.totals` — the model's own aggregate — and none is
 * written into the markup. Disputes arrive continually, so a total that was true the day this
 * was written must not survive as a literal: a `13` in this file would still say 13 a year
 * from now, on a public page, with nothing to contradict it.
 *
 * Draws and vote IDs are two numbers because they are two things: the draw is the unit, and one
 * draw may hold several vote IDs (61 votes were 44 draws across the first thirteen disputes).
 * The drawn tile reads against the roster's six so that an agent juror never drawn is legible
 * here and not only as an empty column in the matrix.
 */

/**
 * A caveat a figure carries.
 *
 * Ticket 06 sets the terms for the marginals and this follows them: the mark sits on the
 * figure, the reason sits under it in words, and the full account is one click away. Nothing
 * on today's four tiles takes one — the only caveat the model carries is the lone panel, which
 * qualifies coherence, and none of these four figures is a coherence figure. The mechanism is
 * here because ticket 06's marginals and ticket 08's window are both figures that will.
 */
export type TileCaveat = {
  /** The marker, matching the one the matrix footnote uses for the same caveat. */
  mark: string;
  /** Why the figure is qualified, in one line, beneath it. */
  reason: string;
  /** Where the full account is. */
  href: string;
};

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space10};

  ${narrow} {
    gap: ${({ theme }) => theme.space8};
  }
`;

const Tile = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space4};
`;

const Figure = styled.div<{ $accent?: boolean }>`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space2};
  font: ${({ theme }) => theme.typeMetric};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: 0.01em;
  color: ${({ theme, $accent }) => ($accent === true ? theme.accent : theme.textHeading)};

  ${narrow} {
    font: ${({ theme }) => theme.typeMetricSm};
    font-feature-settings: ${({ theme }) => theme.featureMono};
  }
`;

/** The "/6" of "5/6": the same figure, in the ink of something not yet reached. */
const Against = styled.span`
  color: ${({ theme }) => theme.textPending};
`;

const Label = styled.div`
  font: ${({ theme }) => theme.typeMonoSm};
  /* Not decorative text: the label carries "76 vote IDs" and "56 draws". Without this the
     figure above it is tabular and the count beneath it is not. */
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textMeta};
`;

const Mark = styled.sup`
  font: ${({ theme }) => theme.typeMonoSm};
  color: ${({ theme }) => theme.stateWork};
`;

const Reason = styled.p`
  max-width: 34ch;
  font: ${({ theme }) => theme.typeBodySm};
  font-feature-settings: ${({ theme }) => theme.featureNumeric};
  color: ${({ theme }) => theme.textMeta};

  a {
    color: ${({ theme }) => theme.accent};
  }
`;

/**
 * What an aggregate says about itself when a read that feeds it failed.
 *
 * Ticket 13: a figure computed while a read has failed is labelled as partial everywhere it
 * appears, and what could not be read counts as unknown rather than as zero. A total cannot say
 * "unknown", so it stays the count that was actually taken and carries this — which is the only
 * thing that stops four confident numerals reading as the whole court.
 */
const Partial = styled.p`
  flex-basis: 100%;
  max-width: 68ch;
  font: ${({ theme }) => theme.typeBodySm};
  font-feature-settings: ${({ theme }) => theme.featureNumeric};
  color: ${({ theme }) => theme.stateFail};
`;

const Nothing = styled.p`
  max-width: 68ch;
  font: ${({ theme }) => theme.typeBodySm};
  color: ${({ theme }) => theme.textMeta};
`;

function StatTile({
  figure,
  label,
  accent,
  caveat,
}: {
  figure: React.ReactNode;
  label: React.ReactNode;
  accent?: boolean;
  caveat?: TileCaveat;
}) {
  return (
    <Tile>
      <Figure $accent={accent}>
        {figure}
        {caveat && <Mark aria-hidden="true">{caveat.mark}</Mark>}
      </Figure>
      <Label>{label}</Label>
      {caveat && (
        <Reason>
          {caveat.reason} <Link to={caveat.href}>The full account</Link>.
        </Reason>
      )}
    </Tile>
  );
}

export function StatTiles({
  totals,
  partial = false,
}: {
  totals: CourtTotals | null;
  /** True when a read behind these figures failed. See `Partial`. */
  partial?: boolean;
}) {
  if (totals === null) {
    // No zeros. A `0` here would be a claim about the court that nobody measured, and four of
    // them under a hero would read as a court that has held nothing.
    return (
      <Nothing>
        Nothing has been measured on this load, so there are no totals to show — not a finding that
        the court has held no disputes.
      </Nothing>
    );
  }

  const latency = totals.revealLatency;

  return (
    <Row>
      <StatTile figure={totals.disputes} label="Disputes read" />
      <StatTile
        figure={totals.draws}
        label={`Draws · ${totals.votes} vote ${totals.votes === 1 ? "ID" : "IDs"}`}
      />
      <StatTile
        figure={
          <>
            {totals.agentJurorsDrawn}
            <Against>/{totals.agentJurors}</Against>
          </>
        }
        label="Agent jurors drawn"
      />
      <StatTile
        accent
        figure={latency === null ? "—" : formatLatencySeconds(latency.median)}
        label={
          latency === null
            ? "Median reveal · no draw has revealed"
            : `Median reveal · ${latency.seconds.length} draws`
        }
      />
      {(partial || totals.unreadDisputes.length > 0) && (
        <Partial role="status">
          Partial. {figuresMissing(totals)} These are counts of what was read, and what was not read
          counts as unknown — never as zero.
        </Partial>
      )}
    </Row>
  );
}

/** Which half of the shortfall to name: the rows that are known missing, or the read at large. */
function figuresMissing(totals: CourtTotals): string {
  const unread = totals.unreadDisputes.length;
  if (unread === 0) {
    return "A source behind these figures could not be read, so every one of them is short by an amount nobody measured.";
  }
  return `${unread === 1 ? "Dispute" : "Disputes"} ${totals.unreadDisputes.join(", ")} ${unread === 1 ? "is" : "are"} not counted in any figure above: ${unread === 1 ? "its draws were" : "their draws were"} never read.`;
}
