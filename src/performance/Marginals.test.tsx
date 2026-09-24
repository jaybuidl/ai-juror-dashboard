import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ThemeProvider } from "styled-components";
import { describe, expect, it } from "vitest";
import { ROSTER } from "../roster/agent-jurors";
import { theme } from "../styles/theme";
import type { Density } from "./density";
import { Marginals } from "./Marginals";
import type { RewardCoverage } from "./performance";
import type { AgentJurorMarginals, LatencySummary } from "./totals";

/**
 * One agent juror's column header, on its own.
 *
 * Rendered apart from the matrix because the states worth checking are ones the captured court
 * cannot produce: a commit scan that came back empty over commitments the subgraph records, and a
 * payout read that came back short. `Matrix.test.tsx` checks that the block reaches the column
 * headers at all, over the real court. The caveat marks these figures carried were removed on
 * 2026-09-24 (maintainer's ruling), and their tests with them.
 */

function summary(seconds: number[]): LatencySummary {
  const ascending = [...seconds].sort((a, b) => a - b);
  return {
    seconds: ascending,
    fastest: ascending[0] ?? 0,
    median: ascending[Math.ceil(ascending.length / 2) - 1] ?? 0,
    slowest: ascending[ascending.length - 1] ?? 0,
  };
}

function marginalsOf(over: Partial<AgentJurorMarginals> = {}): AgentJurorMarginals {
  const agentJuror = ROSTER[0];
  if (agentJuror === undefined) throw new Error("The roster is not empty");

  return {
    agentJuror,
    draws: 4,
    votes: 5,
    revealLatency: summary([40, 48, 60, 90]),
    commitLatency: summary([100, 259, 300, 900]),
    commitments: 4,
    coherence: { coherent: 3, resolved: 4, lonePanelDisputes: [] },
    changedWindows: [],
    rewards: {
      ethWei: 1080000000000000n,
      pnkWei: 218166666666666666666n,
      paidDraws: 4,
      feeTokenDraws: 0,
    },
    ...over,
  };
}

/** A whole read of a court that has paid out, which is what most of these cases assume. */
const PAID: RewardCoverage = { read: true, paidDraws: 4, feeTokenDraws: 0, short: false };

function renderMarginals(
  over: Partial<AgentJurorMarginals> = {},
  {
    scanned = true,
    payouts = PAID,
    density = "comfortable",
  }: { scanned?: boolean; payouts?: RewardCoverage; density?: Density } = {},
) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <Marginals
          marginals={marginalsOf(over)}
          scanned={scanned}
          payouts={payouts}
          density={density}
        />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("Marginals", () => {
  it("summarises the column in the four figures this ticket fills", () => {
    renderMarginals();

    expect(screen.getByText("48s")).toBeInTheDocument();
    expect(screen.getByText("4m 19s")).toBeInTheDocument();
    // A count and never a rate: "75%" hides that one draw moves it twenty-five points.
    expect(screen.getByText("3/4")).toBeInTheDocument();
    // The draw count alone: the vote-ID count beside it was removed on 2026-09-24.
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("names each figure in full for a reader who cannot see the column", () => {
    renderMarginals();

    // The abbreviations are what a 148px column has room for; "MED REV" read aloud is not a
    // measure of anything.
    expect(screen.getByText("Median reveal latency")).toBeInTheDocument();
    expect(screen.getByText("Median commit latency")).toBeInTheDocument();
  });

  it("shows a dash for every figure an agent juror never drawn cannot have", () => {
    // `canvas/JurorEmpty.dc.html:66-76`. A dash means "no draws to measure"; it never means
    // zero, and it never means the read failed.
    //
    // Five of the six now: the two reveal and commit medians, the coherence count, and — since
    // ticket 10 — cumulative ETH and net PNK. An agent juror the court has never asked cannot
    // have been paid, so `0.0000` there would be a measurement of something that never happened.
    // Only the draw count is a real zero, which is the next case down.
    renderMarginals({
      draws: 0,
      votes: 0,
      revealLatency: null,
      commitLatency: null,
      commitments: 0,
      coherence: { coherent: 0, resolved: 0, lonePanelDisputes: [] },
      rewards: null,
    });

    expect(screen.getAllByText("—")).toHaveLength(5);
    expect(screen.queryByText("0/0")).not.toBeInTheDocument();
    expect(screen.queryByText("0.0000")).not.toBeInTheDocument();
  });

  it("shows its draw count as a real zero, because zero draws is a measurement", () => {
    renderMarginals({ draws: 0, votes: 0, revealLatency: null, commitLatency: null });

    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("reads a commit median that has not been scanned for as a step not reached", () => {
    // The same gate `commitFigureOf` takes. Arbitrum answers slower than the subgraph and this
    // page does not wait for it, so between the two answers every column would otherwise come
    // up rose reading "Not read" — a failure announced before it has happened.
    renderMarginals({ commitLatency: null, commitments: 4 }, { scanned: false });

    expect(screen.queryByText("Not read")).not.toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("reads a commit median the scan could not fill as unknown, not as a missing commitment", () => {
    // The subgraph says these draws committed and no log was found for any of them. Wording
    // that as an em dash would report a read that came back short as an agent juror that did
    // not act — ticket 13's Unknown, in the aggregate.
    renderMarginals({ commitLatency: null, commitments: 4 }, { scanned: true });

    expect(screen.getByText("Not read")).toBeInTheDocument();
  });

  it("keeps the dash where there was nothing to commit at all", () => {
    renderMarginals({ commitLatency: null, commitments: 0 }, { scanned: true });

    expect(screen.queryByText("Not read")).not.toBeInTheDocument();
  });

  describe("what the column has been paid", () => {
    it("reads ETH to four places and PNK to two, with the sign in the value", () => {
      renderMarginals();

      // The precisions the ticket sets and `canvas/Main.dc.html:150-151` draws. They differ
      // because the quantities do: a coherent vote ID in court 34 pays 0.00027 ETH and puts
      // 187 whole PNK at risk.
      expect(screen.getByText("0.0011")).toBeInTheDocument();
      expect(screen.getByText("+218.17")).toBeInTheDocument();
    });

    it("names both figures in full for a reader who cannot see the column", () => {
      renderMarginals();

      expect(screen.getByText("Cumulative ETH earned")).toBeInTheDocument();
      expect(screen.getByText("Net PNK gained or lost")).toBeInTheDocument();
    });

    it("carries a loss in the value itself and not only in its colour", () => {
      // ADR-0006, which the ticket cites directly. The artboard inks a net loss amber; the
      // minus sign is what makes it survive greyscale, a 60% zoom, and a reader who cannot
      // separate amber from body ink. Colour is the second signal, never the only one.
      renderMarginals({
        rewards: {
          ethWei: 0n,
          pnkWei: -561_000_000_000_000_000_000n,
          paidDraws: 4,
          feeTokenDraws: 0,
        },
      });

      expect(screen.getByText("-561.00")).toBeInTheDocument();
    });

    it("shows a real zero for an agent juror drawn and paid nothing", () => {
      // The ticket's own distinction: "a zero is a measurement and a dash is the absence of
      // one". This column has been drawn and the court has executed nothing it was drawn in,
      // which is a fact about the court rather than a gap in the read.
      renderMarginals({ draws: 4, rewards: null });

      expect(screen.getByText("0.0000")).toBeInTheDocument();
      expect(screen.getByText("0.00")).toBeInTheDocument();
    });

    it("gives a zero no sign, because zero is neither a gain nor a loss", () => {
      renderMarginals({ draws: 4, rewards: null });

      expect(screen.queryByText("+0.00")).not.toBeInTheDocument();
      expect(screen.queryByText("-0.00")).not.toBeInTheDocument();
    });

    it("says nothing at all before the payouts have been read", () => {
      // The gate, and the reason it has to exist for these two and not for the medians beside
      // them. `read` is false while the subgraph is being asked *and* after it refused — the
      // fourth recurrence of that trap in `CLAUDE.md` — so a figure keyed on the data alone
      // would print `0.0000` for the length of every cold load and then correct itself. A
      // caveat that comes and goes teaches a reader to ignore caveats.
      renderMarginals({ draws: 4 }, { payouts: { ...PAID, read: false } });

      expect(screen.queryByText("0.0000")).not.toBeInTheDocument();
      expect(screen.queryByText("+218.17")).not.toBeInTheDocument();
      expect(screen.queryByText("Not read")).not.toBeInTheDocument();
    });

    it("reads a payout that came back short as unknown, not as a zero", () => {
      // The case a `read` flag alone cannot catch, and the one that would put a false economic
      // claim about named agents on a public page: a reindexing Goldsky answers HTTP 200 with
      // `[]`, so the read *succeeded* and paid nothing. Rendering `0.0000` there states that
      // this agent juror earned nothing across every dispute it was drawn in.
      renderMarginals({ draws: 4, rewards: null }, { payouts: { ...PAID, short: true } });

      expect(screen.queryByText("0.0000")).not.toBeInTheDocument();
      expect(screen.queryByText("0.00")).not.toBeInTheDocument();
      // Ticket 13's Unknown, in the aggregate — the same words the commit median uses one gate
      // up, because it is the same thing: a read that happened and came up short.
      expect(screen.getAllByText("Not read")).toHaveLength(2);
    });

    it("keeps the never-drawn dash under a short read, since there was nothing to read", () => {
      // Order matters between the two gates. baskerville has no draws, so no payout of its own
      // could have come back short — "Not read" there would attribute a failed read to a column
      // that never had anything in it.
      renderMarginals({ draws: 0, votes: 0, rewards: null }, { payouts: { ...PAID, short: true } });

      expect(screen.queryByText("Not read")).not.toBeInTheDocument();
    });
  });

  /**
   * The block ticket 17 reduces, checked here rather than only through a rendered matrix: what
   * survives is a property of this list and its flags, not of the grid around it.
   */
  describe("the compact density", () => {
    it("keeps four of the six figures and drops two", () => {
      renderMarginals({}, { density: "compact" });

      for (const kept of [
        "Median commit latency",
        "Median reveal latency",
        "Coherent draws, of the draws the court has ruled on",
        "Times the court drew this agent juror",
      ]) {
        expect(screen.getByText(kept)).toBeInTheDocument();
      }
      for (const dropped of ["Cumulative ETH earned", "Net PNK gained or lost"]) {
        expect(screen.queryByText(dropped)).not.toBeInTheDocument();
      }
    });

    it("keeps the order of the four it keeps", () => {
      // Nothing is ranked here and nothing reorders: a compact header is the comfortable one
      // with two lines removed, never a second block that happens to agree with it.
      renderMarginals({}, { density: "compact" });

      const keys = screen
        .getAllByText(/^(Med com|Med rev|Coherent|Draws)$/)
        .map((key) => key.textContent);
      expect(keys).toEqual(["Med com", "Med rev", "Coherent", "Draws"]);
    });
  });
});
