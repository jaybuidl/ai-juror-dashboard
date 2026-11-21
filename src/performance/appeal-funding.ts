import { type ChoiceLabel, choiceTitleOf } from "../disputes/dispute-templates";
import { AGENT_JUROR_ENS_PARENT, type AgentJuror } from "../roster/agent-jurors";
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
 * one class are one funder line with a count. A class that depends on a read not yet in (the
 * template's parties, the creator) is "pending" until it is, never guessed.
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
   * one line per account. Only where nothing above names the account, and never a name that
   * passes for an agent juror or for Kleros (`imitates`).
   */
  | { kind: "ens"; name: string; address: string }
  | { kind: "someone-else" }
  /**
   * Not on the roster and not the bot, while the template's parties or the dispute's creator are
   * not read yet, so which of party, creator or someone else it is is not known. Never guessed.
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

/** One stable key per funder line: an agent juror by address, every other class by kind. */
function keyOf(funder: FunderClass): string {
  if (funder.kind === "agent-juror") return `agent-juror:${funder.agentJuror.address}`;
  if (funder.kind === "ens") return `ens:${funder.address}`;
  return funder.kind;
}

/** Letters and digits only, lowercased: the form a look-alike is compared in. */
function bare(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Whether an ENS name would pass for an agent juror or for Kleros on the page.
 *
 * Anyone can register a name such as `grokleros.eth` and make it their primary name, and the
 * forward check that `useEnsNames` relies on proves only that the account holds it. Such a funder
 * is "someone else": a name that dresses as the roster or as the court is worth less than none.
 * A name under the agents parent is exempt, since only Kleros issues those. Conservative by
 * design: a genuine name that happens to contain a nickname loses a label, never a figure.
 */
function imitates(name: string, roster: readonly AgentJuror[]): boolean {
  if (name.endsWith(`.${AGENT_JUROR_ENS_PARENT}`)) return false;
  const label = bare(name.split(".")[0] ?? "");
  if (label.includes("kleros")) return true;
  return roster.some((agentJuror) => {
    const nickname = bare(agentJuror.nickname);
    return nickname.length > 0 && label.includes(nickname);
  });
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
  return name === undefined || imitates(name, roster)
    ? { kind: "someone-else" }
    : { kind: "ens", name, address: account };
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
  /**
   * The template's `aliases` addresses, lowercased; `[]` where the dispute has no template;
   * `undefined` while one it has is not read, so no unmatched funder can be told from a party.
   */
  aliases: readonly string[] | undefined;
  roster: readonly AgentJuror[];
  /**
   * The dispute's creator, lowercased or as the chain returns it; `null` where it cannot be read
   * (no creation transaction); `undefined` while it has not been read yet. `null` makes an
   * unmatched funder "someone else", which asserts it is not the creator: the subgraph records a
   * creation transaction for every dispute in court 34, so this is the case of none at all.
   */
  creator: string | null | undefined;
  /** Primary ENS names by lowercased address (`useEnsNames`), for funders nothing else names. */
  ensNames?: ReadonlyMap<string, string>;
}): readonly RoundFunding[] {
  const context = {
    roster,
    aliases: aliases === undefined ? undefined : new Set(aliases),
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
