import styled from "styled-components";
import { formatMinutes } from "../performance/latency";
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
 * The drawn tile reads against the roster's own length so that an agent juror the court has not
 * drawn is legible here and not only as an empty column in the matrix.
 */

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
}: {
  figure: React.ReactNode;
  label: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Tile>
      <Figure $accent={accent}>{figure}</Figure>
      <Label>{label}</Label>
    </Tile>
  );
}

export function StatTiles({
  totals,
  partial = false,
  narrow: isNarrow = false,
}: {
  totals: CourtTotals | null;
  /** True when a read behind these figures failed. See `Partial`. */
  partial?: boolean;
  /**
   * Below the breakpoint: three tiles, not four, and the median time to appeal leads.
   *
   * `Mobile.dc.html:47-51` is the authority, and the canvas wins. A phone reader gets one
   * glance, so the page's headline measure goes first, in the accent ink the desktop gives it,
   * and the size of the record follows it — draws before disputes, because the draw is the unit
   * (`CONTEXT.md`).
   *
   * The tile that gives way is the count of the roster that has been drawn. It is a fact about
   * the roster rather than about the record, and `/agent-jurors` carries it in more detail than
   * a tile can. The draws tile also drops the vote count from its label: the draw is the unit
   * either way, and the vote count is context the desktop has the width for.
   */
  narrow?: boolean;
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

  const summary = totals.timeToAppeal.summary;

  // One definition of each tile, ordered rather than rewritten, so the phone and the desktop
  // cannot come to print different figures under one label. Every one of them is read off the
  // model: a literal here would still say 13 disputes a year from now, on a public page.
  const median = (
    <StatTile
      key="median"
      accent
      figure={summary === null ? "—" : formatMinutes(summary.median)}
      label={
        summary === null ? "Median to appeal · no dispute has reached appeal" : "Median to appeal"
      }
    />
  );
  const draws = <StatTile key="draws" figure={totals.draws} label="Draws" />;
  const disputes = <StatTile key="disputes" figure={totals.disputes} label="Disputes read" />;
  const drawn = (
    <StatTile
      key="drawn"
      figure={
        <>
          {totals.agentJurorsDrawn}
          <Against>/{totals.agentJurors}</Against>
        </>
      }
      label="Agent jurors drawn"
    />
  );

  return (
    <Row>
      {isNarrow ? [median, draws, disputes] : [disputes, draws, drawn, median]}
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
