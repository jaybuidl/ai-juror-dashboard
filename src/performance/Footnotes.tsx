import { Fragment } from "react";
import { Link } from "react-router";
import styled from "styled-components";
import { VisuallyHidden } from "../styles/hidden";
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

  /* Underlined, and permanently rather than on hover. This is a link inside a block of body
     prose, which is the one shape where colour alone is not allowed to carry the fact that a
     link is there: the accent against this paragraph's ink is 1.22:1 where WCAG 1.4.1 wants 3:1,
     so a reader who does not separate those two hues has nothing telling them the sentence ends
     in a link. Every other link in this repo is standalone — a dagger, an ID, a nav item — and
     those legitimately underline on hover only; the rule is about text blocks, and this is one.

     The default is the trap rather than this file: the vendored base.css sets text-decoration of
     none on every anchor, so a link dropped into prose anywhere is colour-only until someone says
     otherwise, and that file cannot be edited. The offset matches Justification.tsx, which
     had already done this for the links inside an agent's own justification prose; this and
     AgentJurorPage.tsx's MissingBody are the other two prose containers. Ticket 28. */
  a {
    color: ${({ theme }) => theme.accent};
    text-decoration: underline;
    text-underline-offset: 2px;
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

const SparsityBody = styled.p<{ $bare?: boolean }>`
  margin-top: ${({ theme, $bare }) => ($bare === true ? "0" : theme.space4)};
  font: ${({ theme }) => theme.typeBodySm};
  /* It counts cells, disputes and columns, and the shorthand above resets the tabular figures
     base.css puts on the body — the same correction every footnote beside it carries. */
  font-feature-settings: ${({ theme }) => theme.featureNumeric};
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
      {/* The dagger is drawn and the note is named. The mark is hidden because "†" is announced
          as "dagger" where it is announced at all, but hiding it alone left a reader who cannot
          see the glyph with a paragraph and no handle on it — while the figures upstairs carry
          links reading "Why 007's median reveal is marked". This is the other end of that. */}
      <FootnoteMark aria-hidden="true">†</FootnoteMark>
      <VisuallyHidden>Note on the window change. </VisuallyHidden>
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
      <VisuallyHidden>Note on lone panels. </VisuallyHidden>
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
 * Why so much of the record is empty, counted — and which of two things each blank means.
 *
 * The one caveat this dashboard cannot afford to lose on a phone, because it is the one that
 * prevents a *misreading* rather than answering a question: without it a blank position reads as
 * an agent juror that failed to act, which is the distinction ticket 05 exists to protect. It is
 * therefore always rendered and never behind a control on any layout or at any density.
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
/**
 * How the note is dressed, which is the one thing that differs between its two renderings.
 *
 * "footnote" is the matrix's: a plain paragraph among the † and ‡ notes below the grid, in the
 * same family and reading as one of them. It used to be a bordered card there, which made a
 * caveat about the court look like a component of the grid and put a second box below a page
 * already carrying several.
 *
 * "card" is the phone's, and it is not a leftover. Ticket 16 put this note at the *head* of the
 * card list rather than at its foot, deliberately: it prevents a misreading rather than
 * answering a question, and a reader who does not know they have been misled never scrolls to
 * the bottom to find out. Standing alone above the cards it needs an edge of its own.
 *
 * The words are identical either way and are built once below. That is the rule this file
 * exists to keep — two renderings of one record may differ in their chrome and never in what
 * they claim.
 */
export type SparsityPresentation = "card" | "footnote";

export function SparsityNote({
  performance,
  noun,
  presentation = "card",
}: {
  performance: CourtPerformance;
  noun: "cell" | "slot";
  presentation?: SparsityPresentation;
}) {
  const { sparsity, unreadDisputes } = performance.totals;
  const unread = unreadDisputes.length;
  const undrawn = sparsity.undrawnDisputes;

  const Frame = presentation === "card" ? SparsityCard : Fragment;

  return (
    <Frame>
      {presentation === "card" && <SparsityLabel>On the empty {noun}s</SparsityLabel>}
      <SparsityBody $bare={presentation === "footnote"}>
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
    </Frame>
  );
}
