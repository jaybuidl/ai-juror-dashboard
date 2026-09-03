import type { ChoiceLabel, DisputeTemplate } from "../disputes/dispute-templates";
import type { Dispute, DisputeRound } from "../disputes/disputes";
import { type Justification, toJustification } from "./justifications";
import type { Draw, MatrixRow } from "./performance";
import type { PeriodWindows } from "./windows";

/**
 * One dispute, read whole: the ballot, the evidence, and what every panel member wrote.
 *
 * The same seam discipline as `buildCourtPerformance` — pure, no network, no clock — and for
 * the same reasons. What is different is the altitude: this is one dispute rather than the
 * court, and it joins three things the court-wide model already holds (the row, the dispute,
 * the template) to one read that only this view needs.
 *
 * That read is per dispute deliberately. The justification prose is 124 KB across the court
 * today and grows with every draw; the matrix shows none of it, and `courtDraws` is persisted
 * to `localStorage`, so carrying it court-wide would inflate every load and every stored cache
 * to serve one view. Choices and evidence are per dispute for the same reason.
 */

/** One choice's tally, as `ClassicRound.answers` returns it. Counts vote IDs, not draws. */
export type RawChoiceVotes = {
  answerId: string;
  count: string;
};

export type RawLocalRound = {
  id: string;
  answers?: readonly RawChoiceVotes[] | null;
};

/**
 * The dispute as the classic kit holds it.
 *
 * A list on the core `Dispute`, because a dispute can in principle run under several kits.
 * Court 34 uses the classic kit alone and the list has one entry; anything that assumed the
 * first entry was classic without the inline fragment would read `numberOfChoices` off
 * whatever kit happened to sort first.
 */
export type RawKitDispute = {
  numberOfChoices?: string | null;
  localRounds?: readonly RawLocalRound[] | null;
};

/** One drawn vote ID with its prose, from the same `Draw` entity the matrix reads. */
export type RawDetailDraw = {
  id: string;
  juror: { id: string };
  round: { id: string };
  vote?: {
    choice?: string | null;
    /** `reference` is where the prose lives. `""` is a field published empty. */
    justification?: { reference: string } | null;
  } | null;
};

/** Everything the per-dispute read returns. Every field nullable: see `toDisputeDetail`. */
export type RawDisputeDetail = {
  dispute: {
    id: string;
    disputeID: string;
    /**
     * The arbitrable's own id for this dispute, and the reason the evidence count is guarded.
     * See `evidenceCountOf`.
     */
    externalDisputeId: string;
    /** The transaction that created the dispute. See `transactionOf`. */
    transactionHash?: string | null;
    disputeKitDispute?: readonly RawKitDispute[] | null;
  } | null;
  evidenceGroup?: { id: string; nextEvidenceIndex: string } | null;
  draws?: readonly RawDetailDraw[] | null;
};

/** One choice on the ballot and the vote IDs cast for it. `votes: 0` is an answer, not a gap. */
export type ChoiceVotes = {
  choice: number;
  votes: number;
};

/** One agent juror's published prose, keyed by the address the subgraph reports it under. */
export type DrawJustification = {
  /** Lowercased, as The Graph returns it — never the checksummed form the roster holds. */
  juror: string;
  justification: Justification;
};

export type DisputeDetail = {
  /**
   * Choices `0` to `numberOfChoices`, ascending, each with the vote IDs cast for it.
   *
   * Every choice, not only the ones that drew votes: `ClassicRound.answers` holds an entry only
   * where somebody voted, so a ballot read straight off it silently omits the choices nobody
   * picked — and "choice 1 received no votes" is a fact about the panel that the card is
   * required to state. Empty where the ballot could not be read at all, which is a different
   * thing again and reads as an absence rather than as a panel that voted for nothing.
   */
  ballot: readonly ChoiceVotes[];
  /**
   * Evidence submissions, or `null` where the count could not be trusted. See `evidenceCountOf`.
   */
  evidenceCount: number | null;
  /**
   * The transaction that created this dispute, or `null` where none was read.
   *
   * The one thing on this view that is a link out to the chain itself, and it is a
   * *transaction* rather than a contract: Arbiscan has no page for a dispute, so linking the
   * arbitrator's address would send a reader to a contract holding hundreds of disputes and
   * leave them to find this one. Validated as a 32-byte hash before it is rendered, because it
   * becomes an href.
   */
  transactionHash: string | null;
  /** What each agent juror published. Absent from this list means no justification was found. */
  justifications: readonly DrawJustification[];
};

/** Nothing read: what every field of the model says when the read has not come back. */
export const NO_DETAIL: DisputeDetail = {
  ballot: [],
  evidenceCount: null,
  transactionHash: null,
  justifications: [],
};

/** Same canonical-decimal guard as the rest of the model, and for the same reason. */
const CANONICAL_DECIMAL = /^(0|[1-9]\d*)$/;

/**
 * The largest ballot this will draw out choice by choice.
 *
 * A bound on a loop, and the one field in this module where being tolerant is not enough.
 * `numberOfChoices` comes from the arbitrable and is a `BigInt` on the schema, so a canonical
 * decimal of eighty digits is a *well-formed* value that `toCount` has no reason to refuse —
 * and filling a ballot from 0 to it builds that many Map entries and hangs the tab, with no
 * error and no banner.
 *
 * It is reachable rather than theoretical: `dispute(id:)` is global across every court on the
 * subgraph, and this view models whatever comes back before anything checks the dispute is
 * court 34's. So `/disputes/<some other court's dispute>` is enough, and the arbitrable behind
 * it is not one this experiment controls.
 *
 * 64 is far above anything a juror could reasonably be asked to choose between and far below
 * anything that costs a frame. Past it the ballot degrades exactly as an unread one does.
 */
const MAX_CHOICES = 64;

/**
 * A count or a choice number, or `null` where the field cannot be believed.
 *
 * `null` rather than a throw, which is the opposite of what `disputes.ts` does with a timestamp
 * and deliberately so: nothing on this view becomes a *latency*, so the worst case of a
 * malformed field here is a card that omits a figure. A ballot that refused to render because
 * one answer id was garbled would lose the other five for nothing.
 */
function toCount(value: string | null | undefined): number | null {
  if (typeof value !== "string" || !CANONICAL_DECIMAL.test(value)) return null;
  return Number(value);
}

/**
 * The choices a ballot holds, filled out to every one a juror could have picked.
 *
 * `numberOfChoices` is the count of *named* choices, so the ballot runs `0..numberOfChoices`
 * inclusive — choice 0 is refuse to arbitrate, it is always valid, and the kit never counts it
 * among the choices the arbitrable defined (`CONTEXT.md`).
 *
 * A choice with votes but no place on the ballot is kept rather than dropped. It cannot happen
 * against a well-formed kit, and if it ever does the honest rendering is a row whose votes are
 * real and whose number is beyond what the arbitrable said it offered — not a card whose totals
 * quietly fail to add up.
 */
function toBallot(kit: RawKitDispute | undefined): readonly ChoiceVotes[] {
  const numberOfChoices = toCount(kit?.numberOfChoices);
  const counted = new Map<number, number>();

  // The current round's tally, which is the last one: round ids are `<kit>-<dispute>-<n>` and
  // The Graph orders them lexicographically, so the position is not the index — the same trap
  // `disputes.ts` reads round indexes from the id suffix to avoid.
  const rounds = [...(kit?.localRounds ?? [])].sort(
    (a, b) => (toCount(roundSuffixOf(a.id)) ?? 0) - (toCount(roundSuffixOf(b.id)) ?? 0),
  );
  const current = rounds[rounds.length - 1];

  for (const answer of current?.answers ?? []) {
    const choice = toCount(answer.answerId);
    const votes = toCount(answer.count);
    if (choice === null || votes === null) continue;
    counted.set(choice, (counted.get(choice) ?? 0) + votes);
  }

  // `null` is "unread"; anything past the ceiling is "unbelievable". Both fall back to the
  // choices that actually drew votes, because both mean the same thing to a reader: the card
  // lists what was counted and cannot claim to be listing every choice on the ballot.
  if (numberOfChoices === null || numberOfChoices > MAX_CHOICES) {
    return [...counted.entries()]
      .map(([choice, votes]) => ({ choice, votes }))
      .sort((a, b) => a.choice - b.choice);
  }

  const ballot = new Map<number, number>();
  for (let choice = 0; choice <= numberOfChoices; choice += 1) ballot.set(choice, 0);
  for (const [choice, votes] of counted) ballot.set(choice, votes);

  return [...ballot.entries()]
    .map(([choice, votes]) => ({ choice, votes }))
    .sort((a, b) => a.choice - b.choice);
}

function roundSuffixOf(id: string): string {
  return id.slice(id.lastIndexOf("-") + 1);
}

/**
 * How many pieces of evidence were submitted, or `null` where the join cannot be trusted.
 *
 * The deployed core subgraph carries **no link from a dispute to its evidence**. `Dispute` has
 * no `evidenceCount` and `ClassicEvidence` has no `dispute` — only an `evidenceGroup`, whose id
 * is whatever the arbitrable passed as `_evidenceGroupID`. (The mapping in `kleros-v2` today
 * *does* put `evidenceCount` on the dispute; that is a later version than the one deployed at
 * v0.17.2, and this is the same shape as the `_eligibility` trap `CLAUDE.md` records — the
 * source in the monorepo is not what is answering the query.)
 *
 * So the join is an assumption: that court 34's one arbitrable
 * (`0xb5526d022962a1fff6ed32c93e8b714c901f4323`) uses the core dispute id as its evidence group
 * id. Checked on 2026-08-25 across all 31 disputes the court then held — every one has a group,
 * and all 33 submissions fall inside their dispute's own evidence period.
 *
 * `externalDisputeId` is what guards it. The group is asked for by the dispute's own id, so if
 * the arbitrable ever numbers its disputes differently the two disagree and this returns `null`
 * rather than a count belonging to somebody else's dispute. A wrong number here would be a fact
 * about a dispute nobody read, printed on a page that may be cited; an absent one is a slot
 * that says it could not be read.
 */
function evidenceCountOf(raw: RawDisputeDetail): number | null {
  const dispute = raw.dispute;
  const group = raw.evidenceGroup;
  if (dispute === undefined || dispute === null || group === undefined || group === null) {
    return null;
  }

  // The read asks for the group under the core dispute id. This is the check that the
  // arbitrable agrees that is its own id for the dispute.
  if (dispute.externalDisputeId !== dispute.disputeID || group.id !== dispute.disputeID) {
    return null;
  }

  // `nextEvidenceIndex` counts the submissions: the mapping increments it after each one and
  // `evidenceIndex` is one-based, so the two coincide. Read as a single number rather than by
  // counting `ClassicEvidence` rows, because a paged list of entities can come back short
  // without throwing and a counter cannot — the shape `CLAUDE.md` warns about for every read
  // by id. `dispute-detail.integration.test.ts` pins the two against each other.
  return toCount(group.nextEvidenceIndex);
}

/**
 * A transaction hash, or `null` where what came back is not one.
 *
 * Checked rather than trusted because it becomes an `href`. The subgraph types it as a plain
 * `String` and nothing downstream of a garbled one would fail loudly — it would simply be a
 * link to an Arbiscan page that does not exist, on a public page that may be cited.
 */
function transactionOf(value: string | null | undefined): string | null {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(value)) return null;
  return value;
}

/**
 * Every justification in the dispute, one per agent juror.
 *
 * Several vote IDs collapse to one, which is the unit this whole dashboard counts in: a
 * `ClassicJustification` is one per draw, so an agent juror holding two vote IDs published one
 * piece of prose and it arrives twice. First wins — they are two views of one entity.
 *
 * A vote with no justification is not in the list at all, and that absence is what the column
 * renders as "no justification published". It is distinct from a justification whose
 * `reference` is `""`, which is present, has length zero, and is a field somebody published
 * empty — the case dispute 156 holds today.
 */
function toJustifications(raw: RawDisputeDetail): readonly DrawJustification[] {
  const draws = raw.draws ?? [];

  // The current round's, and only it. `toBallot` takes the last round and `buildDisputeReading`
  // joins these columns against that same round, so prose taken from any other one would be
  // printed under a column that did not write it. The query asks for every draw in the dispute
  // with no ordering, so on the first dispute that is appealed a juror drawn in both rounds
  // would otherwise have round 0's reasoning shown as round 1's — silently, and only for the
  // jurors drawn twice. Costless while every dispute in this court has one round.
  const current = draws.reduce<number>(
    (highest, draw) => Math.max(highest, toCount(roundSuffixOf(draw.round.id)) ?? 0),
    0,
  );

  const byJuror = new Map<string, Justification>();

  for (const draw of draws) {
    if ((toCount(roundSuffixOf(draw.round.id)) ?? 0) !== current) continue;

    const reference = draw.vote?.justification?.reference;
    if (typeof reference !== "string") continue;

    const juror = draw.juror.id.toLowerCase();
    if (byJuror.has(juror)) continue;

    byJuror.set(juror, toJustification(reference));
  }

  return [...byJuror.entries()].map(([juror, justification]) => ({ juror, justification }));
}

/**
 * The per-dispute read, modelled.
 *
 * Tolerant throughout, and that is the deliberate difference from `buildCourtPerformance`,
 * which refuses a payload it cannot believe. Nothing here becomes a latency or a coherence:
 * the worst a malformed field can do is leave a slot on the card unread, so every one of them
 * degrades to an absence and the view says which. A dispute id that names nothing comes back
 * as `dispute: null`, which is not an error either — it is a real route with an id that names
 * no dispute, and that is the view's own sentence to say.
 */
export function toDisputeDetail(raw: RawDisputeDetail): DisputeDetail {
  return {
    transactionHash: transactionOf(raw.dispute?.transactionHash),
    // The classic kit's entry, and only it. Court 34 runs one kit, so this is the single
    // element — but reading `[0]` without the inline fragment in the query would take
    // `numberOfChoices` off whichever kit sorted first.
    ballot: toBallot(raw.dispute?.disputeKitDispute?.[0]),
    evidenceCount: evidenceCountOf(raw),
    justifications: toJustifications(raw),
  };
}

/**
 * Whether the read found the dispute at all.
 *
 * Its own function because the two absences it separates are the whole of what a bad URL looks
 * like: a read that has not landed (`raw` is `undefined`) and a read that landed and found
 * nothing (`raw.dispute` is `null`). The 404 catches neither — every path answers HTTP 200
 * through the SPA fallback, so `/disputes/9999` is a real route with an id that names nothing,
 * and this view has to say so itself.
 */
export function namesADispute(raw: RawDisputeDetail | undefined): boolean {
  return raw !== undefined && raw.dispute !== null && raw.dispute !== undefined;
}

/**
 * One period of the dispute, as the timeline strip draws it.
 *
 * Two absolute durations and never a ratio — ADR-0005, and this is the strip the ADR names
 * (`canvas/Dispute.dc.html:88-96`). `windowSeconds` is what the court was configured to allow
 * while this dispute ran, resolved per period from the court's own history; `elapsedSeconds` is
 * how long the period in fact ran. Nothing here divides one by the other, and nothing anywhere
 * else may either.
 */
export type PeriodRun = {
  period: "evidence" | "commit" | "vote" | "appeal";
  /** The configured duration. `null` until the parameter history has been read. */
  windowSeconds: number | null;
  /**
   * How long the period actually ran, from the moment it opened to the moment the next opened.
   *
   * `null` where it has not closed — the period is still running, or the dispute never reached
   * it. The strip words that as open rather than computing against a clock: this model reads no
   * clock, for the same reason the court-wide seam does not.
   */
  elapsedSeconds: number | null;
};

/**
 * How long each period ran, from the moments the round recorded.
 *
 * The evidence period is measured from the dispute's own creation, which is the only moment
 * there is: `Round.timeline` starts at the commit period, so nothing on chain marks when the
 * evidence period opened other than the dispute existing. Its window is carried too, though the
 * strip shows the submission count in that slot instead — no window governs how long evidence
 * is accepted in practice, and the count is what a reader wants there.
 */
export function periodsOf(
  dispute: Dispute,
  round: DisputeRound | undefined,
  windows: PeriodWindows | null,
): readonly PeriodRun[] {
  const between = (from: number | null, to: number | null): number | null =>
    from === null || to === null ? null : Math.max(0, to - from);

  return [
    {
      period: "evidence",
      windowSeconds: windows?.evidenceSeconds ?? null,
      elapsedSeconds: between(dispute.createdAt, round?.commitOpenedAt ?? null),
    },
    {
      period: "commit",
      windowSeconds: windows?.commitSeconds ?? null,
      elapsedSeconds: between(round?.commitOpenedAt ?? null, round?.voteOpenedAt ?? null),
    },
    {
      period: "vote",
      windowSeconds: windows?.voteSeconds ?? null,
      elapsedSeconds: between(round?.voteOpenedAt ?? null, round?.appealOpenedAt ?? null),
    },
    {
      // The one period whose two numbers disagree and are still both shown. Every appeal in this
      // court has run about eighteen hours against a configured thirty-six, across both
      // configurations, and no one has explained the gap — so appeal duration is not understood
      // here, and nothing may be derived from the configured value as though it were.
      period: "appeal",
      windowSeconds: windows?.appealSeconds ?? null,
      elapsedSeconds: between(round?.appealOpenedAt ?? null, round?.executionOpenedAt ?? null),
    },
  ];
}

/** One column of the justification band: who, what they did, and what they wrote. */
export type PanelColumn = {
  draw: Draw;
  /**
   * What this agent juror published, or `null` where it published nothing at all.
   *
   * `null` and a justification of length zero are different facts and the column words them
   * differently. Both are the field being empty rather than a read having failed, which is why
   * neither is drawn in the failure vocabulary.
   */
  justification: Justification | null;
};

/** One dispute, as the view renders it. Every figure on the page is one of these fields. */
export type DisputeReading = {
  dispute: Dispute;
  /** The round the panel sat in — the current one. `undefined` for a dispute with no rounds. */
  round: DisputeRound | undefined;
  /** The template's fields, or `null` where no template resolved. */
  template: DisputeTemplate | null;
  /**
   * The drawn agent jurors, in roster order, with the diverged ones exactly where the roster
   * put them.
   *
   * Coherence never reorders these and nothing sorts at render time: the order is `MatrixRow`'s,
   * which is the roster's, which is a property of `agent-jurors.ts`. A band that sorted the
   * diverged reading last would rank agent jurors, which this dashboard does not do.
   */
  columns: readonly PanelColumn[];
  /**
   * Everyone the court drew, which is not the same as `columns.length`.
   *
   * A juror outside the roster gets no column and still counts here (`CONTEXT.md`). Where the
   * two differ the view says so, rather than presenting six columns as the whole panel.
   */
  panelSize: number;
  /** The ballot with each choice's name attached. See `ChoiceTally`. */
  tally: readonly ChoiceTally[];
  /** Evidence submissions, or `null` where the count could not be read. */
  evidenceCount: number | null;
  /** The transaction that created the dispute, for the header's link out to the chain. */
  transactionHash: string | null;
  periods: readonly PeriodRun[];
  windows: PeriodWindows | null;
  /** Whether this dispute ran under period durations the court has since changed — the † marker. */
  underEarlierWindows: boolean;
  /** Whether the draws on screen could have seen this dispute at all. See `MatrixRow.read`. */
  read: boolean;
};

/** One choice, its name and its votes, as the ruling card lists it. */
export type ChoiceTally = ChoiceVotes & {
  /** What the template calls it, or `null` where nothing named it. Choice 0 always has one. */
  title: string | null;
  /** Whether this choice is the court's ruling. Exactly one is true once the court has ruled. */
  isRuling: boolean;
};

/**
 * What choice 0 is, on every ballot in every court.
 *
 * Not read from the template, because it is never in one: refusing to arbitrate is a property
 * of the protocol rather than of the arbitrable's question (`CONTEXT.md`), and it is always
 * valid. A card that left it unnamed would present the one choice every panel always has as the
 * one choice nobody could name.
 */
export const REFUSE_TO_ARBITRATE = "Refuse to arbitrate";

function titleOf(choice: number, answers: readonly ChoiceLabel[]): string | null {
  if (choice === 0) return REFUSE_TO_ARBITRATE;

  const named = answers.find((answer) => answer.choice === choice);
  // An answer present but titled `""` is a choice the template declined to name, which reads
  // the same way as one it never mentioned: there are no words to print either way.
  return named === undefined || named.title === "" ? null : named.title;
}

/**
 * The ruling's choice number, or `null` while the court has not decided.
 *
 * The same reading as the court-wide seam's, restated rather than exported from it because the
 * two are asking different questions of the same field: there it decides coherence, here it
 * decides which row of the card is marked. Choice 0 is a ruling — a truthiness test on it would
 * leave a refused dispute's card with nothing marked at all.
 */
export function rulingChoiceOf(dispute: Dispute): number | null {
  switch (dispute.ruling.state) {
    case "pending":
      return null;
    case "refused":
      return 0;
    case "ruled":
      return dispute.ruling.choice;
  }
}

/**
 * Everything one dispute's view renders, from the court-wide model and the one read beside it.
 *
 * A join and not a fetch. The row, the dispute and the template are already held for the matrix
 * and the dispute index — moving between views must not re-read them — and `detail` is the only
 * thing this view asks for on its own.
 */
export function buildDisputeReading({
  row,
  detail,
  template,
}: {
  row: MatrixRow;
  detail: DisputeDetail;
  template: DisputeTemplate | undefined;
}): DisputeReading {
  const dispute = row.dispute;
  // The current round, by index rather than by position: The Graph orders `id`
  // lexicographically, so `151-10` arrives above `151-9` and the last element of the array is
  // not the last round. `disputes.ts` reads the index off the id suffix for the same reason.
  const round = [...dispute.rounds].sort((a, b) => a.index - b.index).at(-1);
  const ruling = rulingChoiceOf(dispute);
  const answers = template?.answers ?? [];

  return {
    dispute,
    round,
    template: template ?? null,
    columns: row.cells
      .filter((cell): cell is Draw => cell !== null)
      .map((draw) => ({
        draw,
        justification:
          detail.justifications.find(
            (published) => published.juror === draw.agentJuror.address.toLowerCase(),
          )?.justification ?? null,
      })),
    panelSize: row.panelSize,
    tally: detail.ballot.map((entry) => ({
      ...entry,
      title: titleOf(entry.choice, answers),
      isRuling: ruling !== null && entry.choice === ruling,
    })),
    evidenceCount: detail.evidenceCount,
    transactionHash: detail.transactionHash,
    periods: periodsOf(dispute, round, row.windows),
    windows: row.windows,
    underEarlierWindows: row.underEarlierWindows,
    read: row.read,
  };
}
