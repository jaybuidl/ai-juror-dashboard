import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ThemeProvider } from "styled-components";
import { describe, expect, it } from "vitest";
import type { CourtTotals, TimeToAppeal } from "../performance/totals";
import type { PeriodWindows } from "../performance/windows";
import { theme } from "../styles/theme";
import { StatTiles } from "./StatTiles";

/**
 * The four court-wide figures. (The marker the median time to appeal carried was removed on
 * 2026-09-24, maintainer's ruling.)
 *
 * Hand-built totals rather than the captured court. `MatrixPage.test.tsx` covers the real court
 * through the real page.
 */

/** What the court holds now: the 2026-08-26 configuration, evidence 10m. */
const CURRENT: PeriodWindows = {
  evidenceSeconds: 600,
  commitSeconds: 2700,
  voteSeconds: 1800,
  appealSeconds: 129_600,
};

function timeToAppealOf(
  windows: readonly (PeriodWindows | null)[],
  notYetAtAppeal: readonly number[] = [],
): TimeToAppeal {
  const seconds = [5400, 6000, 6600, 90_000].slice(0, windows.length);
  return {
    summary:
      windows.length === 0
        ? null
        : {
            seconds,
            fastest: seconds[0] ?? 0,
            median: seconds[Math.ceil(seconds.length / 2) - 1] ?? 0,
            slowest: seconds[seconds.length - 1] ?? 0,
          },
    disputes: windows.map((ran, index) => ({
      dispute: 151 + index,
      seconds: seconds[index] ?? 0,
      windows: ran,
    })),
    notYetAtAppeal,
  };
}

function totalsOf(timeToAppeal: TimeToAppeal): CourtTotals {
  return {
    disputes: 16,
    finalised: 13,
    live: 3,
    draws: 44,
    votes: 61,
    agentJurorsDrawn: 5,
    agentJurors: 6,
    revealLatency: { seconds: [7, 85, 86, 552], fastest: 7, median: 85, slowest: 552 },
    timeToAppeal,
    lonePanelDisputes: [],
    changedWindows: [],
    unplacedDisputes: [],
    unreadDisputes: [],
    // Nor this one, and for the same reason: the off-roster count is a footnote's, not a tile's.
    offRoster: { draws: 0, disputes: [] },
    // Not a figure any tile prints — the sparsity note quotes it, on the matrix and on the
    // phone's card list. Present because `CourtTotals` is one object and a tile takes all of it.
    sparsity: {
      disputes: 16,
      positions: 96,
      blank: 52,
      emptyColumns: 1,
      undrawnDisputes: [],
      undrawnPositions: 0,
    },
  };
}

function renderTiles(timeToAppeal: TimeToAppeal) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <StatTiles totals={totalsOf(timeToAppeal)} />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("StatTiles", () => {
  it("leads with the median time to appeal, in minutes", () => {
    renderTiles(timeToAppealOf([CURRENT, CURRENT, CURRENT, CURRENT]));

    // 6000s, the lower middle of four.
    expect(screen.getByText("100m")).toBeInTheDocument();
    expect(screen.getByText("Median to appeal")).toBeInTheDocument();
    expect(screen.queryByText(/median reveal/i)).not.toBeInTheDocument();
  });

  it("says no dispute has reached appeal rather than printing a zero", () => {
    renderTiles(timeToAppealOf([], [170]));

    expect(
      screen.getByText("Median to appeal · no dispute has reached appeal"),
    ).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
