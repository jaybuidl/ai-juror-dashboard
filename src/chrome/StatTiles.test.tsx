import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ThemeProvider } from "styled-components";
import { describe, expect, it } from "vitest";
import type { CourtTotals } from "../performance/totals";
import type { PeriodWindows } from "../performance/windows";
import { theme } from "../styles/theme";
import { StatTiles } from "./StatTiles";

/**
 * The four court-wide figures, and the one marker one of them carries.
 *
 * Hand-built totals rather than the captured court, because the case worth pinning is one court
 * 34 cannot produce: it changed its commit window and its vote window in the same
 * `CourtModified`, so every superseded group differs in both and the marker is correct however
 * it is placed. A court that changes one of them is where placing it wrongly starts to show, and
 * `MatrixPage.test.tsx` covers the real court through the real page.
 */

/** What the court holds now: the 2026-08-26 configuration, evidence 10m. */
const CURRENT: PeriodWindows = {
  evidenceSeconds: 600,
  commitSeconds: 2700,
  voteSeconds: 1800,
  appealSeconds: 129_600,
};

function totalsOf(changedWindows: CourtTotals["changedWindows"]): CourtTotals {
  return {
    disputes: 16,
    finalised: 13,
    live: 3,
    draws: 44,
    votes: 61,
    agentJurorsDrawn: 5,
    agentJurors: 6,
    revealLatency: { seconds: [7, 85, 86, 552], fastest: 7, median: 85, slowest: 552 },
    lonePanelDisputes: [],
    changedWindows,
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

function renderTiles(
  changedWindows: CourtTotals["changedWindows"],
  current: PeriodWindows | null = CURRENT,
) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <StatTiles totals={totalsOf(changedWindows)} current={current} />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("StatTiles", () => {
  it("marks the median reveal when its own window is one the court has changed", () => {
    renderTiles([
      {
        disputes: [151],
        windows: { commitSeconds: 28_800, voteSeconds: 28_800 },
        revealedDraws: 2,
        committedDraws: 2,
      },
    ]);

    // On the mark, not under the figure. The reason left the page as a paragraph — four tiles
    // in a row and only ever one of them marked gave the row no common baseline, and it put
    // prose above the first figure anyone came to read — so the dagger carries it, as the
    // marginals' marks have since ticket 17. It was aria-hidden before, so the paragraph was
    // the caveat's only voice and deleting it alone would have deleted the caveat.
    expect(screen.getByRole("link", { name: /median reveal is marked/i })).toHaveAccessibleName(
      /2 of 4 draws ran under a vote window of 8h, which the court has since/i,
    );
  });

  it("leaves it unmarked when only a window it is not measured from changed", () => {
    // The court moves its commit window and leaves its vote window alone. Every dispute before
    // the change is superseded, and none of it says anything about a *reveal* median — which is
    // measured from the vote period. Marking on group membership alone would print "ran under a
    // vote window of 30m, which the court has since changed" against a court whose vote window
    // is 30m: a marker a reader can see is placed in error, which teaches them to ignore the
    // ones that are not. The matrix's column headers make the same comparison, so this is also
    // what stops the tile and the six figures below it marking different things.
    renderTiles([
      {
        disputes: [151],
        windows: { commitSeconds: 28_800, voteSeconds: CURRENT.voteSeconds },
        revealedDraws: 2,
        committedDraws: 2,
      },
    ]);

    expect(screen.queryByText(/ran under a vote window/i)).not.toBeInTheDocument();
  });

  it("marks it while the parameter history is unread, having nothing to compare against", () => {
    // `current` is null before the history comes back, and everything qualifies. That is the
    // honest reading: the page cannot yet say a window matches, and it says elsewhere that the
    // history is still being read.
    renderTiles(
      [
        {
          disputes: [151],
          windows: { commitSeconds: 28_800, voteSeconds: 28_800 },
          revealedDraws: 2,
          committedDraws: 2,
        },
      ],
      null,
    );

    expect(screen.getByRole("link", { name: /median reveal is marked/i })).toHaveAccessibleName(
      /ran under a vote window of 8h/i,
    );
  });

  it("marks nothing when no dispute ran under a superseded window", () => {
    renderTiles([]);

    expect(screen.queryByRole("link", { name: /median reveal is marked/i })).toBeNull();
    expect(screen.queryByText(/which the court has since changed/i)).not.toBeInTheDocument();
  });

  it("leaves the counting tiles unmarked, because a window changes no count", () => {
    renderTiles([
      {
        disputes: [151],
        windows: { commitSeconds: 28_800, voteSeconds: 28_800 },
        revealedDraws: 2,
        committedDraws: 2,
      },
    ]);

    // One marker above the matrix. A window changes what a duration means and changes nothing
    // about how many disputes, draws or agent jurors there were.
    expect(screen.getAllByText("†")).toHaveLength(1);
  });
});
