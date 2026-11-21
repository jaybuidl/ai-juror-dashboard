import { type ChoiceLabel, choiceTitleOf } from "../disputes/dispute-templates";
import type { DisputeRound } from "../disputes/disputes";
import type { AgentJuror } from "../roster/agent-jurors";
import type { DetailRound } from "./dispute-detail";
import { KLEROS_BOT } from "./dispute-timeline";
import { imitates } from "./lookalike";
import { type ParameterRegime, rewardsAt, windowsAt } from "./windows";

/**
 * How each round of a dispute's appeal was funded: which sides raised what, whether they reached
 * their fee, and who gave it (#32).
 *
 * An appeal needs at least two sides funded. The maintainer's terms, kept exactly:
 * - **Appealed**: two or more sides funded, so a new round starts.
 * - **Partially funded**: exactly one side funded. That side may have had several funders.
 * - Nothing funded: contributions that did not reach any side's fee.
 *
 * Each funder is named by the first of these that fits: an agent juror on the roster by name, the
 * Kleros bot, "a party" (an address under the dispute template's `aliases`), "the dispute creator"
 * (the sender of the transaction that created it), the account's primary ENS name, and otherwise
 * the account itself, drawn short and linked to Arbiscan (the maintainer's ruling, 2026-11-21:
 * "someone else" told a reader nothing they could check). Several parties are one line with a
 * count; every other account is its own line. A class that depends on a read not yet in (the
 * template's parties, the creator) is "pending" until it is, never guessed.
 *
 * Each side also carries the fee it needed, where it can be worked out (`requiredOf`), so a side
 * that raised something and was not funded says how far short it fell.
 *
 * Pure, with no clock and no network: the kit's rounds arrive from the dispute's own read, and
 * the creator from its chain read.
 */

/** Who funded, as far as this page may say. */
export type FunderClass =
  | { kind: "agent-juror"; agentJuror: AgentJuror }
  | { kind: "kleros-bot" }
  | { kind: "party" }
  | { kind: "creator" }
  /**
   * An account nothing above names, with a primary ENS name (#32, the maintainer's addition):
   * shown by that name. Never a name that passes for an agent juror, Kleros or an address
   * (`lookalike.ts`).
   */
  | { kind: "ens"; name: string; address: string }
  /** An account nothing above names, and no name to show: the account, lowercased. */
  | { kind: "account"; address: string }
  /**
   * Not on the roster and not the bot, while the template's parties or the dispute's creator are
   * not read yet, so which of party, creator or another account it is is not known. Never guessed.
   */
  | { kind: "pending" }
  /**
   * What a side raised beyond the contributions the read returned (`dispute-detail-subgraph.ts`
   * bounds them). Its sum is known from the kit and its accounts are not, so it is one line.
   */
  | { kind: "unread" };

/** One class's share of one side: how much, from how many accounts. */
export type Funder = { funder: FunderClass; wei: bigint; accounts: number };

export type SideFunding = {
  choice: number;
  /** What the template calls it, or `null` where nothing named it. */
  title: string | null;
  /** What the side raised in wei: the kit's own sum (`Answer.paidFee`). */
  raisedWei: bigint;
  /** Whether it reached its full appeal fee. */
  funded: boolean;
  /**
   * The fee it needed to be funded, in wei, or `null` where it cannot be worked out. See
   * `requiredOf`.
   */
  requiredWei: bigint | null;
  /**
   * Who gave it, largest share first, then any sum the read returned no contribution for
   * (`unread`). Empty only where the side raised nothing.
   */
  funders: readonly Funder[];
};

export type RoundOutcome = "appealed" | "partially-funded" | "not-funded";

export type RoundFunding = {
  roundIndex: number;
  /** Every side anything was raised for, by choice. */
  sides: readonly SideFunding[];
  outcome: RoundOutcome;
};

/** One stable key per funder line: an account by its address, every class of several by kind. */
function keyOf(funder: FunderClass): string {
  if (funder.kind === "agent-juror") return `agent-juror:${funder.agentJuror.address}`;
  if (funder.kind === "ens" || funder.kind === "account") return `account:${funder.address}`;
  return funder.kind;
}

/**
 * Which class an account falls in. The order is the order of what this page can name: an agent
 * juror's own account first, then the court's bot, then the template's parties, then the creator.
 * A party who also created the dispute is a party.
 */
function classOf(
  account: string,
  {
    roster,
    nicknames,
    aliases,
    creator,
    ensNames,
  }: {
    roster: readonly AgentJuror[];
    nicknames: readonly string[];
    aliases: ReadonlySet<string> | undefined;
    creator: string | null | undefined;
    ensNames: ReadonlyMap<string, string>;
  },
): FunderClass {
  const agentJuror = roster.find((candidate) => candidate.address.toLowerCase() === account);
  if (agentJuror !== undefined) return { kind: "agent-juror", agentJuror };
  if (account === KLEROS_BOT.toLowerCase()) return { kind: "kleros-bot" };
  if (aliases === undefined) return { kind: "pending" };
  if (aliases.has(account)) return { kind: "party" };
  if (creator === undefined) return { kind: "pending" };
  if (creator !== null && account === creator) return { kind: "creator" };
  const name = ensNames.get(account);
  return name === undefined || imitates(name, nicknames)
    ? { kind: "account", address: account }
    : { kind: "ens", name, address: account };
}

/**
 * DisputeKitClassic's appeal fee multipliers, in basis points, read off the kit
 * (`commit-logs.ts` holds its address) on 2026-11-21: the side the round's vote favoured pays
 * the appeal's cost once more on top of it, any other side twice more.
 */
export const WINNER_STAKE_MULTIPLIER = 10_000n;
export const LOSER_STAKE_MULTIPLIER = 20_000n;
const ONE_BASIS_POINT = 10_000n;

/** The court's fee per vote and its jump threshold, as in force for one round's appeal. */
export type AppealCourtFee = { feeForJuror: string; jurorsForCourtJump: string };

/**
 * What the court charged for one round's appeal, as far as its history says (`appealFeesOf`):
 * - `steady`: one fee and one jump threshold for the whole appeal window, so a funded side's sum
 *   and the court's fee agree, and either prices the round;
 * - `changed`: the current round's appeal, with the fee moved since it opened, so a side funded
 *   before the change paid the old fee and only the current one says what a side needs now;
 * - `unknown`: an earlier or closed appeal whose fee moved during its window, so no one fee
 *   priced it and none is said.
 *
 * A round with no reading at all (no history read, or no appeal opened) is priced by nothing,
 * not even a funded side: without the history, nothing says the fee held still.
 */
export type AppealFeeReading =
  | { kind: "steady"; fee: AppealCourtFee }
  | { kind: "changed"; fee: AppealCourtFee }
  | { kind: "unknown" };

/**
 * The fee each side of one round needed to be funded, or `null` per side where it cannot be
 * worked out.
 *
 * The kit's own rule (`fundAppeal`): the appeal's cost, plus the cost times the side's multiplier,
 * the winner's for the choice the kit's `currentRuling` names and the loser's for every other.
 * During the appeal period that ruling is the round's winning choice, or 0 (refuse to arbitrate)
 * where the vote tied, whatever `winningChoice` says: dispute 318 tied, so Refuse owed the
 * winner's fee, and Yes the loser's 0.00891 ETH, not the 0.00594 Grokleros gave it.
 *
 * The cost is the court's fee for the appeal (`reading`) times the votes the next round would draw
 * (twice this round's, plus one), as `KlerosCore.appealCost` reckons it at each contribution. Only
 * where the appeal stays in this court: past `jurorsForCourtJump` it is the parent court's fee,
 * which is not read here, and the answer is `null`. Checked against every funded side, which
 * raised its fee exactly: one that disagrees silences the round rather than print a wrong fee.
 *
 * A court reconfigured during the appeal changes what a side owes partway through (`AppealFee
 * Reading`): an open appeal is priced by the current configuration alone, and a closed one not at
 * all.
 */
function requiredOf(
  round: DetailRound,
  reading: AppealFeeReading | undefined,
): (choice: number) => bigint | null {
  const { tied, winningChoice, nbVotes } = round;
  if (reading === undefined || reading.kind === "unknown") return () => null;
  if (tied === null || tied === undefined) return () => null;
  // Past the jump threshold the appeal costs the parent court's fee, whose history is not read,
  // so neither its fee nor whether it held still is known.
  const { fee } = reading;
  if (nbVotes === null || nbVotes === undefined) return () => null;
  if (BigInt(nbVotes) >= BigInt(fee.jurorsForCourtJump)) return () => null;
  if (!tied && (winningChoice === null || winningChoice === undefined)) return () => null;
  const favoured = tied ? 0 : winningChoice;
  const multiplierOf = (choice: number) =>
    choice === favoured ? WINNER_STAKE_MULTIPLIER : LOSER_STAKE_MULTIPLIER;
  const feeFor = (cost: bigint, choice: number) =>
    cost + (cost * multiplierOf(choice)) / ONE_BASIS_POINT;

  const cost = BigInt(fee.feeForJuror) * BigInt(nbVotes * 2 + 1);
  // A funded side raised its fee exactly (contributions are capped), so under one steady fee
  // every funded side must come out of this cost. One that does not means the rule here has
  // drifted from the kit's, a multiplier or the cost formula, and no figure is said.
  if (reading.kind === "steady") {
    const funded = round.sides.filter((side) => side.funded);
    if (!funded.every((side) => feeFor(cost, side.choice) === side.paidWei)) return () => null;
  }

  return (choice) => feeFor(cost, choice);
}

/**
 * What the court charged for each round's appeal (`AppealFeeReading`), by round index.
 *
 * The court reads its fee at each contribution, so what matters is whether the two fields that
 * set it, `feeForJuror` and `jurorsForCourtJump`, held still across the appeal window: from the
 * period's opening to its close where the read has one, and otherwise to the opening plus the
 * longest appeal window the court held from then on (a reconfigured window moves the deadline
 * too, so the longest is the safe one).
 * A move of anything else, a period's window, is not a move of the fee.
 *
 * A round whose appeal never opened has nothing to price, since contributions open with the
 * period; nor has any round with no history read, or one opened before it (`rewardsAt`).
 */
export function appealFeesOf(
  rounds: readonly DisputeRound[],
  currentIndex: number | undefined,
  regimes: readonly ParameterRegime[],
): ReadonlyMap<number, AppealFeeReading> {
  const fees = new Map<number, AppealFeeReading>();
  for (const round of rounds) {
    const opened = round.appealOpenedAt;
    if (opened === null) continue;
    const atOpening = rewardsAt(regimes, opened);
    if (atOpening === null) continue;

    const later = regimes.filter((regime) => regime.from > opened);
    const longest = Math.max(
      windowsAt(regimes, opened)?.appealSeconds ?? 0,
      ...later.map((regime) => regime.windows.appealSeconds),
    );
    // The period's own close where the read has one: execution, or the next round, which the
    // appeal opened, and whose commit period is later still. Otherwise the latest it could be.
    const closedAt =
      round.executionOpenedAt ??
      rounds.find((next) => next.index === round.index + 1)?.commitOpenedAt ??
      null;
    const deadline = Math.min(opened + longest, closedAt ?? Number.POSITIVE_INFINITY);
    const moved = later.filter(
      (regime) =>
        regime.from <= deadline &&
        (regime.rewards.feeForJuror !== atOpening.feeForJuror ||
          regime.rewards.jurorsForCourtJump !== atOpening.jurorsForCourtJump),
    );
    const current = round.index === currentIndex && round.executionOpenedAt === null;
    // The last fee set inside the window, not the latest of all: one set after the deadline
    // priced no contribution.
    const last = rewardsAt(regimes, deadline);

    if (moved.length === 0) fees.set(round.index, { kind: "steady", fee: atOpening });
    else if (current && last !== null) fees.set(round.index, { kind: "changed", fee: last });
    else fees.set(round.index, { kind: "unknown" });
  }
  return fees;
}

/**
 * The funders whose ENS name is worth asking for: every contributor that is not an agent juror
 * on the roster or the Kleros bot, lowercased. Parties and the creator are asked for too, and
 * their class still wins over the name (`classOf`); asking before the creator is known saves a
 * second round trip when it lands.
 */
export function ensCandidatesOf(
  funding: readonly DetailRound[],
  roster: readonly AgentJuror[],
): readonly string[] {
  const named = new Set([
    ...roster.map((agentJuror) => agentJuror.address.toLowerCase()),
    KLEROS_BOT.toLowerCase(),
  ]);
  const candidates = new Set<string>();
  for (const round of funding) {
    for (const { contributor } of round.contributions) {
      if (!named.has(contributor)) candidates.add(contributor);
    }
  }
  return [...candidates].sort();
}

export function buildAppealFunding({
  funding,
  answers,
  aliases,
  roster,
  creator,
  ensNames = new Map(),
  displayedNames = [],
  fees = new Map(),
}: {
  /** `DisputeDetail.funding`. */
  funding: readonly DetailRound[];
  /** The template's named choices, for each side's title. */
  answers: readonly ChoiceLabel[];
  /**
   * The template's `aliases` addresses, lowercased; `[]` where the dispute has no template;
   * `undefined` while one it has is not read, so no unmatched funder can be told from a party.
   */
  aliases: readonly string[] | undefined;
  roster: readonly AgentJuror[];
  /**
   * The dispute's creator, lowercased or as the chain returns it; `null` where it cannot be read
   * (no creation transaction); `undefined` while it has not been read yet. `null` shows an
   * unmatched funder as its account, which asserts it is not the creator: the subgraph records a
   * creation transaction for every dispute in court 34, so this is the case of none at all.
   */
  creator: string | null | undefined;
  /** Primary ENS names by lowercased address (`useEnsNames`), for funders nothing else names. */
  ensNames?: ReadonlyMap<string, string>;
  /**
   * Every other name the page shows an agent juror by (its ENS nickname where that resolved),
   * which an ENS name must not pass for either. The roster's own nicknames are always checked.
   */
  displayedNames?: readonly string[];
  /**
   * The court's fee in force for each round's appeal, by round index, where the parameter history
   * was read. Only needed for a round no side funded; see `requiredOf`.
   */
  fees?: ReadonlyMap<number, AppealFeeReading>;
}): readonly RoundFunding[] {
  const context = {
    roster,
    nicknames: [...roster.map((agentJuror) => agentJuror.nickname), ...displayedNames],
    aliases: aliases === undefined ? undefined : new Set(aliases),
    creator: creator === null || creator === undefined ? creator : creator.toLowerCase(),
    ensNames,
  };

  return funding.map((round) => {
    const requiredFor = requiredOf(round, fees.get(round.index));
    const byChoice = new Map<number, SideFunding & { funders: Funder[] }>();
    const sideOf = (choice: number) => {
      let side = byChoice.get(choice);
      if (side === undefined) {
        side = {
          choice,
          title: choiceTitleOf(choice, answers),
          raisedWei: 0n,
          funded: false,
          requiredWei: requiredFor(choice),
          funders: [],
        };
        byChoice.set(choice, side);
      }
      return side;
    };

    for (const side of round.sides) {
      const entry = sideOf(side.choice);
      entry.raisedWei = side.paidWei;
      entry.funded = side.funded;
    }

    // Who made each side up: one line per account, or per class where a class holds several.
    const accounts = new Map<string, Set<string>>();
    const contributedTo = new Map<number, bigint>();
    for (const contribution of round.contributions) {
      const entry = sideOf(contribution.choice);
      const funder = classOf(contribution.contributor, context);
      const key = `${contribution.choice}|${keyOf(funder)}`;

      let line = entry.funders.find((candidate) => keyOf(candidate.funder) === keyOf(funder));
      if (line === undefined) {
        line = { funder, wei: 0n, accounts: 0 };
        entry.funders.push(line);
      }
      line.wei += contribution.wei;

      const seen = accounts.get(key) ?? new Set<string>();
      if (!seen.has(contribution.contributor)) {
        seen.add(contribution.contributor);
        line.accounts += 1;
      }
      accounts.set(key, seen);
      contributedTo.set(
        contribution.choice,
        (contributedTo.get(contribution.choice) ?? 0n) + contribution.wei,
      );
    }

    // A side the kit holds no sum for but contributions name: its sum is theirs.
    for (const [choice, wei] of contributedTo) {
      const entry = sideOf(choice);
      if (entry.raisedWei === 0n) entry.raisedWei = wei;
    }

    const sides = [...byChoice.values()]
      .map((side) => {
        const funders = [...side.funders].sort((a, b) =>
          a.wei === b.wei ? 0 : a.wei > b.wei ? -1 : 1,
        );
        // The kit's sum is every contribution, so less from those returned is a short read, and
        // a side whose list looks whole would understate who gave. Said as its own line, last.
        const listed = funders.reduce((sum, funder) => sum + funder.wei, 0n);
        if (side.raisedWei > listed) {
          funders.push({ funder: { kind: "unread" }, wei: side.raisedWei - listed, accounts: 0 });
        }
        return { ...side, funders };
      })
      .sort((a, b) => a.choice - b.choice);
    const funded = sides.filter((side) => side.funded).length;

    return {
      roundIndex: round.index,
      sides,
      outcome: funded >= 2 ? "appealed" : funded === 1 ? "partially-funded" : "not-funded",
    };
  });
}

/** Where the strip draws a dispute's funding: the current round's, and every earlier round's. */
export type StripFunding = {
  /**
   * The current round's funding, or `null` where nothing was contributed to it. `open` while its
   * appeal period still runs, when the outcome can still change and the strip says "so far".
   *
   * Never "appealed" in practice: the kit appeals a dispute in the transaction that funds its
   * second side, so an appealed round is an earlier round by the time anything reads it.
   */
  current: { round: RoundFunding; open: boolean } | null;
  /**
   * Whether the funding was read before the court saw the dispute move on, so its sums may miss
   * what arrived since: the strip then says it is as last read rather than name an outcome.
   */
  behind: boolean;
  /**
   * Rounds before the current one, oldest first: each was appealed, or it would be current, which
   * the court read says whatever these sums were read at. The strip heads them "appealed" on that.
   */
  earlier: readonly RoundFunding[];
};

/** Splits the funding between the current round's appeal lane and the rounds before it. */
export function stripFundingOf(
  funding: readonly RoundFunding[],
  round:
    | { index: number; appealOpenedAt: number | null; executionOpenedAt: number | null }
    | undefined,
  /** `DisputeDetailView.isBehindStage`. */
  behind = false,
): StripFunding {
  if (round === undefined) return { current: null, earlier: [], behind };

  const current = funding.find((entry) => entry.roundIndex === round.index);
  return {
    current:
      current === undefined
        ? null
        : {
            round: current,
            open: round.appealOpenedAt !== null && round.executionOpenedAt === null,
          },
    earlier: funding.filter((entry) => entry.roundIndex < round.index),
    behind,
  };
}
