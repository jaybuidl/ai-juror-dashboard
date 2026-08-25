import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ThemeProvider } from "styled-components";
import { describe, expect, it } from "vitest";
import { ROSTER } from "../roster/agent-jurors";
import { theme } from "../styles/theme";
import { Marginals } from "./Marginals";
import type { AgentJurorMarginals, LatencySummary, WindowChange } from "./totals";
import type { PeriodWindows } from "./windows";

/**
 * One agent juror's column header, on its own.
 *
 * Rendered apart from the matrix because the states worth checking are ones the captured court
 * cannot produce: a court reconfigured twice, a commit scan that came back empty over
 * commitments the subgraph records, and a column whose only lone panel is still being decided.
 * `Matrix.test.tsx` checks that the block reaches the column headers at all, over the real court.
 */

/** What court 34 holds now: 45m commit, 30m vote. */
const CURRENT: PeriodWindows = {
  evidenceSeconds: 2700,
  commitSeconds: 2700,
  voteSeconds: 1800,
  appealSeconds: 129_600,
};

/** What it held before, and the group dispute 151 falls into: 8h commit, 8h vote. */
const EARLIER: WindowChange = {
  disputes: [151],
  windows: { commitSeconds: 28_800, voteSeconds: 28_800 },
  revealedDraws: 1,
  committedDraws: 1,
};

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
    ...over,
  };
}

function renderMarginals(over: Partial<AgentJurorMarginals> = {}, scanned = true) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <Marginals marginals={marginalsOf(over)} scanned={scanned} current={CURRENT} />
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
    // The draw and the vote ID are two things, and this court's counts differ.
    expect(screen.getByText("4 · 5v")).toBeInTheDocument();
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
    renderMarginals({
      draws: 0,
      votes: 0,
      revealLatency: null,
      commitLatency: null,
      commitments: 0,
      coherence: { coherent: 0, resolved: 0, lonePanelDisputes: [] },
    });

    expect(screen.getAllByText("—")).toHaveLength(3);
    expect(screen.queryByText("0/0")).not.toBeInTheDocument();
  });

  it("shows its draw count as a real zero, because zero draws is a measurement", () => {
    renderMarginals({ draws: 0, votes: 0, revealLatency: null, commitLatency: null });

    expect(screen.getByText("0 · 0v")).toBeInTheDocument();
  });

  it("reads a commit median that has not been scanned for as a step not reached", () => {
    // The same gate `commitFigureOf` takes. Arbitrum answers slower than the subgraph and this
    // page does not wait for it, so between the two answers every column would otherwise come
    // up rose reading "Not read" — a failure announced before it has happened.
    renderMarginals({ commitLatency: null, commitments: 4 }, false);

    expect(screen.queryByText("Not read")).not.toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("reads a commit median the scan could not fill as unknown, not as a missing commitment", () => {
    // The subgraph says these draws committed and no log was found for any of them. Wording
    // that as an em dash would report a read that came back short as an agent juror that did
    // not act — ticket 13's Unknown, in the aggregate.
    renderMarginals({ commitLatency: null, commitments: 4 }, true);

    expect(screen.getByText("Not read")).toBeInTheDocument();
  });

  it("keeps the dash where there was nothing to commit at all", () => {
    renderMarginals({ commitLatency: null, commitments: 0 }, true);

    expect(screen.queryByText("Not read")).not.toBeInTheDocument();
  });

  describe("the markers", () => {
    it("marks the coherence count where a draw behind it sat on a panel of one", () => {
      renderMarginals({
        coherence: { coherent: 4, resolved: 4, lonePanelDisputes: [155] },
      });

      // The reason names how many of the counted draws are affected, not merely that some are.
      expect(
        screen.getByText(/1 of 4 draws sat on a panel of one, where coherence is tautological/i),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /coherence count is marked/i })).toHaveAttribute(
        "href",
        "/method#caveats",
      );
    });

    it("leaves the coherence count unmarked where no panel of one is behind it", () => {
      renderMarginals();

      expect(screen.queryByText(/panel of one/i)).not.toBeInTheDocument();
    });

    it("marks both latency medians where the court changed both windows", () => {
      // Court 34 changed its commit window and its vote window at the same moment, so a column
      // drawn in dispute 151 has both of its medians measured against a window the court no
      // longer holds. Marking only one would have the page comparing and declining to compare.
      renderMarginals({ changedWindows: [EARLIER] });

      expect(
        screen.getByText(/1 of 4 draws ran under a vote window of 8h, which the court has since/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /1 of 4 draws ran under a commit window of 8h, which the court has since/i,
        ),
      ).toBeInTheDocument();
    });

    it("points each latency marker at the court's own account of the change", () => {
      renderMarginals({ changedWindows: [EARLIER] });

      for (const name of [/median reveal is marked/i, /median commit is marked/i]) {
        expect(screen.getByRole("link", { name })).toHaveAttribute("href", "/method#window");
      }
    });

    it("marks only the median the changed window actually governs", () => {
      // A court that changed its commit window and left its vote window alone. Marking the
      // reveal median would name a duration identical to the one in force — a marker that reads
      // as placed in error, which is the failure `windowFlagLabel` guards against on the row.
      renderMarginals({
        changedWindows: [
          {
            disputes: [151],
            windows: { commitSeconds: 28_800, voteSeconds: CURRENT.voteSeconds },
            revealedDraws: 1,
            committedDraws: 1,
          },
        ],
      });

      expect(screen.getByText(/ran under a commit window of 8h/i)).toBeInTheDocument();
      expect(screen.queryByText(/ran under a vote window/i)).not.toBeInTheDocument();
    });

    it("marks nothing where the column contributed no draw to the changed window", () => {
      // The marker is a claim about the draws behind *this* number. A column never drawn in
      // dispute 151 is comparable with the court as it stands.
      renderMarginals({
        changedWindows: [{ ...EARLIER, revealedDraws: 0, committedDraws: 0 }],
      });

      expect(screen.queryByText(/which the court has since changed/i)).not.toBeInTheDocument();
    });

    it("marks nothing where there is no median for a marker to ride", () => {
      renderMarginals({ revealLatency: null, commitLatency: null, changedWindows: [EARLIER] });

      expect(screen.queryByText(/which the court has since changed/i)).not.toBeInTheDocument();
    });

    it("says which agent juror each marker belongs to, since six columns carry the same words", () => {
      const nickname = ROSTER[0]?.nickname ?? "";
      renderMarginals({ changedWindows: [EARLIER] });

      const link = screen.getByRole("link", { name: /median reveal is marked/i });
      expect(link).toHaveAccessibleName(new RegExp(nickname, "i"));
    });

    it("carries each marker beside the figure it qualifies and no other", () => {
      renderMarginals({
        coherence: { coherent: 4, resolved: 4, lonePanelDisputes: [155] },
        changedWindows: [EARLIER],
      });

      // The same two glyphs the row flags and the footnotes under the matrix use, because one
      // caveat drawn two ways reads as two caveats. † rides both latencies, ‡ rides coherence
      // alone — a lone panel says nothing about how quickly an agent juror acted.
      expect(screen.getAllByText("†")).toHaveLength(2);
      expect(screen.getAllByText("‡")).toHaveLength(1);
      expect(within(screen.getByText("48s")).getByText("†")).toBeInTheDocument();
      expect(within(screen.getByText("4/4")).getByText("‡")).toBeInTheDocument();
      expect(within(screen.getByText("4/4")).queryByText("†")).toBeNull();
      // The draw count takes neither: a window changes what a duration means and changes
      // nothing about how many times the court drew this agent juror.
      expect(within(screen.getByText("4 · 5v")).queryByText("†")).toBeNull();
    });
  });
});
