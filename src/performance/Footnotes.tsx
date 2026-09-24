import styled from "styled-components";
import type { CourtPerformance } from "./performance";

/**
 * The sparsity note the phone's card list carries at its head, and `listOf`.
 *
 * This file held the caveat footnotes under the grid and the card list — the window (†), the
 * off-roster draws (§) and the lone panels (‡) — until the maintainer's ruling of 2026-09-24
 * removed them from the UI along with the marks that pointed at them; /method keeps the prose.
 */

const SparsityCard = styled.div`
  padding: ${({ theme }) => `${theme.space6} ${theme.space7}`};
  border: ${({ theme }) => theme.borderHairline};
  border-radius: ${({ theme }) => theme.radiusTile};
  background-color: ${({ theme }) => theme.surfaceInset};
`;

const SparsityLabel = styled.div`
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textMeta};
`;

const SparsityBody = styled.p`
  margin-top: ${({ theme }) => theme.space4};
  font: ${({ theme }) => theme.typeBodySm};
  /* It counts cells, disputes and columns, and the shorthand above resets the tabular figures
     base.css puts on the body. */
  font-feature-settings: ${({ theme }) => theme.featureNumeric};
  color: ${({ theme }) => theme.textBody};
`;

/** "155", "155 and 160", "155, 158 and 160". */
export function listOf(ids: readonly number[]): string {
  if (ids.length <= 1) return ids.join("");
  return `${ids.slice(0, -1).join(", ")} and ${ids[ids.length - 1]}`;
}

/**
 * Why so much of the record is empty, counted — and which of two things each blank means.
 *
 * The one caveat this dashboard cannot afford to lose on a phone, because it is the one that
 * prevents a *misreading* rather than answering a question: without it a blank position reads as
 * an agent juror that failed to act, which is the distinction ticket 05 exists to protect. It is
 * never behind a control. It renders as a card at the head of the phone's list; the matrix's copy
 * lived in the provenance footer and went with it (maintainer's ruling, 2026-09-24).
 *
 * **Two absences, separated by ticket 17, because one sentence was true of one of them.** A blank
 * in a dispute with a panel means this agent juror was not selected — random sparsity, the normal
 * state of this record. A blank in a dispute with *no* panel means no selection has happened yet:
 * the court draws when a dispute leaves its evidence period, and 167, 168 and 169 sat in theirs
 * on the day this was written, contributing 18 blanks this card was calling sparsity. Same words,
 * different fact, on a page that may be cited. Ticket 09 worded the same state on the per-dispute
 * view — "a panel is selected when the dispute leaves its evidence period" — and this is the same
 * fact at the grain of a record rather than of one dispute.
 *
 * A third absence is *not* here and is counted out of every figure above: a dispute whose draws
 * were never read is a gap in this dashboard rather than a fact about the court, and ticket 13
 * draws it as Unknown. The last sentence says so, so the count is never left unexplained.
 *
 * `noun` is the only thing that differs between the layouts. The matrix draws a position as a
 * table cell and the phone draws it as a slot on a card, and calling a slot a cell on a page with
 * no grid on it would be describing something the reader cannot see. Every figure comes from
 * `totals.sparsity`, so every layout counts the same court.
 */
export function SparsityNote({
  performance,
  noun,
}: {
  performance: CourtPerformance;
  noun: "cell" | "slot";
}) {
  const { sparsity, unreadDisputes } = performance.totals;
  const unread = unreadDisputes.length;
  const undrawn = sparsity.undrawnDisputes;

  return (
    <SparsityCard>
      <SparsityLabel>On the empty {noun}s</SparsityLabel>
      <SparsityBody>
        {/* Every figure here is about the disputes that were read, so with none of them read
            there is nothing to count and the card says that instead of counting to zero.
            "0 of the 0 cells here are blank" is not a smaller version of this claim; it is a
            different one, and it is false. */}
        {sparsity.disputes === 0 ? (
          `No dispute on this page had its draws read, so there is nothing here to count as blank or as drawn.`
        ) : (
          <>
            {sparsity.blank} of the {sparsity.positions} {noun}s here are blank
            {sparsity.emptyColumns > 0 &&
              `, and ${sparsity.emptyColumns === 1 ? "one agent juror is" : `${sparsity.emptyColumns} agent jurors are`} blank end to end`}
            . Agent jurors are drawn at random: sparsity is the normal state of this record, not
            missing data. A blank {noun} is drawn as nothing at all, so it can never be read as a
            failure to act.
            {/* The half of that claim that is false about a dispute the court has not drawn for.
                Counted rather than described, because "some of these are different" is the sort
                of caveat a reader cannot act on — and named by id, because the reader can then
                see which rows it is about. */}
            {undrawn.length > 0 && (
              <>
                {" "}
                {sparsity.undrawnPositions} of those blanks are a different absence:{" "}
                {undrawn.length === 1 ? "dispute" : "disputes"} {listOf(undrawn)}{" "}
                {undrawn.length === 1 ? "has" : "have"} no panel at all yet, so there the draw has
                not happened rather than an agent juror not having been selected. A panel is drawn
                when a dispute leaves its evidence period.
              </>
            )}
          </>
        )}
        {/* The sentence above is true of a dispute that was read and false of one that was not,
            where a blank would mean the draw has not been read rather than not happened. Those
            are drawn as Unknown instead and counted out of the figures above, and this says so
            rather than leaving the count unexplained. */}
        {unread > 0 &&
          ` ${unread === 1 ? "One further dispute is" : `A further ${unread} disputes are`} not counted here at all: ${unread === 1 ? "its draws were" : "their draws were"} never read, so ${unread === 1 ? "it is" : "they are"} marked Unknown rather than blank.`}
      </SparsityBody>
    </SparsityCard>
  );
}
