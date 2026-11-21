import { render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { describe, expect, it } from "vitest";
import { theme } from "../styles/theme";
import { DISPUTE_156_CHAIN, measured, resolvedRoster } from "../test/court";
import { buildAppealFunding, stripFundingOf } from "./appeal-funding";
import detailFixture from "./dispute-156-detail.fixture.json" with { type: "json" };
import {
  buildDisputeReading,
  type DetailRound,
  type RawDisputeDetail,
  toDisputeDetail,
} from "./dispute-detail";
import { buildDisputeTimeline } from "./dispute-timeline";
import { PeriodStrip } from "./PeriodStrip";
import type { MatrixRow } from "./performance";

/**
 * The strip once a dispute has been appealed (#32): the round that was appealed must not drop out
 * of view when the next one starts. No dispute in court 34 has been appealed, so dispute 156 is
 * moved into a second round by hand, with its first round's appeal funded on two sides.
 */

const GROKLEROS = "0x93aa2f8e5ce8288d57f8785f5a40a60a42fd925e";

function appealedRow(): MatrixRow {
  const row = measured.performance?.rows.find((candidate) => candidate.dispute.id === 156);
  const [first] = row?.dispute.rounds ?? [];
  if (row === undefined || first === undefined) throw new Error("dispute 156 is not in the court");
  const second = {
    ...first,
    index: 1,
    voteOpenedAt: null,
    appealOpenedAt: null,
    executionOpenedAt: null,
  };
  return {
    ...row,
    dispute: { ...row.dispute, rounds: [first, second] },
    cells: row.cells.map((cell) => (cell === null ? null : { ...cell, roundIndex: 1 })),
  };
}

/** Round 1's appeal, both sides funded, the second by two accounts. */
const APPEALED_ROUND: DetailRound = {
  index: 0,
  sides: [
    { choice: 1, paidWei: 8_910_000_000_000_000n, funded: true },
    { choice: 2, paidWei: 11_880_000_000_000_000n, funded: true },
  ],
  contributions: [
    {
      contributor: "0x1111111111111111111111111111111111111111",
      choice: 1,
      wei: 8_910_000_000_000_000n,
    },
    { contributor: GROKLEROS, choice: 2, wei: 5_940_000_000_000_000n },
    {
      contributor: "0x4444444444444444444444444444444444444444",
      choice: 2,
      wei: 5_940_000_000_000_000n,
    },
  ],
};

function renderAppealed(
  ensNames: ReadonlyMap<string, string> = new Map(),
  round: DetailRound = APPEALED_ROUND,
  behind = false,
) {
  const roster = resolvedRoster.entries.map((entry) => entry.agentJuror);
  const reading = buildDisputeReading({
    row: appealedRow(),
    detail: toDisputeDetail(detailFixture as RawDisputeDetail),
    template: undefined,
  });
  const funding = buildAppealFunding({
    funding: [round],
    answers: [],
    aliases: [],
    roster,
    creator: null,
    ensNames,
  });

  return render(
    <ThemeProvider theme={theme}>
      <PeriodStrip
        reading={reading}
        timeline={buildDisputeTimeline({
          reading,
          roster,
          chain: DISPUTE_156_CHAIN,
          answered: true,
        })}
        roster={resolvedRoster}
        funding={stripFundingOf(funding, reading.round, behind)}
      />
    </ThemeProvider>,
  );
}

describe("an appealed round, once the next round has started", () => {
  it("keeps the appealed round's funding in view, at the head of the new round's evidence", () => {
    renderAppealed();
    const list = screen.getByRole("list", { name: /round 1 · appealed/i });

    expect(
      within(list)
        .getAllByRole("listitem")
        .map((item) => item.textContent?.replace(/\s+/g, " ").trim()),
    ).toEqual([
      // No template, so each side is "Choice N": a lone number would read as a count.
      "Choice 1 funded 0.0089 ETH0x1111…1111",
      // Compact: funders on one line, no amount each.
      "Choice 2 funded 0.0119 ETHGrokleros, 0x4444…4444",
    ]);
  });

  it("names a funder by its ENS name where nothing else does", () => {
    renderAppealed(new Map([["0x1111111111111111111111111111111111111111", "alice.eth"]]));
    const list = screen.getByRole("list", { name: /round 1 · appealed/i });

    expect(within(list).getAllByRole("listitem")[0]?.textContent).toContain("alice.eth");
    expect(list.textContent).not.toContain("0x1111");
  });

  it("heads it appealed on the court's word, even where its sums predate the appeal", () => {
    // Read before the second side was funded: one side funded in these sums, and yet round 2
    // exists, so the round was appealed. The head never contradicts the round below it.
    renderAppealed(new Map(), {
      index: 0,
      sides: [{ choice: 1, paidWei: 8_910_000_000_000_000n, funded: true }],
      contributions: [
        {
          contributor: "0x1111111111111111111111111111111111111111",
          choice: 1,
          wei: 8_910_000_000_000_000n,
        },
      ],
    });

    expect(screen.getByRole("list", { name: "Round 1 · appealed" })).toBeInTheDocument();
  });

  it("says it is as last read while the read predates the court's view of the dispute", () => {
    renderAppealed(new Map(), APPEALED_ROUND, true);

    expect(
      screen.getByRole("list", { name: "Round 1 · appealed · funding as last read" }),
    ).toBeInTheDocument();
  });

  it("marks a sum short of its fee by less than the last decimal place as below it", () => {
    renderAppealed(new Map(), {
      index: 0,
      tied: true,
      sides: [
        { choice: 1, paidWei: 8_910_000_000_000_000n, funded: true },
        { choice: 2, paidWei: 8_909_990_000_000_000n, funded: false },
      ],
      contributions: [],
    });
    const list = screen.getByRole("list", { name: /round 1 · appealed/i });

    expect(within(list).getAllByRole("listitem")[1]?.textContent).toContain("<0.0089 of 0.0089");
  });

  it("says what a side raised beyond the contributions read", () => {
    renderAppealed(new Map(), {
      index: 0,
      sides: [{ choice: 1, paidWei: 8_910_000_000_000_000n, funded: true }],
      contributions: [{ contributor: GROKLEROS, choice: 1, wei: 2_000_000_000_000_000n }],
    });
    const list = screen.getByRole("list", { name: /round 1 · appealed/i });

    expect(within(list).getAllByRole("listitem")[0]?.textContent).toContain(
      "Grokleros, others not read",
    );
  });

  it("puts it in the evidence period's slot, which the appeal opened", () => {
    renderAppealed();
    const evidence = screen.getByText("Evidence").closest("li");
    if (evidence === null) throw new Error("no evidence slot");

    expect(within(evidence).getByRole("list", { name: /round 1 · appealed/i })).toBeInTheDocument();
  });
});
