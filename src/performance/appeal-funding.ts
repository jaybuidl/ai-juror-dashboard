import { type ChoiceLabel, choiceTitleOf } from "../disputes/dispute-templates";
import type { AgentJuror } from "../roster/agent-jurors";
import type { DetailRound } from "./dispute-detail";
import { KLEROS_BOT } from "./dispute-timeline";

/**
 * How each round of a dispute's appeal was funded: which sides raised what, whether they reached
 * their fee, and who gave it (#32).
 *
 * An appeal needs at least two sides funded. The maintainer's terms, kept exactly:
 * - **Appealed**: two or more sides funded, so a new round starts.
 * - **Partially funded**: exactly one side funded. That side may have had several funders.
 * - Nothing funded: contributions that did not reach any side's fee.
 *
 * Funders are classes and never addresses, by the rule the timeline's openers follow: an agent
 * juror on the roster by name, the Kleros bot, "a party" (an address under the dispute template's
 * `aliases`), "the dispute creator" (the sender of the transaction that created it), then the
 * account's primary ENS name where it has one, and otherwise "someone else". Several accounts in
 * one class are one funder line with a count.
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
   * Someone else, with a primary ENS name (#32, the maintainer's addition): shown by that name,
   * one line per account. Only where nothing above names the account.
   */
  | { kind: "ens"; name: string; address: string }
  | { kind: "someone-else" }
  /**
   * Not on the roster, not the bot, not a party, and the dispute's creator is not read yet, so
   * whether this is the creator or someone else is not known. Never guessed either way.
   */
  | { kind: "pending" };

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
  /** Who gave it, largest share first. Empty where the kit recorded a sum and no contribution. */
  funders: readonly Funder[];
};

export type RoundOutcome = "appealed" | "partially-funded" | "not-funded";

export type RoundFunding = {
  roundIndex: number;
  /** Every side anything was raised for, by choice. */
  sides: readonly SideFunding[];
  outcome: RoundOutcome;
};

/** One stable key per funder line: an agent juror by address, every other class by kind. */
function keyOf(funder: FunderClass): string {
  if (funder.kind === "agent-juror") return `agent-juror:${funder.agentJuror.address}`;
  if (funder.kind === "ens") return `ens:${funder.address}`;
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
    aliases,
    creator,
    ensNames,
  }: {
    roster: readonly AgentJuror[];
    aliases: ReadonlySet<string>;
    creator: string | null | undefined;
    ensNames: ReadonlyMap<string, string>;
  },
): FunderClass {
  const agentJuror = roster.find((candidate) => candidate.address.toLowerCase() === account);
  if (agentJuror !== undefined) return { kind: "agent-juror", agentJuror };
  if (account === KLEROS_BOT.toLowerCase()) return { kind: "kleros-bot" };
  if (aliases.has(account)) return { kind: "party" };
  if (creator === undefined) return { kind: "pending" };
  if (creator !== null && account === creator) return { kind: "creator" };
  const name = ensNames.get(account);
  return name === undefined ? { kind: "someone-else" } : { kind: "ens", name, address: account };
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
}: {
  /** `DisputeDetail.funding`. */
  funding: readonly DetailRound[];
  /** The template's named choices, for each side's title. */
  answers: readonly ChoiceLabel[];
  /** The template's `aliases` addresses, lowercased. */
  aliases: readonly string[];
  roster: readonly AgentJuror[];
  /**
   * The dispute's creator, lowercased or as the chain returns it; `null` where it cannot be read
   * (no creation transaction); `undefined` while it has not been read yet.
   */
  creator: string | null | undefined;
  /** Primary ENS names by lowercased address (`useEnsNames`), for funders nothing else names. */
  ensNames?: ReadonlyMap<string, string>;
}): readonly RoundFunding[] {
  const context = {
    roster,
    aliases: new Set(aliases),
    creator: creator === null || creator === undefined ? creator : creator.toLowerCase(),
    ensNames,
  };

  return funding.map((round) => {
    const byChoice = new Map<number, SideFunding & { funders: Funder[] }>();
    const sideOf = (choice: number) => {
      let side = byChoice.get(choice);
      if (side === undefined) {
        side = {
          choice,
          title: choiceTitleOf(choice, answers),
          raisedWei: 0n,
          funded: false,
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

    // Who made each side up, one line per class, counting distinct accounts.
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
      .map((side) => ({
        ...side,
        funders: [...side.funders].sort((a, b) => (a.wei === b.wei ? 0 : a.wei > b.wei ? -1 : 1)),
      }))
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
  /** Rounds before the current one, oldest first: each was appealed, or it would be current. */
  earlier: readonly RoundFunding[];
};

/** Splits the funding between the current round's appeal lane and the rounds before it. */
export function stripFundingOf(
  funding: readonly RoundFunding[],
  round:
    | { index: number; appealOpenedAt: number | null; executionOpenedAt: number | null }
    | undefined,
): StripFunding {
  if (round === undefined) return { current: null, earlier: [] };

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
  };
}
