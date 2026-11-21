import { describe, expect, it } from "vitest";
import type { DisputeRound } from "../disputes/disputes";
import { AGENT_JUROR_ENS_PARENT, ROSTER } from "../roster/agent-jurors";
import {
  type AppealFeeReading,
  appealFeesOf,
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

const WINDOWS = {
  evidenceSeconds: 600,
  commitSeconds: 2_700,
  voteSeconds: 1_800,
  appealSeconds: 129_600,
};

/** Court 34's fee, held throughout round 0's appeal: what every test prices against by default. */
const STEADY: ReadonlyMap<number, AppealFeeReading> = new Map([
  [0, { kind: "steady", fee: { feeForJuror: "270000000000000", jurorsForCourtJump: "7" } }],
]);

function build(
  funding: readonly DetailRound[] = funding318,
  overrides: {
    aliases?: readonly string[];
    creator?: string | null | undefined;
    ensNames?: ReadonlyMap<string, string>;
    fees?: ReadonlyMap<number, AppealFeeReading>;
  } = {},
): readonly RoundFunding[] {
  return buildAppealFunding({
    funding,
    answers: ANSWERS,
    aliases: overrides.aliases ?? [],
    roster: ROSTER,
    creator: "creator" in overrides ? overrides.creator : CREATOR,
    ensNames: overrides.ensNames,
    fees: overrides.fees ?? STEADY,
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
    expect(round?.sides.map((side) => kinds(side.funders))).toEqual([["account"], ["Grokleros"]]);
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

  it("gives each account its own line, with what it gave in all", () => {
    // One side can have several funders: the maintainer's example of a Yes side funded by more
    // than one person. Each is its own account, linked on the page, so none is folded into a count.
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

    expect(
      side?.funders.map(({ funder, wei }) => [
        funder.kind === "account" ? funder.address : funder.kind,
        wei,
      ]),
    ).toEqual([
      ["agent-juror", 25n],
      ["0x5555555555555555555555555555555555555555", 20n],
      ["0x4444444444444444444444444444444444444444", 15n],
    ]);
  });

  it("names each class: an agent juror, the Kleros bot, a party, the creator, an account", () => {
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
      "account",
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

  it("does not guess creator or a bare account before the creator is read", () => {
    // The roster, the bot and the template's parties are known without the chain read; whether
    // an unmatched account created the dispute is not, until the creation transaction is read.
    const [round] = build(funding318, { creator: undefined });

    expect(round?.sides.map((side) => kinds(side.funders))).toEqual([["pending"], ["Grokleros"]]);
  });

  it("shows an unmatched account as itself where the creator cannot be read at all", () => {
    expect(build(funding318, { creator: null })[0]?.sides[0]?.funders[0]?.funder.kind).toBe(
      "account",
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
        ["account", 3n],
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
        "account",
        "account",
        "account",
        "account",
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
        "account",
        "account",
        "account",
        "account",
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

    it("is shown as its account while the names are not read", () => {
      expect(kinds(build([named])[0]?.sides[0]?.funders ?? [])).toEqual([
        "account",
        "account",
        "account",
        "account",
        "creator",
      ]);
    });
  });

  it("does not guess party or a bare account while the template is not read", () => {
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
      ["account", 60n],
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

describe("what each side needed to be funded", () => {
  const sideNeeds = (rounds: readonly RoundFunding[]) =>
    rounds[0]?.sides.map((side) => [side.choice, side.requiredWei]);

  it("asks No and Yes of a tied round for the loser's fee: dispute 318's Yes fell short", () => {
    // 2 for Refuse, 2 for Yes, 1 for No: tied, so the kit's ruling was Refuse, and No and Yes each
    // needed three times the 0.00297 ETH appeal cost. No raised it; Grokleros gave Yes 0.00594.
    expect(sideNeeds(build())).toEqual([
      [1, 8_910_000_000_000_000n],
      [2, 8_910_000_000_000_000n],
    ]);
  });

  it("asks the side the vote favoured for the winner's fee, worked out from a funded side", () => {
    const decided: DetailRound = {
      index: 0,
      tied: false,
      winningChoice: 2,
      nbVotes: 5,
      sides: [
        { choice: 1, paidWei: 8_910_000_000_000_000n, funded: true },
        { choice: 2, paidWei: 1_000_000_000_000_000n, funded: false },
      ],
      contributions: [],
    };

    expect(sideNeeds(build([decided]))).toEqual([
      [1, 8_910_000_000_000_000n],
      [2, 5_940_000_000_000_000n],
    ]);
  });

  it("works it out from the court's fee where no side was funded", () => {
    const short: DetailRound = {
      index: 0,
      tied: false,
      winningChoice: 1,
      nbVotes: 5,
      sides: [{ choice: 2, paidWei: 1n, funded: false }],
      contributions: [],
    };
    const fees = new Map([
      [
        0,
        {
          kind: "steady" as const,
          fee: { feeForJuror: "270000000000000", jurorsForCourtJump: "511" },
        },
      ],
    ]);

    expect(
      sideNeeds(
        buildAppealFunding({
          funding: [short],
          answers: ANSWERS,
          aliases: [],
          roster: ROSTER,
          creator: CREATOR,
          fees,
        }),
      ),
    ).toEqual([[2, 8_910_000_000_000_000n]]);
  });

  it("asks Refuse for the winner's fee in a tie, since a tied ruling is 0", () => {
    // The kit's currentRuling is `tied ? 0 : winningChoice`, whatever winningChoice says.
    const refused: DetailRound = {
      index: 0,
      tied: true,
      winningChoice: 2,
      nbVotes: 5,
      sides: [
        { choice: 0, paidWei: 5_940_000_000_000_000n, funded: true },
        { choice: 1, paidWei: 1_000_000_000_000_000n, funded: false },
      ],
      contributions: [],
    };

    expect(sideNeeds(build([refused]))).toEqual([
      [0, 5_940_000_000_000_000n],
      [1, 8_910_000_000_000_000n],
    ]);
  });

  it("does not say where the appeal would leave the court, whose parent's fee is not read", () => {
    const jumping: DetailRound = {
      index: 0,
      tied: true,
      nbVotes: 511,
      sides: [{ choice: 2, paidWei: 1n, funded: false }],
      contributions: [],
    };
    const fees = new Map([
      [
        0,
        {
          kind: "steady" as const,
          fee: { feeForJuror: "270000000000000", jurorsForCourtJump: "511" },
        },
      ],
    ]);

    expect(
      sideNeeds(
        buildAppealFunding({
          funding: [jumping],
          answers: ANSWERS,
          aliases: [],
          roster: ROSTER,
          creator: CREATOR,
          fees,
        }),
      ),
    ).toEqual([[2, null]]);
  });

  it("prices an open appeal by the current fee, not a side funded before the court changed", () => {
    const funded: DetailRound = {
      index: 0,
      tied: true,
      nbVotes: 5,
      sides: [
        { choice: 1, paidWei: 8_910_000_000_000_000n, funded: true },
        { choice: 2, paidWei: 1n, funded: false },
      ],
      contributions: [],
    };
    const fees = new Map([
      [
        0,
        {
          kind: "changed" as const,
          fee: { feeForJuror: "540000000000000", jurorsForCourtJump: "7" },
        },
      ],
    ]);

    expect(
      sideNeeds(
        buildAppealFunding({
          funding: [funded],
          answers: ANSWERS,
          aliases: [],
          roster: ROSTER,
          creator: CREATOR,
          fees,
        }),
      ),
    ).toEqual([
      [1, 17_820_000_000_000_000n],
      [2, 17_820_000_000_000_000n],
    ]);
  });

  it("says nothing for a closed appeal the court was reconfigured during", () => {
    expect(
      sideNeeds(
        buildAppealFunding({
          funding: funding318,
          answers: ANSWERS,
          aliases: [],
          roster: ROSTER,
          creator: CREATOR,
          fees: new Map([[0, { kind: "unknown" as const }]]),
        }),
      ),
    ).toEqual([
      [1, null],
      [2, null],
    ]);
  });

  it("does not say with no history read, even where a side was funded", () => {
    // Without the history nothing says the fee held still across the appeal.
    expect(sideNeeds(build(funding318, { fees: new Map() }))).toEqual([
      [1, null],
      [2, null],
    ]);
  });

  it("does not say where the appeal moves to the parent court, whose fee is not read", () => {
    const [round] = funding318;
    if (round === undefined) throw new Error("no round");

    expect(sideNeeds(build([{ ...round, nbVotes: 7 }]))).toEqual([
      [1, null],
      [2, null],
    ]);
  });

  it("does not say where the round's tie or winner was not read", () => {
    const unread: DetailRound = {
      index: 0,
      sides: [{ choice: 1, paidWei: 8_910_000_000_000_000n, funded: true }],
      contributions: [],
    };

    expect(sideNeeds(build([unread]))).toEqual([[1, null]]);
  });

  it("does not trust a funded side whose sum no appeal cost would give", () => {
    const odd: DetailRound = {
      index: 0,
      tied: true,
      sides: [
        { choice: 1, paidWei: 10n, funded: true },
        { choice: 2, paidWei: 1n, funded: false },
      ],
      contributions: [],
    };

    expect(sideNeeds(build([odd]))).toEqual([
      [1, null],
      [2, null],
    ]);
  });
});

describe("appealFeesOf", () => {
  const REWARDS = {
    minStake: "11000000000000000000000",
    alpha: "170",
    feeForJuror: "270000000000000",
    jurorsForCourtJump: "7",
  };
  const RAISED = { ...REWARDS, feeForJuror: "540000000000000" };
  // A 50-second appeal window, so a window and a reconfiguration fit in small numbers.
  const SHORT = { ...WINDOWS, appealSeconds: 50 };
  const regimes = [
    { from: 100, windows: SHORT, rewards: REWARDS },
    { from: 300, windows: SHORT, rewards: RAISED },
  ];
  const round = (overrides: Partial<DisputeRound>): DisputeRound => ({
    index: 0,
    commitOpenedAt: null,
    voteOpenedAt: null,
    appealOpenedAt: null,
    executionOpenedAt: null,
    ...overrides,
  });

  it("prices an appeal by the fee it ran under throughout", () => {
    expect(
      appealFeesOf([round({ appealOpenedAt: 150, executionOpenedAt: 210 })], 0, regimes).get(0),
    ).toEqual({ kind: "steady", fee: REWARDS });
  });

  it("does not count a change after the appeal window closed", () => {
    // Opened at 150, so the window closed at 200: the change at 300 priced nothing.
    expect(appealFeesOf([round({ appealOpenedAt: 150 })], 0, regimes).get(0)).toEqual({
      kind: "steady",
      fee: REWARDS,
    });
  });

  it("does not count a change that moved a window and not the fee", () => {
    const windowOnly = [
      { from: 100, windows: SHORT, rewards: REWARDS },
      { from: 280, windows: { ...SHORT, commitSeconds: 1 }, rewards: REWARDS },
    ];

    expect(appealFeesOf([round({ appealOpenedAt: 270 })], 0, windowOnly).get(0)).toEqual({
      kind: "steady",
      fee: REWARDS,
    });
  });

  it("prices no closed appeal whose fee moved during its window", () => {
    expect(
      appealFeesOf([round({ appealOpenedAt: 280, executionOpenedAt: 340 })], 0, regimes).get(0),
    ).toEqual({ kind: "unknown" });
  });

  it("prices the current appeal by the last fee set in its window, where it moved", () => {
    expect(appealFeesOf([round({ appealOpenedAt: 280 })], 0, regimes).get(0)).toEqual({
      kind: "changed",
      fee: RAISED,
    });
  });

  it("prices an earlier round whose fee moved not at all", () => {
    const fees = appealFeesOf(
      [round({ index: 0, appealOpenedAt: 280 }), round({ index: 1, appealOpenedAt: 400 })],
      1,
      regimes,
    );

    expect(fees.get(0)).toEqual({ kind: "unknown" });
    expect(fees.get(1)).toEqual({ kind: "steady", fee: RAISED });
  });

  it("prices nothing where the appeal never opened, before the history, or with none read", () => {
    expect(appealFeesOf([round({})], 0, regimes).size).toBe(0);
    expect(appealFeesOf([round({ appealOpenedAt: 50 })], 0, regimes).size).toBe(0);
    expect(appealFeesOf([round({ appealOpenedAt: 150 })], 0, []).size).toBe(0);
  });
});

describe("the read's own round facts", () => {
  it("carries 318's tie, winning choice and vote count as the subgraph gave them", () => {
    const [round] = funding318;

    expect([round?.tied, round?.winningChoice, round?.nbVotes]).toEqual([true, 2, 5]);
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
