import { describe, expect, it } from "vitest";
import { AGENT_JUROR_ENS_PARENT, ROSTER } from "../roster/agent-jurors";
import {
  buildAppealFunding,
  ensCandidatesOf,
  type FunderClass,
  type RoundFunding,
  stripFundingOf,
} from "./appeal-funding";
import detail318 from "./dispute-318-detail.fixture.json" with { type: "json" };
import { type DetailRound, type RawDisputeDetail, toDisputeDetail } from "./dispute-detail";
import { KLEROS_BOT } from "./dispute-timeline";

/**
 * How an appeal was funded (#32), against dispute 318 as the subgraph returned it on 2026-11-21:
 * choice 1 funded by one account off the roster (synthetic in the fixture), choice 2 contributed to
 * by Grokleros and not funded. Partially funded, by the maintainer's definition.
 */

const GROKLEROS = "0x93aa2f8e5ce8288d57f8785f5a40a60a42fd925e";
const UNKNOWN = "0x1111111111111111111111111111111111111111";
const CREATOR = "0x2222222222222222222222222222222222222222";
const PARTY = "0x3333333333333333333333333333333333333333";

const ANSWERS = [
  { choice: 1, title: "No" },
  { choice: 2, title: "Yes" },
];

const funding318 = toDisputeDetail(detail318 as RawDisputeDetail).funding;

function build(
  funding: readonly DetailRound[] = funding318,
  overrides: {
    aliases?: readonly string[];
    creator?: string | null | undefined;
    ensNames?: ReadonlyMap<string, string>;
  } = {},
): readonly RoundFunding[] {
  return buildAppealFunding({
    funding,
    answers: ANSWERS,
    aliases: overrides.aliases ?? [],
    roster: ROSTER,
    creator: "creator" in overrides ? overrides.creator : CREATOR,
    ensNames: overrides.ensNames,
  });
}

function kinds(funders: readonly { funder: FunderClass }[]): string[] {
  return funders.map(({ funder }) =>
    funder.kind === "agent-juror" ? funder.agentJuror.nickname : funder.kind,
  );
}

describe("buildAppealFunding", () => {
  it("reads dispute 318 as partially funded: one side funded, one only contributed to", () => {
    const [round] = build();

    expect(round?.roundIndex).toBe(0);
    expect(round?.outcome).toBe("partially-funded");
    expect(round?.sides.map((side) => [side.title, side.raisedWei, side.funded])).toEqual([
      ["No", 8_910_000_000_000_000n, true],
      ["Yes", 5_940_000_000_000_000n, false],
    ]);
    expect(round?.sides.map((side) => kinds(side.funders))).toEqual([
      ["someone-else"],
      ["Grokleros"],
    ]);
  });

  it("leaves out a side nobody raised anything for", () => {
    // Choice 0 has an answer entry with a zero fee: it was voted for, not funded.
    expect(build()[0]?.sides.map((side) => side.choice)).toEqual([1, 2]);
  });

  it("calls two or more funded sides appealed", () => {
    const appealed: DetailRound = {
      index: 0,
      sides: [
        { choice: 1, paidWei: 10n, funded: true },
        { choice: 2, paidWei: 20n, funded: true },
      ],
      contributions: [
        { contributor: UNKNOWN, choice: 1, wei: 10n },
        { contributor: GROKLEROS, choice: 2, wei: 20n },
      ],
    };

    expect(build([appealed])[0]?.outcome).toBe("appealed");
  });

  it("calls contributions that funded no side not funded", () => {
    const short: DetailRound = {
      index: 0,
      sides: [{ choice: 2, paidWei: 5n, funded: false }],
      contributions: [{ contributor: UNKNOWN, choice: 2, wei: 5n }],
    };

    expect(build([short])[0]?.outcome).toBe("not-funded");
  });

  it("groups several accounts of one class into one line, with their count and their sum", () => {
    // One side can have several funders, and several in one class: the maintainer's example of a
    // Yes side funded by more than one person.
    const crowded: DetailRound = {
      index: 0,
      sides: [{ choice: 2, paidWei: 60n, funded: true }],
      contributions: [
        { contributor: "0x4444444444444444444444444444444444444444", choice: 2, wei: 10n },
        { contributor: "0x5555555555555555555555555555555555555555", choice: 2, wei: 20n },
        { contributor: "0x4444444444444444444444444444444444444444", choice: 2, wei: 5n },
        { contributor: GROKLEROS, choice: 2, wei: 25n },
      ],
    };
    const [side] = build([crowded])[0]?.sides ?? [];

    expect(side?.funders.map(({ funder, wei, accounts }) => [funder.kind, wei, accounts])).toEqual([
      ["someone-else", 35n, 2],
      ["agent-juror", 25n, 1],
    ]);
  });

  it("names each class: an agent juror, the Kleros bot, a party, the creator, someone else", () => {
    const everyone: DetailRound = {
      index: 0,
      sides: [{ choice: 1, paidWei: 15n, funded: true }],
      contributions: [
        { contributor: GROKLEROS, choice: 1, wei: 5n },
        { contributor: KLEROS_BOT.toLowerCase(), choice: 1, wei: 4n },
        { contributor: PARTY, choice: 1, wei: 3n },
        { contributor: CREATOR, choice: 1, wei: 2n },
        { contributor: UNKNOWN, choice: 1, wei: 1n },
      ],
    };

    expect(kinds(build([everyone], { aliases: [PARTY] })[0]?.sides[0]?.funders ?? [])).toEqual([
      "Grokleros",
      "kleros-bot",
      "party",
      "creator",
      "someone-else",
    ]);
  });

  it("calls a party who created the dispute a party", () => {
    const own: DetailRound = {
      index: 0,
      sides: [{ choice: 1, paidWei: 1n, funded: false }],
      contributions: [{ contributor: CREATOR, choice: 1, wei: 1n }],
    };

    expect(kinds(build([own], { aliases: [CREATOR] })[0]?.sides[0]?.funders ?? [])).toEqual([
      "party",
    ]);
  });

  it("does not guess creator or someone else before the creator is read", () => {
    // The roster, the bot and the template's parties are known without the chain read; whether
    // an unmatched account created the dispute is not, until the creation transaction is read.
    const [round] = build(funding318, { creator: undefined });

    expect(round?.sides.map((side) => kinds(side.funders))).toEqual([["pending"], ["Grokleros"]]);
  });

  it("calls an unmatched account someone else where the creator cannot be read at all", () => {
    expect(build(funding318, { creator: null })[0]?.sides[0]?.funders[0]?.funder.kind).toBe(
      "someone-else",
    );
  });

  it("matches the creator whatever case the chain sends its address in", () => {
    const own: DetailRound = {
      index: 0,
      sides: [{ choice: 1, paidWei: 1n, funded: false }],
      contributions: [{ contributor: CREATOR, choice: 1, wei: 1n }],
    };

    expect(
      build([own], { creator: `0x${CREATOR.slice(2).toUpperCase()}` })[0]?.sides[0]?.funders[0]
        ?.funder.kind,
    ).toBe("creator");
  });

  describe("a funder with a primary ENS name", () => {
    const named: DetailRound = {
      index: 0,
      sides: [{ choice: 1, paidWei: 15n, funded: true }],
      contributions: [
        { contributor: UNKNOWN, choice: 1, wei: 5n },
        { contributor: "0x4444444444444444444444444444444444444444", choice: 1, wei: 4n },
        { contributor: "0x5555555555555555555555555555555555555555", choice: 1, wei: 3n },
        { contributor: PARTY, choice: 1, wei: 2n },
        { contributor: CREATOR, choice: 1, wei: 1n },
      ],
    };
    const ensNames = new Map([
      [UNKNOWN, "alice.eth"],
      ["0x4444444444444444444444444444444444444444", "bob.eth"],
      [PARTY, "party.eth"],
      [CREATOR, "creator.eth"],
    ]);

    it("is shown by that name, one line each, where nothing else names the account", () => {
      const [side] = build([named], { aliases: [PARTY], ensNames })[0]?.sides ?? [];

      expect(
        side?.funders.map(({ funder, wei }) => [
          funder.kind === "ens" ? funder.name : funder.kind,
          wei,
        ]),
      ).toEqual([
        ["alice.eth", 5n],
        ["bob.eth", 4n],
        ["someone-else", 3n],
        // A party and the creator keep their class: the maintainer's rule is a name only where
        // there is no alias for the account.
        ["party", 2n],
        ["creator", 1n],
      ]);
    });

    it("is not shown where it passes for an agent juror or for Kleros", () => {
      const lookalikes = new Map([
        [UNKNOWN, "grokleros.eth"],
        ["0x4444444444444444444444444444444444444444", "the-kleros-bot.eth"],
        ["0x5555555555555555555555555555555555555555", "blaise-juror.eth"],
      ]);

      expect(kinds(build([named], { ensNames: lookalikes })[0]?.sides[0]?.funders ?? [])).toEqual([
        "someone-else",
        "creator",
      ]);
    });

    it("is not shown where any label, or the labels run together, pass for one", () => {
      const lookalikes = new Map([
        [UNKNOWN, "x.grokleros.eth"],
        ["0x4444444444444444444444444444444444444444", "grok.leros.eth"],
        ["0x5555555555555555555555555555555555555555", "bot.kleros.xyz"],
      ]);

      expect(kinds(build([named], { ensNames: lookalikes })[0]?.sides[0]?.funders ?? [])).toEqual([
        "someone-else",
        "creator",
      ]);
    });

    it.each([
      ["accents folded away", "kléros.eth"],
      ["an accented nickname", "blaisé.eth"],
      ["the top-level label read too", "blai.se"],
      ["a digit for a letter", "k1eros.eth"],
      ["a letter for a digit, against a digit nickname", "oo7.eth"],
      ["a short address shape", "0xd66c.eth"],
      ["a letter the fold cannot read, beside Latin ones", "klerøs.eth"],
      ["a short nickname written inside a label", "x007.eth"],
      ["a digit for a letter the first fold missed", "6rokleros.eth"],
      ["a short nickname written after a word", "agent-007.eth"],
      ["rn for m", "colurnbo.eth"],
      ["a letter with no decomposition", "kłeros.eth"],
    ])("is not shown where it passes for one with %s", (_, name) => {
      const funders =
        build([named], { ensNames: new Map([[UNKNOWN, name]]) })[0]?.sides[0]?.funders ?? [];

      expect(funders.map(({ funder }) => funder.kind)).not.toContain("ens");
    });

    it.each(["alice.eth", "root.eth", "café.eth", "中文.eth", "blais.eth"])(
      "is shown where it resembles nothing: %s",
      (name) => {
        const funders =
          build([named], { ensNames: new Map([[UNKNOWN, name]]) })[0]?.sides[0]?.funders ?? [];

        expect(funders.map(({ funder }) => funder.kind)).toContain("ens");
      },
    );

    it("is not shown where it passes for a name the page gives an agent juror", () => {
      const funders =
        buildAppealFunding({
          funding: [named],
          answers: ANSWERS,
          aliases: [],
          roster: ROSTER,
          creator: CREATOR,
          ensNames: new Map([[UNKNOWN, "the-oracle.eth"]]),
          displayedNames: ["The Oracle"],
        })[0]?.sides[0]?.funders ?? [];

      expect(funders.map(({ funder }) => funder.kind)).not.toContain("ens");
    });

    it("is not shown where a label is shaped like an address", () => {
      const funders =
        build([named], { ensNames: new Map([[UNKNOWN, "0x9eb6a13d66fb.eth"]]) })[0]?.sides[0]
          ?.funders ?? [];

      expect(funders.map(({ funder }) => funder.kind)).not.toContain("ens");
    });

    it("is not exempt deeper under the agents parent, where a subname's holder issues names", () => {
      const funders =
        build([named], {
          ensNames: new Map([[UNKNOWN, `grokleros.blaise.${AGENT_JUROR_ENS_PARENT}`]]),
        })[0]?.sides[0]?.funders ?? [];

      expect(funders.map(({ funder }) => funder.kind)).not.toContain("ens");
    });

    it("is shown under the agents parent, which only Kleros issues", () => {
      const issued = new Map([[UNKNOWN, `grokleros.${AGENT_JUROR_ENS_PARENT}`]]);
      const funders = build([named], { ensNames: issued })[0]?.sides[0]?.funders ?? [];

      expect(funders.find(({ funder }) => funder.kind === "ens")?.funder).toEqual({
        kind: "ens",
        name: `grokleros.${AGENT_JUROR_ENS_PARENT}`,
        address: UNKNOWN,
      });
    });

    it("is not named before the creator is read, since it may be the creator", () => {
      expect(
        kinds(build([named], { creator: undefined, ensNames })[0]?.sides[0]?.funders ?? []),
      ).toEqual(["pending"]);
    });

    it("is someone else while the names are not read", () => {
      expect(kinds(build([named])[0]?.sides[0]?.funders ?? [])).toEqual([
        "someone-else",
        "creator",
      ]);
    });
  });

  it("does not guess party or someone else while the template is not read", () => {
    // The template's parties are a read of their own: until it lands, an unmatched account may be
    // one, and only the roster and the bot are known.
    const everyone: DetailRound = {
      index: 0,
      sides: [{ choice: 1, paidWei: 3n, funded: false }],
      contributions: [
        { contributor: GROKLEROS, choice: 1, wei: 2n },
        { contributor: PARTY, choice: 1, wei: 1n },
      ],
    };

    expect(
      kinds(
        buildAppealFunding({
          funding: [everyone],
          answers: ANSWERS,
          aliases: undefined,
          roster: ROSTER,
          creator: CREATOR,
        })[0]?.sides[0]?.funders ?? [],
      ),
    ).toEqual(["Grokleros", "pending"]);
  });

  it("says what a side raised beyond the contributions read, as its own line, last", () => {
    // The read bounds the contributions; the kit's sum does not, so the difference is a short read.
    const short: DetailRound = {
      index: 0,
      sides: [{ choice: 1, paidWei: 100n, funded: true }],
      contributions: [
        { contributor: GROKLEROS, choice: 1, wei: 10n },
        { contributor: UNKNOWN, choice: 1, wei: 60n },
      ],
    };
    const [side] = build([short])[0]?.sides ?? [];

    expect(side?.funders.map(({ funder, wei }) => [funder.kind, wei])).toEqual([
      ["someone-else", 60n],
      ["agent-juror", 10n],
      ["unread", 30n],
    ]);
  });

  it("adds no such line where the contributions read make up the whole sum", () => {
    expect(
      build()[0]?.sides.flatMap((side) => side.funders.map(({ funder }) => funder.kind)),
    ).not.toContain("unread");
  });

  it("keeps every round, in order, each with its own outcome", () => {
    const first: DetailRound = {
      index: 0,
      sides: [
        { choice: 1, paidWei: 1n, funded: true },
        { choice: 2, paidWei: 2n, funded: true },
      ],
      contributions: [],
    };
    const second: DetailRound = {
      index: 1,
      sides: [{ choice: 1, paidWei: 1n, funded: true }],
      contributions: [],
    };

    expect(build([first, second]).map((round) => [round.roundIndex, round.outcome])).toEqual([
      [0, "appealed"],
      [1, "partially-funded"],
    ]);
  });
});

describe("ensCandidatesOf", () => {
  it("asks for every contributor except the roster's and the Kleros bot, once, lowercased", () => {
    const rounds: DetailRound[] = [
      {
        index: 0,
        sides: [],
        contributions: [
          { contributor: UNKNOWN, choice: 1, wei: 1n },
          { contributor: GROKLEROS, choice: 1, wei: 1n },
          { contributor: KLEROS_BOT.toLowerCase(), choice: 2, wei: 1n },
          { contributor: PARTY, choice: 2, wei: 1n },
        ],
      },
      { index: 1, sides: [], contributions: [{ contributor: UNKNOWN, choice: 1, wei: 1n }] },
    ];

    expect(ensCandidatesOf(rounds, ROSTER)).toEqual([UNKNOWN, PARTY]);
  });

  it("asks for nothing where nothing was contributed", () => {
    expect(ensCandidatesOf(funding318.slice(0, 0), ROSTER)).toEqual([]);
  });
});

describe("stripFundingOf", () => {
  const rounds = build([
    {
      index: 0,
      sides: [
        { choice: 1, paidWei: 1n, funded: true },
        { choice: 2, paidWei: 1n, funded: true },
      ],
      contributions: [],
    },
    { index: 1, sides: [{ choice: 1, paidWei: 1n, funded: true }], contributions: [] },
  ]);

  it("puts the current round in the appeal lane and earlier ones before it", () => {
    const strip = stripFundingOf(rounds, { index: 1, appealOpenedAt: 10, executionOpenedAt: 20 });

    expect(strip.current?.round.roundIndex).toBe(1);
    expect(strip.current?.open).toBe(false);
    expect(strip.earlier.map((round) => [round.roundIndex, round.outcome])).toEqual([
      [0, "appealed"],
    ]);
  });

  it("says the current round's funding is still open while its appeal period runs", () => {
    expect(
      stripFundingOf(rounds, { index: 1, appealOpenedAt: 10, executionOpenedAt: null }).current
        ?.open,
    ).toBe(true);
  });

  it("has nothing for the current round where nothing was contributed to it", () => {
    expect(
      stripFundingOf(rounds.slice(0, 1), {
        index: 1,
        appealOpenedAt: null,
        executionOpenedAt: null,
      }),
    ).toEqual({
      current: null,
      earlier: rounds.slice(0, 1),
      behind: false,
    });
    expect(stripFundingOf(rounds, undefined)).toEqual({
      current: null,
      earlier: [],
      behind: false,
    });
  });

  it("carries whether the sums predate the court's view of the dispute", () => {
    expect(
      stripFundingOf(rounds, { index: 1, appealOpenedAt: 10, executionOpenedAt: 20 }, true).behind,
    ).toBe(true);
  });
});
