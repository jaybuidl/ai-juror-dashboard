import styled from "styled-components";
import { arbiscanAddressOf, shortAddress } from "../arbiscan";
import type { AgentJuror } from "../roster/agent-jurors";
import type { RosterView } from "../roster/useRoster";
import { narrow } from "../styles/breakpoints";
import { VisuallyHidden } from "../styles/hidden";
import type { Funder, RoundFunding, SideFunding, StripFunding } from "./appeal-funding";
import type { DisputeReading, PeriodRun } from "./dispute-detail";
import type { DisputeTimeline, Moment, Opener, TimelineEntry } from "./dispute-timeline";
import { formatElapsedSeconds, formatWindowSeconds } from "./latency";
import { clockOf, dayOf, isoOf, sameDay } from "./moments";
import { formatEthWei } from "./rewards";

/**
 * The dispute's periods, each with what happened in it: `canvas/Dispute.dc.html:87-96`.
 *
 * Each slot says how long its period ran against its window, as it did before ADR-0012, and then
 * lists its moments in the order they happened: when the period opened and who opened it, and
 * each agent juror's commitment or reveal. Clock readings and never durations — the time between
 * an opening and an agent juror acting is a latency, which ADR-0010 keeps off any surface that
 * sets agent jurors side by side. Every moment here comes from `buildDisputeTimeline`; this only
 * draws it.
 */

const Strip = styled.ol`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space6};
  padding: ${({ theme }) => `${theme.space6} ${theme.space7}`};
  border: ${({ theme }) => theme.borderHairline};
  border-radius: ${({ theme }) => theme.radiusTile};
  background-color: ${({ theme }) => theme.surfaceInset};
  list-style: none;

  /* The one width this dashboard reduces at, since ticket 16. One column below it rather than
     the two the strip had before it carried a timeline: two lanes of moments at 390pt leave a
     nickname a few characters a line. */
  ${narrow} {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Slot = styled.li`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: ${({ theme }) => theme.space4};
`;

const SlotName = styled.span`
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textPending};
`;

const SlotValue = styled.span`
  font: ${({ theme }) => theme.typeMono};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  color: ${({ theme }) => theme.textBody};
`;

/* Flush with the slot's left edge: a list keeps the browser's start padding unless it is reset. */
const Lane = styled.ol`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space3};
  margin-top: ${({ theme }) => theme.space2};
  padding: ${({ theme }) => theme.space5} 0 0;
  border-top: ${({ theme }) => theme.borderHairline};
  list-style: none;
`;

/* The space between the two cells is a text node in the markup, so the time and the words stay
   apart in the text a screen reader is given. Whitespace alone is no grid item and draws nothing. */
const Entry = styled.li`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: baseline;
  gap: ${({ theme }) => theme.space4};
`;

type Ink = "meta" | "pending" | "unread";

/* Nine characters, the widest thing a time slot says ("Not dated"), so every row's text starts
   at the same edge. Mono, with the tabular figures the shorthand resets. */
const When = styled.span<{ $ink: Ink }>`
  display: block;
  min-width: 9ch;
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  color: ${({ theme, $ink }) =>
    $ink === "unread" ? theme.stateFail : $ink === "pending" ? theme.textPending : theme.textMeta};
`;

const What = styled.span<{ $ink?: Ink }>`
  min-width: 0;
  font: ${({ theme }) => theme.typeBodySm};
  color: ${({ theme, $ink }) => ($ink === "unread" ? theme.stateFail : theme.textBody)};
  overflow-wrap: anywhere;
`;

/* The legend's own marks for the two stages, quiet: the word beside each says it. */
const Glyph = styled.span`
  color: ${({ theme }) => theme.textMeta};
`;

const Name = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.textHeading};
`;

/* A funder's ENS name, in the funder line's own quiet ink and not in the bold an agent juror's
   name takes, so a name chosen by a stranger never reads as one of the roster's. It is its
   holder's choice and has no length limit, so it breaks anywhere rather than widen the lane. */
const EnsName = styled.span`
  overflow-wrap: anywhere;
`;

/* A funder named by its account or its ENS name links to that account on Arbiscan, where a reader
   can check it. Underlined always, in the line's own ink: a link marked by colour alone fails WCAG
   1.4.1, and the accent would mark it as the page's own (CLAUDE.md). */
const AccountLink = styled.a`
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
`;

const OffRoster = styled.span`
  color: ${({ theme }) => theme.textMeta};
`;

/* "off-roster" is one word to a reader, and a line break after its hyphen reads as two. */
const Unbroken = styled.span`
  white-space: nowrap;
`;

const Zone = styled.span`
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textPending};
`;

/* The appeal's funding, under the appeal lane (#32, Dispute.dc.html:95). Not moments, so not on
   the time axis: contributions carry no time this dashboard reads, and placing them between two
   clock readings would claim an order nobody knows. */
const FundingHead = styled.p`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space4};
  margin-top: ${({ theme }) => theme.space3};
  padding-top: ${({ theme }) => theme.space5};
  border-top: ${({ theme }) => theme.borderHairline};
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textPending};
`;

const Sides = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space3};
  margin: 0;
  padding: 0;
  list-style: none;
`;

/* A side, and each funder under it: words on the left, the amount right-aligned in tabular
   figures. Wraps rather than overflowing where a lane is narrow, so the amount drops under the
   words instead of off the edge. */
const Row = styled.span<{ $indent?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: ${({ theme }) => theme.space4};
  padding-left: ${({ theme, $indent }) => ($indent ? theme.space5 : "0")};
  font: ${({ theme }) => theme.typeBodySm};
  color: ${({ theme, $indent }) => ($indent ? theme.textMeta : theme.textBody)};
`;

const SideName = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.textHeading};
`;

/* "not funded" is quieter than "funded", and the word is what carries it, not the ink. */
const Funded = styled.span<{ $funded: boolean }>`
  color: ${({ theme, $funded }) => ($funded ? theme.textBody : theme.textMeta)};
`;

const Amount = styled.span`
  margin-left: auto;
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  color: ${({ theme }) => theme.textBody};
`;

const PERIOD_NAMES: Record<PeriodRun["period"], string> = {
  evidence: "Evidence",
  commit: "Commit period",
  vote: "Vote period",
  appeal: "Appeal period",
};

/**
 * What one slot's summary reads.
 *
 * The configured window and how long the period actually ran, as two absolute durations with a
 * middot between them and no division anywhere — ADR-0005, and this is the strip that decision
 * names. The evidence slot carries its submission count instead, because no window governs how
 * long evidence is accepted in practice and the count is what a reader wants there.
 *
 * Three absences, told apart: a window the parameter history has not supplied, a period that
 * has not closed, and a period the dispute never reached. Only the first is about this
 * dashboard, and it is the only one worded as something unread.
 */
function slotValue(run: PeriodRun, evidenceCount: number | null, reached: boolean): string {
  if (run.period === "evidence") {
    if (evidenceCount === null) return "Submissions not read";
    return evidenceCount === 1 ? "1 submission" : `${evidenceCount} submissions`;
  }

  const window =
    run.windowSeconds === null
      ? "Window not read"
      : `${formatWindowSeconds(run.windowSeconds)} configured`;

  if (run.elapsedSeconds !== null) {
    return `${window} · closed in ${formatElapsedSeconds(run.elapsedSeconds)}`;
  }

  return `${window} · ${reached ? "still open" : "not reached"}`;
}

/** Whether the dispute has got as far as a period, from the moments its round recorded. */
function hasReached(reading: DisputeReading, period: PeriodRun["period"]): boolean {
  const round = reading.round;
  if (round === undefined) return period === "evidence";

  switch (period) {
    case "evidence":
      return true;
    case "commit":
      return round.commitOpenedAt !== null;
    case "vote":
      return round.voteOpenedAt !== null;
    case "appeal":
      return round.appealOpenedAt !== null;
  }
}

/**
 * The clock reading, with the day above it where the day is not the one the dispute was created
 * on — an appeal period runs into the next one. The creation itself always carries its day, so
 * the strip says once which day the times are on; a later round's strip has no creation entry,
 * so there every moment carries its day.
 */
function MomentCell({ at, dayAnchor }: { at: Moment; dayAnchor: number | null }) {
  switch (at.kind) {
    case "at":
      return (
        <When $ink="meta">
          <time dateTime={isoOf(at.seconds)}>
            {(dayAnchor === null || !sameDay(at.seconds, dayAnchor)) && (
              <>
                {dayOf(at.seconds)} <br />
              </>
            )}
            {clockOf(at.seconds)}
          </time>
        </When>
      );
    case "pending":
      return (
        <When $ink="pending">
          <span aria-hidden="true">—</span>
          <VisuallyHidden>Time not read yet</VisuallyHidden>
        </When>
      );
    case "not-found":
      // The same words and the same rose as the agent juror page's commit figure, for the same
      // fact: a commitment the subgraph recorded and the chain read did not return.
      return <When $ink="unread">Not read</When>;
    case "undated":
      return <When $ink="pending">Not dated</When>;
  }
}

/** Who opened a period, by the name the panel below uses, or by what kind of account it was. */
function By({ by, nameOf }: { by: Opener; nameOf: (agentJuror: AgentJuror) => string }) {
  switch (by.kind) {
    case "agent-juror":
      return <Name>{nameOf(by.agentJuror)}</Name>;
    case "kleros-bot":
      // The routine case, so in the quiet ink: a period whose time was up, advanced by the court's
      // own keeper. Named, unlike any other account off the roster, because it is Kleros's.
      return <OffRoster>the Kleros bot</OffRoster>;
    case "off-roster":
      // A kind and never an address: whoever called is not an agent juror this dashboard follows,
      // and naming an account off the roster is the personal data it does not hold.
      return (
        <OffRoster>
          an <Unbroken>off-roster</Unbroken> account
        </OffRoster>
      );
    case "pending":
      return (
        <>
          <span aria-hidden="true">—</span>
          <VisuallyHidden>an account not read yet</VisuallyHidden>
        </>
      );
    case "not-found":
      return <>an account not found on chain</>;
  }
}

function EntryRow({
  entry,
  dayAnchor,
  nameOf,
}: {
  entry: TimelineEntry;
  /** The day the creation's entry states, or `null` where the strip has no creation entry. */
  dayAnchor: number | null;
  nameOf: (agentJuror: AgentJuror) => string;
}) {
  switch (entry.kind) {
    case "created":
      return (
        <Entry>
          <When $ink="meta">
            <time dateTime={isoOf(entry.at)}>
              {dayOf(entry.at)} <br />
              {clockOf(entry.at)}
            </time>
          </When>{" "}
          <What>Dispute created</What>
        </Entry>
      );
    case "opened":
    case "closed":
      return (
        <Entry>
          <MomentCell at={{ kind: "at", seconds: entry.at }} dayAnchor={dayAnchor} />{" "}
          <What $ink={entry.by.kind === "not-found" ? "unread" : undefined}>
            {entry.kind === "opened" ? "Opened" : "Closed"} by <By by={entry.by} nameOf={nameOf} />
          </What>
        </Entry>
      );
    case "committed":
    case "revealed":
      return (
        <Entry>
          <MomentCell at={entry.at} dayAnchor={dayAnchor} />{" "}
          <What>
            <Glyph aria-hidden="true">{entry.kind === "committed" ? "◐" : "●"}</Glyph>{" "}
            <Name>{nameOf(entry.agentJuror)}</Name> {entry.kind}
          </What>
        </Entry>
      );
  }
}

/**
 * One funder line's words: an agent juror by name, a class by its kind, and any other account by
 * its ENS name or its short address, linked to Arbiscan. The link's name is said in full, since
 * the short form drawn is not one a screen reader can be expected to read out usefully.
 */
function FunderName({
  funder,
  nameOf,
}: {
  funder: Funder;
  nameOf: (agentJuror: AgentJuror) => string;
}) {
  const { funder: who, accounts } = funder;
  switch (who.kind) {
    case "agent-juror":
      return <Name>{nameOf(who.agentJuror)}</Name>;
    case "kleros-bot":
      return <>the Kleros bot</>;
    case "party":
      return <>{accounts > 1 ? `${accounts} parties` : "a party"}</>;
    case "creator":
      return <>the dispute creator</>;
    case "ens":
      return (
        <AccountLink
          href={arbiscanAddressOf(who.address)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${who.name}, account ${who.address} on Arbiscan`}
        >
          <EnsName>{who.name}</EnsName>
        </AccountLink>
      );
    case "account":
      return (
        <AccountLink
          href={arbiscanAddressOf(who.address)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Account ${who.address} on Arbiscan`}
        >
          {shortAddress(who.address)}
        </AccountLink>
      );
    case "unread":
      return <>others not read</>;
    case "pending":
      return (
        <>
          <span aria-hidden="true">—</span>
          <VisuallyHidden>
            {accounts > 1 ? `${accounts} accounts` : "an account"} not read yet
          </VisuallyHidden>
        </>
      );
  }
}

/** An amount in ETH, the unit said to a screen reader on every figure and drawn once in the head. */
function Eth({ wei }: { wei: bigint }) {
  return (
    <Amount>
      {formatEthWei(wei)}
      {/* The separating space in a text node, never inside the hidden element (CLAUDE.md). */}{" "}
      <VisuallyHidden>ETH</VisuallyHidden>
    </Amount>
  );
}

/**
 * What a side raised, and, where it was not funded and its fee is known, what it needed: "0.0059 of
 * 0.0089". A funded side raised its fee exactly, so it says one figure.
 */
function Raised({ side }: { side: SideFunding }) {
  const required = side.funded ? null : side.requiredWei;
  return (
    <Amount>
      {formatEthWei(side.raisedWei)}
      {required !== null && required > side.raisedWei && ` of ${formatEthWei(required)}`}{" "}
      <VisuallyHidden>ETH</VisuallyHidden>
    </Amount>
  );
}

/**
 * One round's funding: a head naming the outcome, then each side, its funders under it.
 *
 * A side with one funder line gives no amount on that line, since it is the side's own. `compact`
 * is an earlier round's form, at the top of the next round's evidence lane: funders joined on one
 * line, no amount each.
 */
function FundingList({
  funding,
  label,
  nameOf,
  compact = false,
}: {
  funding: RoundFunding;
  label: string;
  nameOf: (agentJuror: AgentJuror) => string;
  compact?: boolean;
}) {
  const id = `funding-${funding.roundIndex}`;
  return (
    <>
      <FundingHead id={id}>
        <span>{label}</span>
        <span aria-hidden="true">ETH</span>
      </FundingHead>
      <Sides aria-labelledby={id}>
        {funding.sides.map((side) => (
          <li key={side.choice}>
            <Row>
              {/* "Choice N" where the template names nothing, so a lone number is never read as a
                  count (2026-11-02, maintainer's ruling; see choiceNameOf). */}
              <SideName>
                {side.title === null ? `Choice ${side.choice}` : `${side.choice} · ${side.title}`}
              </SideName>{" "}
              <Funded $funded={side.funded}>{side.funded ? "funded" : "not funded"}</Funded>{" "}
              <Raised side={side} />
            </Row>
            {compact || side.funders.length === 1
              ? side.funders.length > 0 && (
                  <Row $indent>
                    <span>
                      {side.funders.map((funder, index) => (
                        <span key={keyOfFunder(funder)}>
                          {index > 0 && ", "}
                          <FunderName funder={funder} nameOf={nameOf} />
                        </span>
                      ))}
                    </span>
                  </Row>
                )
              : side.funders.map((funder) => (
                  <Row $indent key={keyOfFunder(funder)}>
                    <span>
                      <FunderName funder={funder} nameOf={nameOf} />
                    </span>{" "}
                    <Eth wei={funder.wei} />
                  </Row>
                ))}
          </li>
        ))}
      </Sides>
    </>
  );
}

function keyOfFunder({ funder }: Funder): string {
  if (funder.kind === "agent-juror") return funder.agentJuror.address;
  if (funder.kind === "ens" || funder.kind === "account") return funder.address;
  return funder.kind;
}

/**
 * What the head of one round's funding says. "So far" while the appeal period runs, because the
 * outcome can still change; the maintainer's terms once it has closed. "As last read" while the
 * court has seen the dispute move on since these sums were read, so no outcome is named over sums
 * that may miss the contribution that decided it (#32).
 */
function fundingLabel(round: RoundFunding, open: boolean, behind: boolean): string {
  if (behind) return "Funding as last read";
  if (open) return "Funding so far";
  switch (round.outcome) {
    case "appealed":
      return "Appealed";
    case "partially-funded":
      return "Partially funded · no appeal";
    case "not-funded":
      return "No side funded · no appeal";
  }
}

export function PeriodStrip({
  reading,
  timeline,
  roster,
  funding = { current: null, earlier: [], behind: false },
}: {
  reading: DisputeReading;
  timeline: DisputeTimeline;
  roster: RosterView;
  /** The appeal's funding, current round and earlier ones (`stripFundingOf`). */
  funding?: StripFunding;
}) {
  // The ENS nickname where it resolved, as the panel's columns name the same agent jurors; the
  // roster's otherwise. Display only: every join above was on the address.
  const nameOf = (agentJuror: AgentJuror) =>
    roster.entries.find((entry) => entry.agentJuror.address === agentJuror.address)?.identity
      .nickname ?? agentJuror.nickname;
  // The day the strip's times are on, said once by the creation's entry. A later round has no
  // creation in its strip, so every moment there carries its day instead (`null`).
  const dayOf0 =
    reading.round === undefined || reading.round.index === 0 ? reading.dispute.createdAt : null;

  return (
    <Strip aria-label="Timeline">
      {reading.periods.map((run) => {
        const entries = timeline.lanes[run.period];
        return (
          <Slot key={run.period}>
            <SlotName>{PERIOD_NAMES[run.period]}</SlotName>
            <SlotValue>
              {slotValue(run, reading.evidenceCount, hasReached(reading, run.period))}
            </SlotValue>
            {/* Each earlier round's appeal, where this round's evidence period began because of it:
                otherwise the round that was appealed drops out of view as soon as the next one
                starts (#32). */}
            {run.period === "evidence" &&
              funding.earlier.map((round) => (
                <FundingList
                  key={round.roundIndex}
                  funding={round}
                  // Appealed, because a round came after it: the court read's word, never these
                  // sums', which a read made before the appeal would contradict. Said to be as
                  // last read while they may be, as the current round's head is.
                  label={`Round ${round.roundIndex + 1} · appealed${funding.behind ? " · funding as last read" : ""}`}
                  nameOf={nameOf}
                  compact
                />
              ))}
            {entries.length > 0 && (
              <Lane aria-label={PERIOD_NAMES[run.period]}>
                {entries.map((entry) => (
                  <EntryRow key={keyOf(entry)} entry={entry} dayAnchor={dayOf0} nameOf={nameOf} />
                ))}
              </Lane>
            )}
            {run.period === "appeal" && funding.current !== null && (
              <FundingList
                funding={funding.current.round}
                label={fundingLabel(funding.current.round, funding.current.open, funding.behind)}
                nameOf={nameOf}
              />
            )}
            {run.period === "evidence" && <Zone>All times UTC</Zone>}
          </Slot>
        );
      })}
    </Strip>
  );
}

function keyOf(entry: TimelineEntry): string {
  switch (entry.kind) {
    case "created":
    case "opened":
    case "closed":
      return entry.kind;
    case "committed":
    case "revealed":
      return `${entry.kind}:${entry.agentJuror.address}`;
  }
}
