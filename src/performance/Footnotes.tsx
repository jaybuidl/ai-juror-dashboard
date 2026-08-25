import { Link } from "react-router";
import styled from "styled-components";
import { formatWindowSeconds } from "./latency";
import type { CourtPerformance } from "./performance";

/**
 * The caveats that hang off the record itself, in the one place both layouts read them from.
 *
 * Lifted out of `Matrix.tsx` by ticket 16, which put the same disputes on a phone as one card
 * each. Every one of these is a fact about the court rather than about the grid — which
 * disputes ran under superseded windows, which were decided by a panel of one, how much of the
 * record is empty and why — so all three travel with the record and none of them is the
 * matrix's property. Two copies would be two wordings of one caveat, and a page that may be
 * cited would then say slightly different things depending on the width it was read at.
 *
 * `CLAUDE.md` requires caveats to be visible in the UI rather than merely handled correctly in
 * code, which is the whole reason the phone gets these rather than a link to them.
 */

/*
 * How the three sit beside each other, declared here rather than on each of them.
 *
 * The flex basis belongs to the arrangement and not to the items: `SparsityNote` is rendered
 * on its own on the phone, inside a *column* flex container, and an item carrying
 * flex: 1 1 380px there takes 380px of height and grows to fill whatever is left. It rendered
 * as a short paragraph in a card three hundred pixels taller than itself, which no test in
 * jsdom could see and one look in a browser did.
 */
export const Footnotes = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space9};
  align-items: flex-start;

  > * {
    flex: 1 1 380px;
  }
`;

const Footnote = styled.p`
  display: flex;
  gap: ${({ theme }) => theme.space4};
  font: ${({ theme }) => theme.typeBodySm};
  /* It names dispute ids and two configured durations, and the shorthand above resets the
     tabular figures base.css puts on the body. */
  font-feature-settings: ${({ theme }) => theme.featureNumeric};
  color: ${({ theme }) => theme.textBody};

  a {
    color: ${({ theme }) => theme.accent};
  }
`;

const FootnoteMark = styled.span`
  flex: none;
  font: ${({ theme }) => theme.typeMonoSm};
  color: ${({ theme }) => theme.stateWork};
`;

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
  color: ${({ theme }) => theme.textBody};
`;

/** "155", "155 and 160", "155, 158 and 160". */
export function listOf(ids: readonly number[]): string {
  if (ids.length <= 1) return ids.join("");
  return `${ids.slice(0, -1).join(", ")} and ${ids[ids.length - 1]}`;
}

/**
 * The window footnote, in whichever of its three states the page is in.
 *
 * It is one footnote and not three, and it is always on the page, because the sentence it has
 * to carry in every state is the same one: nothing here is a fraction of a window. What
 * changes is how much it can say about which rows ran under what — a fact about the court that
 * has to be read from the chain before it can be stated.
 *
 * Where the history is missing it says so as a fact about the read, and it distinguishes only
 * what it can see: a scan that came back with no configuration at all is not the same as one
 * that has not answered. Which of *those* two happened — still in flight, or refused — is the
 * provenance footer's business, because a footnote that guessed would announce a failure on
 * every cold load, the trap `CLAUDE.md` records against `RosterView`.
 */
export function WindowFootnote({ performance }: { performance: CourtPerformance }) {
  const { current, read } = performance.parameters;
  const { changedWindows: changes, unplacedDisputes: unplaced } = performance.totals;

  return (
    <Footnote>
      <FootnoteMark aria-hidden="true">†</FootnoteMark>
      <span>
        {current === null ? (
          <>
            Court 34's period durations changed partway through this experiment, and its parameter
            history is not in hand on this load —{" "}
            {read
              ? "that read came back carrying no configuration at all"
              : "it is still being read, or could not be"}
            . So nothing above is marked as having run under the earlier ones, and that is an unread
            state rather than a finding.
          </>
        ) : changes.length === 0 && unplaced.length === 0 ? (
          <>
            Every dispute here ran under the period durations the court holds now: a commit window
            of {formatWindowSeconds(current.commitSeconds)} and a vote window of{" "}
            {formatWindowSeconds(current.voteSeconds)}.
          </>
        ) : changes.length === 0 ? (
          // The claim above is the one that must never be made carelessly. A dispute the
          // history could not place is not a dispute that ran under the current windows: a scan
          // that dropped the court's oldest configuration leaves exactly this state, and saying
          // "every dispute ran under 45m and 30m" over it would state the opposite of the truth
          // with nothing on the page to contradict it.
          <>
            No dispute here is marked as having run under earlier period durations, but the
            parameter history read on this load does not reach back far enough to place{" "}
            {unplaced.length === 1 ? "dispute" : "disputes"} {listOf(unplaced)} — so that is not the
            same as saying they ran under the {formatWindowSeconds(current.commitSeconds)} and{" "}
            {formatWindowSeconds(current.voteSeconds)} windows the court holds now.
          </>
        ) : (
          <>
            {changes.map((change) => (
              <span key={`${change.windows.commitSeconds}-${change.windows.voteSeconds}`}>
                {change.disputes.length === 1 ? "Dispute" : "Disputes"} {listOf(change.disputes)}{" "}
                ran with a commit window of {formatWindowSeconds(change.windows.commitSeconds)} and
                a vote window of {formatWindowSeconds(change.windows.voteSeconds)}, against{" "}
                {formatWindowSeconds(current.commitSeconds)} and{" "}
                {formatWindowSeconds(current.voteSeconds)} configured now.{" "}
              </span>
            ))}
            {unplaced.length > 0 && (
              <>
                {unplaced.length === 1 ? "Dispute" : "Disputes"} {listOf(unplaced)} the history read
                on this load cannot place at all, so {unplaced.length === 1 ? "it is" : "they are"}{" "}
                unmarked for want of anything to compare against rather than for having matched.{" "}
              </>
            )}
          </>
        )}{" "}
        Latency is held and shown as an absolute duration everywhere on this page, and never as a
        fraction of the window it ran in.{" "}
        <Link to="/method#window">What that means for these figures</Link>.
      </span>
    </Footnote>
  );
}

/**
 * The lone-panel footnote, where the court decided something with one agent juror.
 *
 * Renders nothing where no dispute has one, which is not the same as saying so: a footnote
 * naming a caveat that does not apply reads as a caveat about the whole page.
 */
export function LonePanelFootnote({ performance }: { performance: CourtPerformance }) {
  const lonePanels = performance.totals.lonePanelDisputes;
  if (lonePanels.length === 0) return null;

  return (
    <Footnote>
      <FootnoteMark aria-hidden="true">‡</FootnoteMark>
      <span>
        {lonePanels.length === 1 ? "Dispute" : "Disputes"} {listOf(lonePanels)}{" "}
        {lonePanels.length === 1 ? "was" : "were"} decided by a panel of one. A lone agent juror is
        automatically the majority, so coherence there is tautological and carries no information.
        It is counted in the record and marked wherever it is counted.
      </span>
    </Footnote>
  );
}

/**
 * Why so much of the record is empty, counted.
 *
 * The one caveat this dashboard cannot afford to lose on a phone, because it is the one that
 * prevents a *misreading* rather than answering a question: without it a blank position reads as
 * an agent juror that failed to act, which is the distinction ticket 05 exists to protect. It is
 * therefore always rendered and never behind a control on either layout.
 *
 * `noun` is the only thing that differs between them. The matrix draws a position as a table
 * cell and the phone draws it as a slot on a card, and calling a slot a cell on a page with no
 * grid on it would be describing something the reader cannot see. Every figure comes from
 * `totals.sparsity`, so the two layouts count the same court.
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
