import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ThemeProvider } from "styled-components";
import { describe, expect, it } from "vitest";
import { ROSTER } from "../roster/agent-jurors";
import { theme } from "../styles/theme";
import type { Density } from "./density";
import { Marginals } from "./Marginals";
import type { RewardCoverage } from "./performance";
import type { AgentJurorMarginals } from "./totals";

/**
 * One agent juror's column header, on its own.
 *
 * Rendered apart from the matrix because the states worth checking are ones the captured court
 * cannot produce: a payout read that came back short, and a column never drawn. `Matrix.test.tsx` checks that the block reaches the column
 * headers at all, over the real court. The caveat marks these figures carried were removed on
 * 2026-09-24 (maintainer's ruling), and their tests with them.
 */

function marginalsOf(over: Partial<AgentJurorMarginals> = {}): AgentJurorMarginals {
  const agentJuror = ROSTER[0];
  if (agentJuror === undefined) throw new Error("The roster is not empty");

  return {
    agentJuror,
    draws: 4,
    votes: 5,
    coherence: {
      coherent: 3,
      tied: 0,
      diverged: 1,
      missed: 0,
      acting: 0,
      resolved: 4,
      lonePanelDisputes: [],
    },
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
  { payouts = PAID, density = "comfortable" }: { payouts?: RewardCoverage; density?: Density } = {},
) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <Marginals marginals={marginalsOf(over)} payouts={payouts} density={density} />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("Marginals", () => {
  it("summarises the column as its draws and what they came to", () => {
    renderMarginals();

    // The outcome breakdown as shares of the draws (2026-11-02): three coherent and one diverged
    // of four, rounded to whole percent, with the draw count beneath as the base.
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getAllByText("0%")).toHaveLength(2);
    expect(screen.queryByText("3/4")).not.toBeInTheDocument();
    // The draw count alone: the vote-ID count beside it was removed on 2026-09-24.
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("names each figure in full for a reader who cannot see the column", () => {
    renderMarginals();

    // The labels are what a 148px column has room for; a bare "Tied" read aloud does not say
    // what was tied.
    expect(
      screen.getByText(
        "Tied draws: voted in a dispute whose ruling is a tie, and paid as coherent",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Times the court drew this agent juror")).toBeInTheDocument();
  });

  it("summarises no commit or reveal latency, at either density (ADR-0010)", () => {
    // Per-draw latency is not a measure of speed, so no column reduces it to a median. The
    // cells below still carry each draw's own figures; the header ranks nothing by them.
    for (const density of ["comfortable", "compact"] as const) {
      const { unmount } = renderMarginals({}, { density });
      expect(screen.queryByText(/latency/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/^Med (com|rev)$/)).not.toBeInTheDocument();
      unmount();
    }
  });

  it("shows a dash for every figure an agent juror never drawn cannot have", () => {
    // `canvas/JurorEmpty.dc.html:66-76`. A dash means "no draws to measure"; it never means
    // zero, and it never means the read failed.
    //
    // The outcome lines and — since ticket 10 — cumulative ETH and net PNK. An agent juror the
    // court has never asked cannot have been paid, so `0.0000` there would be a measurement of
    // something that never happened. Only the draw count is a real zero, which is the next case
    // down.
    renderMarginals({
      draws: 0,
      votes: 0,
      coherence: {
        coherent: 0,
        tied: 0,
        diverged: 0,
        missed: 0,
        acting: 0,
        resolved: 0,
        lonePanelDisputes: [],
      },
      rewards: null,
    });

    // Six: the four outcome counts (ADR-0009) and the two payouts.
    expect(screen.getAllByText("—")).toHaveLength(6);
    expect(screen.queryByText("0/0")).not.toBeInTheDocument();
    expect(screen.queryByText("0.0000")).not.toBeInTheDocument();
  });

  it("shows its draw count as a real zero, because zero draws is a measurement", () => {
    renderMarginals({ draws: 0, votes: 0 });

    expect(screen.getByText("0")).toBeInTheDocument();
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
      // The gate, and the reason it has to exist for these two and not for the counts above
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
      // Ticket 13's Unknown, in the aggregate — the same words a cell's commit figure uses,
      // because it is the same thing: a read that happened and came up short.
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
    it("keeps the outcome breakdown and the draw count, and drops the payouts", () => {
      renderMarginals({}, { density: "compact" });

      for (const kept of [
        "Coherent draws: voted with a ruling that did not tie",
        "Tied draws: voted in a dispute whose ruling is a tie, and paid as coherent",
        "Diverged draws: voted against a ruling that did not tie",
        "Missed draws: the vote period closed without a vote",
        "Times the court drew this agent juror",
      ]) {
        expect(screen.getByText(kept)).toBeInTheDocument();
      }
      for (const dropped of ["Cumulative ETH earned", "Net PNK gained or lost"]) {
        expect(screen.queryByText(dropped)).not.toBeInTheDocument();
      }
    });

    it("keeps the order of the figures it keeps", () => {
      // Nothing is ranked here and nothing reorders: a compact header is the comfortable one
      // with two lines removed, never a second block that happens to agree with it.
      renderMarginals({}, { density: "compact" });

      const keys = screen
        .getAllByText(/^(Coherent|Tied|Diverged|Missed|Draws)$/)
        .map((key) => key.textContent);
      expect(keys).toEqual(["Coherent", "Tied", "Diverged", "Missed", "Draws"]);
    });
  });
});

describe("the outcome breakdown", () => {
  it("adds an acting line only while something is still being decided", () => {
    renderMarginals({
      coherence: {
        coherent: 2,
        tied: 0,
        diverged: 0,
        missed: 0,
        acting: 2,
        resolved: 2,
        lonePanelDisputes: [],
      },
    });
    expect(screen.getByText("Draws still acting: no ruling yet")).toBeInTheDocument();
  });

  it("leaves the acting line out when nothing is acting", () => {
    renderMarginals();
    expect(screen.queryByText("Draws still acting: no ruling yet")).not.toBeInTheDocument();
  });
});
