import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ThemeProvider } from "styled-components";
import { describe, expect, it, vi } from "vitest";
import disputeFixture from "../disputes/court-34.fixture.json" with { type: "json" };
import type { DisputeRowSlots } from "../disputes/DisputeList";
import type { Dispute, RawDispute } from "../disputes/disputes";
import { ROSTER } from "../roster/agent-jurors";
import { rosterIdentity } from "../roster/ens";
import type { RosterView } from "../roster/useRoster";
import { VisuallyHidden } from "../styles/hidden";
import { theme } from "../styles/theme";
import { padCourt } from "../test/court";
import { stubViewportWidth } from "../test/viewport";
import commitFixture from "./court-34-commits.fixture.json" with { type: "json" };
import drawFixture from "./court-34-draws.fixture.json" with { type: "json" };
import parameterFixture from "./court-34-parameters.fixture.json" with { type: "json" };
import rewardFixture from "./court-34-rewards.fixture.json" with { type: "json" };
import { COMPACT_FROM_ROWS } from "./density";
import { Matrix } from "./Matrix";
import {
  buildCourtPerformance,
  type CourtPerformance,
  type RawCommitCast,
  type RawCourtData,
  type RawDraw,
  type RawRewardShift,
} from "./performance";
import type { RawCourtParameters } from "./windows";

const roster: RosterView = {
  entries: ROSTER.map((agentJuror) => ({ agentJuror, identity: rosterIdentity(agentJuror) })),
  isResolving: false,
  isResolvedFromEns: false,
};

function build(raw: Partial<RawCourtData> = {}): CourtPerformance {
  const result = buildCourtPerformance({
    disputes: disputeFixture as RawDispute[],
    draws: drawFixture as RawDraw[],
    commits: commitFixture as RawCommitCast[],
    parameters: parameterFixture as RawCourtParameters[],
    rewards: rewardFixture as RawRewardShift[],
    roster: ROSTER,
    drawsReadAt: null,
    ...raw,
  });
  if (!result.success) throw new Error(`${result.code}: ${result.message}`);
  return result.data;
}

/**
 * A fixed present, so the live rows' elapsed figures are not a moving target.
 *
 * Dispute 166 entered its appeal period at 1787604932, which this puts 3m 12s in the past —
 * the same figure the artboard's illustrative live row carries.
 */
const NOW = (1787604932 + 192) * 1000;

/** The tree under test, so a rerender can hand over a fresh model the way a poll does. */
function harness(
  performance: CourtPerformance = build(),
  slotsFor?: (dispute: Dispute) => DisputeRowSlots,
  now: number = NOW,
) {
  // Inside a router since ticket 08: the window footnote links to the method page's account of
  // the two period regimes, which is a part of the matrix and not of the page around it.
  return (
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <Matrix performance={performance} roster={roster} slotsFor={slotsFor} now={now} />
      </MemoryRouter>
    </ThemeProvider>
  );
}

function renderMatrix(
  performance: CourtPerformance = build(),
  slotsFor?: (dispute: Dispute) => DisputeRowSlots,
  now: number = NOW,
) {
  return render(harness(performance, slotsFor, now));
}

/**
 * The grid itself, without the column headers.
 *
 * The headers carry figures of their own since ticket 06 — a median reveal, a median commit and
 * a coherence count per column — and those are drawn from the same draws the cells are, so a
 * duration asserted page-wide now matches in two places. A cell assertion has to say it means a
 * cell, or it passes on the marginal that summarises it.
 */
function grid() {
  const [, body] = screen.getAllByRole("rowgroup");
  if (body === undefined) throw new Error("The matrix has a body");
  return within(body);
}

/**
 * One dispute, for the cases the captured court cannot produce.
 *
 * The court has been reconfigured once and its oldest dispute is the one that reconfiguration
 * marks, so no read of it can hold a dispute that is both older than 151 and placeable against
 * the parameter history. That combination has to be built.
 */
function rawDispute(overrides: Partial<RawDispute>, timeline: readonly string[]): RawDispute {
  return {
    id: "163",
    disputeID: "163",
    period: "execution",
    ruled: true,
    currentRuling: "2",
    createdAt: "1787340123",
    lastPeriodChange: "1787409015",
    currentRoundIndex: "0",
    ...overrides,
    rounds: [{ id: `${overrides.disputeID ?? "163"}-0`, timeline }],
  };
}

/** The row of the matrix for one dispute, found the way a reader finds it. */
function rowFor(id: number) {
  return screen.getByRole("rowheader", { name: new RegExp(`^${id}\\b`) }).closest("tr");
}

/**
 * The cells of a row that carry a draw, which is how a reader counts a panel now that no pill
 * states its size.
 *
 * An undrawn cell is blank to the eye and says "Not drawn" to a screen reader; a row whose draws
 * were never read says "Unknown" in all six. Both are absences rather than draws and neither may
 * be counted into a panel — the distinction tickets 13 and 17 exist to keep, applied to the count
 * itself.
 *
 * Matching on those two and not on "Not read" is the point: a cell that *was* drawn says "Not
 * read" for its commit measure whenever the log scan has not come back, which is every fixture
 * built without commits. Filtering on it counted a real draw as an absence and made a panel of
 * one look like a panel of none.
 */
function drawnCellsOf(row: HTMLElement): HTMLElement[] {
  return within(row)
    .getAllByRole("cell")
    .filter((cell) => !/not drawn|\bunknown\b/i.test(cell.textContent ?? ""));
}

/**
 * The same court, grown to a given number of disputes.
 *
 * `padCourt` is shared with `MatrixPage.test.tsx`, which checks what the page *says* about a
 * compacted grid while this checks what the grid does — two suites reading one padded court, for
 * the same reason both layouts read one model.
 */
function padTo(disputeCount: number, over: Partial<RawCourtData> = {}): CourtPerformance {
  return build({ ...padCourt(disputeCount), ...over });
}

/** A court just below the crossing point, and one just above it. */
const comfortableCourt = () => padTo(COMPACT_FROM_ROWS);
const compactCourt = () => padTo(COMPACT_FROM_ROWS + 1);

/** The same compact court with the Arbitrum scan still out, which is every cold load. */
const padToUnscanned = () => padTo(COMPACT_FROM_ROWS + 1, { commits: null });

/** Every dispute id the grid is drawing, read off the row headers in the order they appear. */
function renderedIds(): number[] {
  return screen
    .getAllByRole("rowheader")
    .map((header) => Number(/^\d+/.exec(header.textContent ?? "")?.[0]));
}

/**
 * The same row, found by its own link rather than by the row header's accessible name.
 *
 * `rowFor` matches `^156\b`, and a row header whose title slot is filled has no word boundary
 * there — the id and the title run together into "156An escrow dispute". The link is the row's
 * one link and its name is exactly the id, at either density and with or without a title.
 */
function rowOrThrow(id: number): HTMLElement {
  const row = screen.getByRole("link", { name: String(id) }).closest("tr");
  if (row === null) throw new Error(`no row for dispute ${id}`);
  return row;
}

/** A position in that row where an agent juror was not drawn. */
function blankCellOf(id: number): HTMLElement {
  const blank = within(rowOrThrow(id)).getAllByText("Not drawn")[0]?.closest("td");
  if (blank === null || blank === undefined) throw new Error(`no blank cell in dispute ${id}`);
  return blank;
}

describe("the matrix's own structure", () => {
  /*
   * Ticket 18. A cell is a measurement of one agent juror in one dispute, and a reader who
   * cannot see the grid has to be told which — the two facts the geometry carries for everyone
   * else. `scope` alone does not do it: it associates the cell with headers, but a screen reader
   * announces those only when the reader crosses into a new row or column, and never at all in
   * the linear browse mode most reading is done in. So the pair is said in the cell.
   *
   * The roster nickname and not the ENS one, deliberately. What the column header *displays* is
   * whatever ENS resolved — `blaise` carries a name record reading "Blaise" — but the nickname
   * this dashboard keys, routes and joins on is the roster's, and a name a wallet can change is
   * not the thing to identify a measurement by.
   */
  it("says which agent juror and which dispute every cell belongs to", () => {
    renderMatrix();

    const row = rowOrThrow(151);
    for (const agentJuror of ROSTER) {
      expect(
        within(row).getByText(new RegExp(`^${agentJuror.nickname}, dispute 151\\b`)),
      ).toBeInTheDocument();
    }
  });

  it("says it on a cell that was never drawn, and on one that was never read", () => {
    // The two empty states, which are the ones that most need it: "not drawn" and "not read"
    // are both silence on the page, and a reader hearing either without knowing whose column
    // it is has been told nothing at all. They are also the two the matrix must never let a
    // reader confuse, so each has to arrive attached to a name.
    renderMatrix();
    expect(blankCellOf(151).textContent).toMatch(/^\w+, dispute 151\. ?Not drawn$/);

    cleanup();
    // A dispute created after the draws were last read: its cells are all null and the row is
    // Unknown rather than not drawn. Same construction as the drift suite further down.
    const readAt = Number(disputeFixture[0]?.createdAt ?? 0) * 1000;
    const newcomer = {
      ...(disputeFixture[0] as RawDispute),
      id: "170",
      disputeID: "170",
      createdAt: String(readAt / 1000 + 600),
    } as RawDispute;
    renderMatrix(
      build({ disputes: [newcomer, ...(disputeFixture as RawDispute[])], drawsReadAt: readAt }),
    );
    const unreadCell = within(rowOrThrow(170)).getAllByRole("cell")[0] as HTMLElement;
    expect(unreadCell.textContent).toMatch(/^\w+, dispute 170\./);
  });

  it("separates the dispute id from the title in the row header's accessible name", () => {
    // Before ticket 18 these ran together — dispute 151 announced as "151x402 escrow dispute",
    // because the two sit in separate grid tracks and a `column-gap` contributes nothing to an
    // accessible name. `Matrix.test.tsx` had to route around it, which is the tell left in code.
    renderMatrix(build(), (dispute) => ({
      title: dispute.id === 151 ? "x402 escrow dispute" : undefined,
      category: "Escrow",
    }));

    // The comma and not a space: accessible-name computation trims the whitespace out from
    // between adjacent nodes, so a hidden ", " contributes its punctuation and loses its space.
    // That is enough — a comma is a pause to a speech synthesiser, which is the whole ask — but
    // it means the assertion has to be written against what the algorithm actually produces.
    expect(
      screen.getByRole("rowheader", { name: /^151,\s?x402 escrow dispute\b/ }),
    ).toBeInTheDocument();
  });

  it("gives the grid a name of its own", () => {
    // A `<table>` with no caption and no label is announced as "table" and nothing else.
    renderMatrix();
    expect(screen.getByRole("table", { name: /one row per dispute/i })).toBeInTheDocument();
  });

  it("carries that name on a real caption element rather than on a positioned stand-in", () => {
    // The shape, because the name above cannot see it. `dom-accessibility-api` computes the
    // accessible name off the markup and lays nothing out, so the assertion above passed for
    // four months against `<VisuallyHidden as="caption">` — an absolutely positioned element,
    // which computes away from `table-caption` display and which several browser and
    // screen-reader pairs then drop from the table's name. Ticket 27 found it by reading the
    // tripwire rather than by running anything, and this is the assertion that would have
    // caught it: a real `<caption>` that is the table's first child, hiding from the inside.
    // Chrome's own accessibility tree gave the same name either way, so the browser check
    // could not pin this either — the markup is the only place the rule is observable.
    const { container } = renderMatrix();
    const table = container.querySelector("table");
    const caption = table?.firstElementChild;

    expect(caption?.tagName).toBe("CAPTION");
    expect(caption?.textContent).toMatch(/one row per dispute/i);
    // **This is the assertion that discriminates, and it is not redundant with the tag check
    // above.** `VisuallyHidden as="caption"` renders a `<caption>` element too — styled-components
    // swaps the tag and keeps the styles — so the tag alone was already true of the broken shape
    // and stayed true through the whole regression. What separates them is *where* the clipping
    // sits: hidden from the inside means the caption is bare and the hiding is on a child.
    //
    // The hider is identified rather than merely counted. `querySelector("span")` alone would
    // pass on a plain unstyled `<span>`, which draws the caption's sentence as visible text above
    // the grid — the opposite defect, and one this test would then be nominally guarding while
    // waving through. `styledComponentId` is the stable class styled-components puts on every
    // instance of a component, so this pins the child to *this* hider.
    const hider = caption?.querySelector("span");
    expect(hider).not.toBeNull();
    expect(hider?.className).toContain(VisuallyHidden.styledComponentId);
    // And the caption itself must not be the thing being positioned — the tripwire exactly.
    expect(caption && getComputedStyle(caption).position).not.toBe("absolute");
  });

  it("leaves focus where it was when the court is re-read under it", () => {
    // Ticket 12 re-reads the disputes and the draws every five seconds while anything is
    // unruled, which means the whole grid rerenders under whoever is standing in it. A reader
    // parked on a dispute link has to still be on that dispute link afterwards — losing focus
    // to `<body>` every five seconds makes the page unusable by keyboard, and it is exactly the
    // failure the interstitial had for a different reason: a rerender that replaces a node.
    const { rerender } = renderMatrix();

    const link = screen.getByRole("link", { name: "151" });
    link.focus();
    expect(document.activeElement).toBe(link);

    // A fresh model object, as react-query hands over on every poll: never reference-equal to
    // the last one, and almost always the same court.
    rerender(harness(build()));

    expect(document.activeElement).toBe(screen.getByRole("link", { name: "151" }));
    expect(document.activeElement).toBe(link);
  });

  it("lets a keyboard reach the matrix's sideways scroll", () => {
    // The comfortable grid is wider than the viewport and scrolls in a container of its own.
    // A scroll container that is not focusable cannot be scrolled without a pointer (WCAG 2.1.1),
    // and there is nothing else in it to tab to that would bring the far columns into view.
    renderMatrix();
    const region = screen.getByRole("region", { name: "The matrix, scrollable" });
    expect(region).toHaveAttribute("tabindex", "0");
  });

  it("spends no tab stop on a compact grid that has nothing to scroll", () => {
    // The compact density drops its overflow box above `compactGrid` — ticket 17 had to, since a
    // scroll container breaks the `position: sticky` header inside it — so above that width
    // there is nothing to pan. A focusable region there is a stop that goes nowhere, under a
    // name that says it scrolls. Review found it; the gate now mirrors the CSS exactly.
    stubViewportWidth(1400);
    try {
      renderMatrix(compactCourt());
      expect(screen.queryByRole("region", { name: "The matrix, scrollable" })).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }

    cleanup();

    // Narrow enough that the compact grid does not fit, so the box is a scroll container again
    // and the tab stop is the only way a keyboard reaches the far columns.
    stubViewportWidth(1000);
    try {
      renderMatrix(compactCourt());
      expect(screen.getByRole("region", { name: "The matrix, scrollable" })).toHaveAttribute(
        "tabindex",
        "0",
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("Matrix", () => {
  it("puts disputes down the rows and agent jurors across the columns", () => {
    renderMatrix();

    const columns = screen.getAllByRole("columnheader");

    // The caption cell plus one per agent juror. Rows grow downward as disputes accumulate;
    // the columns stay at six, because the roster does.
    expect(columns).toHaveLength(1 + ROSTER.length);
    for (const agentJuror of ROSTER) {
      expect(
        screen.getByRole("columnheader", { name: new RegExp(agentJuror.nickname) }),
      ).toBeInTheDocument();
    }
    expect(screen.getAllByRole("rowheader")).toHaveLength(16);
  });

  // Ticket 04 supplies `slotsFor` from `useDisputes`; ticket 05 renders the row header. Neither
  // branch could test the pair, because on either one alone the prop is `undefined` — which is
  // also why the matrix must keep rendering a row that resolves no title.
  it("fills the row header from slotsFor, and still renders a row that resolves none", () => {
    renderMatrix(build(), (dispute) => ({
      title: dispute.id === 151 ? "x402 escrow dispute" : undefined,
      category: "Escrow",
    }));

    const titled = screen.getByText("x402 escrow dispute").closest("tr") as HTMLElement;
    expect(within(titled).getByText("151")).toBeInTheDocument();
    // The row draws its own ruling; a filled title slot does not displace it.
    expect(within(titled).getByText(/^Ruling /)).toBeInTheDocument();

    // 152 resolves no title here, which is what a dispute with no template looks like. It keeps
    // its row and its header rather than dropping out of the matrix.
    const untitled = screen.getByText("152").closest("tr") as HTMLElement;
    expect(within(untitled).getByText(/^Ruling /)).toBeInTheDocument();
    expect(screen.getAllByRole("rowheader")).toHaveLength(16);
  });

  it("names the agent juror that has never been drawn as never drawn, not as absent", () => {
    renderMatrix();

    const column = screen.getByRole("columnheader", { name: /baskerville/ });

    expect(within(column).getByText(/never drawn/i)).toBeInTheDocument();
  });

  it("shows a draw's reveal latency and its coherence in a word", () => {
    renderMatrix();
    const row = rowFor(163);
    if (row === null) throw new Error("no row for dispute 163");

    // Every one of dispute 163's five agent jurors voted with the ruling.
    expect(within(row).getAllByText("Coherent")).toHaveLength(5);
    expect(within(row).getByText("46s")).toBeInTheDocument();
  });

  it("words a draw that voted against the ruling as diverged", () => {
    renderMatrix();
    const row = rowFor(154);
    if (row === null) throw new Error("no row for dispute 154");

    expect(within(row).getByText("Diverged")).toBeInTheDocument();
    expect(within(row).getAllByText("Coherent")).toHaveLength(3);
  });

  it("asserts no coherence for a dispute the court has not ruled on", () => {
    renderMatrix();
    const row = rowFor(165);
    if (row === null) throw new Error("no row for dispute 165");

    expect(within(row).queryByText("Coherent")).not.toBeInTheDocument();
    expect(within(row).queryByText("Diverged")).not.toBeInTheDocument();
    expect(within(row).getAllByText("Revealed").length).toBeGreaterThan(0);
  });

  it("annotates a draw holding several vote IDs, and says nothing on one holding one", () => {
    renderMatrix();
    const lone = rowFor(155);
    const single = rowFor(163);
    if (lone === null || single === null) throw new Error("missing a row");

    // columbo held all three of dispute 155's vote IDs.
    expect(within(lone).getByText("×3")).toBeInTheDocument();
    // ×1 on forty-odd cells would be noise, so it is absent rather than quiet.
    expect(within(single).queryByText("×1")).not.toBeInTheDocument();
  });

  it("keeps the panel size off the row, because the six cells already are the count", () => {
    renderMatrix();
    const row = rowFor(163);
    if (row === null) throw new Error("no row for dispute 163");

    // Dispute 163 has a panel of five and nothing on the row says so in words: five of its six
    // cells carry a draw and the sixth is blank, which is the same fact drawn rather than
    // counted. Checked against the live court before the pill went — all 31 rows had a panel
    // size equal to their own drawn-cell count. It is a property of this court and not of the
    // model, which is why `AgentJurorDraws` keeps the number where there are no cells to count.
    expect(within(row).queryByText(/^Panel \d+$/)).not.toBeInTheDocument();
    expect(drawnCellsOf(row)).toHaveLength(5);
  });

  it("flags a dispute decided by a panel of one, and explains why it matters", () => {
    renderMatrix();
    const row = rowFor(155);
    if (row === null) throw new Error("no row for dispute 155");

    // The flag is the sole carrier now, and it was always the better of the two: it says what
    // being a majority of one means, where `Panel 1` beside it only said how many there were.
    expect(within(row).queryByText("Panel 1")).not.toBeInTheDocument();
    expect(drawnCellsOf(row)).toHaveLength(1);
    expect(within(row).getByText("Lone panel")).toBeInTheDocument();
    expect(screen.getByText(/coherence there is tautological/i)).toBeInTheDocument();
  });

  it("gives a row at most one flag", () => {
    renderMatrix();

    for (const header of screen.getAllByRole("rowheader")) {
      expect(
        within(header).queryAllByText(/lone panel|8h window|live/i).length,
      ).toBeLessThanOrEqual(1);
    }
  });

  describe("the window marker", () => {
    it("marks the dispute that ran under a window the court has since changed", () => {
      renderMatrix();
      const row = rowFor(151);
      if (row === null) throw new Error("no row for dispute 151");

      // Named from what the court was configured with, not typed in: `† 8h window`, as the
      // artboard draws it.
      expect(within(row).getByText("8h window")).toBeInTheDocument();
    });

    it("marks that row and no other", () => {
      renderMatrix();

      const marked = screen
        .getAllByRole("rowheader")
        .filter((header) => within(header).queryByText(/window$/i) !== null);

      expect(marked).toHaveLength(1);
      expect(marked[0]?.textContent).toMatch(/^151[^\d]/);
    });

    it("takes precedence over the lone panel, because it is the one that breaks comparison", () => {
      // Dispute 151 has a panel of two, so this is asserted where it can actually be seen:
      // a row that is both marked and lone shows the window. Hand-built, because the court has
      // never produced one.
      const both = build({
        disputes: [
          {
            id: "151",
            disputeID: "151",
            period: "execution",
            ruled: true,
            currentRuling: "1",
            createdAt: "1787144365",
            lastPeriodChange: "1787257250",
            currentRoundIndex: "0",
            rounds: [
              { id: "151-0", timeline: ["1787188106", "1787191796", "1787192415", "1787257250"] },
            ],
          },
        ],
        draws: [
          {
            id: "151-0-0",
            juror: { id: ROSTER[0]?.address.toLowerCase() as string },
            dispute: { disputeID: "151" },
            round: { id: "151-0" },
            vote: {
              commited: true,
              voted: true,
              choice: "1",
              justification: { timestamp: "1787191900", choice: "1" },
            },
          },
        ],
      });
      renderMatrix(both);
      const row = rowFor(151);
      if (row === null) throw new Error("no row for dispute 151");

      // One drawn cell is what makes this row lone, and it is asserted so the precedence claim
      // below cannot pass vacuously against a fixture that stopped producing one.
      expect(drawnCellsOf(row)).toHaveLength(1);
      expect(within(row).getByText("8h window")).toBeInTheDocument();
      expect(within(row).queryByText("Lone panel")).not.toBeInTheDocument();
    });

    it("sets the two configurations beside each other as absolute durations", () => {
      renderMatrix();

      const footnote = screen.getByText(/ran with a commit window of/i).closest("p");

      expect(footnote).toHaveTextContent(
        /Dispute 151 ran with a commit window of 8h and a vote window of 8h, against 45m and 30m configured now/i,
      );
      // ADR-0005, in the one place a reader would otherwise reach for a ratio.
      expect(footnote).toHaveTextContent(/never as a fraction of the window it ran in/i);
      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });

    it("links the footnote at the account of the change", () => {
      renderMatrix();

      expect(
        screen.getByRole("link", { name: /what that means for these figures/i }),
      ).toHaveAttribute("href", "/method#window");
    });

    it("marks nothing and claims nothing while the parameter history is out", () => {
      // Every cold load. It must not read as "no dispute ran under different rules", which is
      // a claim about the court, so it says the history has not been read instead.
      renderMatrix(build({ parameters: null }));

      expect(screen.queryByText(/8h window/)).not.toBeInTheDocument();
      expect(screen.getByText(/is still being read, or could not be/i)).toBeInTheDocument();
      expect(screen.getByText(/an unread state rather than a finding/i)).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /what that means for these figures/i }),
      ).toBeInTheDocument();
    });

    it("says a read that came back empty came back empty, not that it never happened", () => {
      // `[]` is `read: true` with no configuration in it — a court that has plainly been
      // configured returning none of them is a scan that came back short, and the two states
      // are told apart here rather than collapsed into one sentence.
      renderMatrix(build({ parameters: [] }));

      expect(
        screen.getByText(/that read came back carrying no configuration at all/i),
      ).toBeInTheDocument();
      expect(screen.queryByText(/is still being read, or could not be/i)).not.toBeInTheDocument();
    });

    it("says so plainly when every dispute read ran under the current windows", () => {
      // One configuration, in force since before the court's first dispute — so every row is
      // placed and none is marked. The footnote still carries the rule, because the rule is not
      // conditional on anything having changed.
      const current = build({
        parameters: [{ at: "1786444490", timesPerPeriod: ["2700", "2700", "1800", "129600"] }],
      });
      renderMatrix(current);

      expect(
        screen.getByText(/every dispute here ran under the period durations/i),
      ).toHaveTextContent(/commit window of 45m and a vote window of 30m/i);
      expect(screen.queryByText(/8h window/)).not.toBeInTheDocument();
    });

    it("never calls a dispute it could not place a dispute that matched", () => {
      // The failure a short scan produces, and the one this footnote must never absorb: a
      // provider capping `eth_getLogs` drops the court's oldest configuration, dispute 151
      // resolves to no window at all, and so nothing is marked. Saying "every dispute here ran
      // under the durations the court holds now" over that states the opposite of the truth,
      // with no error anywhere — the invariant that partial data must never render as complete.
      const short = build({
        parameters: [{ at: "1787230320", timesPerPeriod: ["2700", "2700", "1800", "129600"] }],
      });
      renderMatrix(short);

      expect(
        screen.queryByText(/every dispute here ran under the period durations/i),
      ).not.toBeInTheDocument();
      expect(screen.getByText(/does not reach back far enough to place/i)).toHaveTextContent(/151/);
      expect(screen.queryByText(/8h window/)).not.toBeInTheDocument();
    });

    it("names the disputes it could not place even while it is marking others", () => {
      // Both at once: one dispute marked against a superseded configuration, another older than
      // anything the history reaches. The second must not be folded into the first's absence.
      // Hand-built, because the captured court's oldest dispute is the marked one — there is no
      // read of court 34 in which a dispute is both older than 151 and placeable.
      const partial = build({
        disputes: [
          rawDispute({ id: "100", disputeID: "100", createdAt: "1000" }, [
            "1100",
            "1200",
            "1300",
            "1400",
          ]),
          rawDispute({ id: "151", disputeID: "151", createdAt: "1787144365" }, [
            "1787188106",
            "1787191796",
            "1787192415",
            "1787257250",
          ]),
        ],
        draws: [],
        parameters: [
          { at: "1787144000", timesPerPeriod: ["43200", "28800", "28800", "129600"] },
          { at: "1787230320", timesPerPeriod: ["2700", "2700", "1800", "129600"] },
        ],
      });
      renderMatrix(partial);

      expect(screen.getByText(/ran with a commit window of/i)).toHaveTextContent(/151/);
      expect(screen.getByText(/cannot place at all/i)).toHaveTextContent(/100/);
    });
  });

  it("draws a cell for an agent juror that was not drawn as nothing at all", () => {
    renderMatrix();
    const row = rowFor(155);
    if (row === null) throw new Error("no row for dispute 155");

    // Five of the six columns are empty in dispute 155, and none of them carries a word, a
    // glyph or a figure that could be read as a failure to act.
    const empty = within(row).getAllByText("Not drawn");

    expect(empty).toHaveLength(5);
    expect(within(row).queryByText("Missed")).not.toBeInTheDocument();
    expect(within(row).queryByText("No vote")).not.toBeInTheDocument();
  });

  it("leaves the sparsity note to the page, which now puts it in the footer", () => {
    // It was the third footnote under the grid until the note moved into the provenance
    // footer, above the identity line. What it says is unchanged and is asserted where it is
    // now composed, in `MatrixPage.test.tsx`; what this pins is that the matrix does not also
    // carry it, because the one thing two renderings of one caveat must never be is two.
    renderMatrix();

    expect(
      screen.queryByText(/sparsity is the normal state of this record/i),
    ).not.toBeInTheDocument();
  });

  it("keys the legend so a first-time reader can decode a cell", () => {
    renderMatrix();

    for (const word of ["Coherent", "Diverged", "No vote", "Acting", "Not drawn"]) {
      expect(screen.getAllByText(word).length).toBeGreaterThan(0);
    }
    expect(screen.getByText(/rail: 1s — 1h, log/i)).toBeInTheDocument();
  });

  it("names the live family once in the legend and the stage in the cell", () => {
    renderMatrix();

    // The legend's word for the family is not any cell's word for a stage: they are
    // deliberately different, so that neither can be mistaken for the other.
    expect(screen.getAllByText("Acting")).toHaveLength(1);
    expect(screen.getAllByText("Revealed").length).toBeGreaterThan(0);
  });

  it("renders the states with no example in the data, from a model that says so", () => {
    // NO VOTE and the two early live stages have never occurred in this court. They are
    // built here rather than deferred to the day they happen.
    const missed = build({
      disputes: [
        {
          id: "900",
          disputeID: "900",
          period: "execution",
          ruled: true,
          currentRuling: "1",
          createdAt: "100",
          lastPeriodChange: "900",
          currentRoundIndex: "0",
          rounds: [{ id: "900-0", timeline: ["100", "200", "300", "400"] }],
        },
      ],
      draws: [
        {
          id: "900-0-0",
          juror: { id: ROSTER[3]?.address.toLowerCase() ?? "" },
          dispute: { disputeID: "900" },
          round: { id: "900-0" },
          vote: { commited: true, voted: false, choice: null, justification: null },
        },
      ],
      commits: [{ disputeID: "900", juror: ROSTER[3]?.address ?? "", timestamp: "160" }],
    });
    renderMatrix(missed);

    expect(screen.getAllByText("No vote").length).toBeGreaterThan(0);
    // The reveal figure reads as a miss, not as a number and not as a blank.
    expect(grid().getByText("Missed")).toBeInTheDocument();
    // And the commit that did happen is still a figure: a draw can commit and never reveal.
    expect(grid().getByText("60s")).toBeInTheDocument();
  });

  it("reads a stage that has not happened yet as a dash, never as blank", () => {
    const acting = build({
      disputes: [
        {
          id: "900",
          disputeID: "900",
          period: "vote",
          ruled: false,
          currentRuling: "0",
          createdAt: "100",
          lastPeriodChange: "200",
          currentRoundIndex: "0",
          rounds: [{ id: "900-0", timeline: ["100", "200", "0", "0"] }],
        },
      ],
      draws: [
        {
          id: "900-0-0",
          juror: { id: ROSTER[3]?.address.toLowerCase() ?? "" },
          dispute: { disputeID: "900" },
          round: { id: "900-0" },
          vote: { commited: true, voted: false, choice: null, justification: null },
        },
      ],
      commits: [{ disputeID: "900", juror: ROSTER[3]?.address ?? "", timestamp: "150" }],
    });
    renderMatrix(acting);

    expect(screen.getByText("Committed")).toBeInTheDocument();
    expect(grid().getByText("—")).toBeInTheDocument();
    // The reveal is the dash; the commit already has a moment, and the cell shows both.
    expect(grid().getByText("50s")).toBeInTheDocument();
  });

  describe("the column marginals", () => {
    /** One agent juror's column header, by the nickname the roster keys it on. */
    function header(nickname: string) {
      const cell = screen.getByText(nickname).closest("th");
      if (cell === null) throw new Error(`${nickname} has a column header`);
      return within(cell);
    }

    it("puts each agent juror's summary inside that agent juror's own column", () => {
      renderMatrix();

      // 007's own draws, not the court's: ten draws holding thirteen vote IDs, a median reveal
      // of 48s against the court's 85s, and coherence over the eight of them the court has
      // ruled on.
      expect(header("007").getByText("10 · 13v")).toBeInTheDocument();
      expect(header("007").getByText("48s")).toBeInTheDocument();
      expect(header("007").getByText("7/8")).toBeInTheDocument();
    });

    it("adds no seventh column: one row header and exactly six agent jurors", () => {
      renderMatrix();

      const [head] = screen.getAllByRole("rowgroup");
      if (head === undefined) throw new Error("The matrix has a header");

      expect(within(head).getAllByRole("columnheader")).toHaveLength(ROSTER.length + 1);
    });

    it("shows dashes and a real zero for the agent juror that has never been drawn", () => {
      renderMatrix();

      // baskerville is staked, listed and never asked. There is nothing to measure and no
      // figure that could be shown without inventing it — but zero draws is a measurement.
      //
      // Five dashes since ticket 10 and not three: an agent juror the court has never drawn has
      // not been paid nothing, it has not been in a position to be paid at all, and `0.0000`
      // would state the first.
      expect(header("baskerville").getAllByText("—")).toHaveLength(5);
      expect(header("baskerville").getByText("0 · 0v")).toBeInTheDocument();
    });

    it("shows what each drawn column has been paid, at the precision the artboard sets", () => {
      renderMatrix();

      // The real payouts, summed down each column from the 44 shifts the court had written when
      // the fixture was captured. Four places for ETH and two for PNK
      // (`canvas/Main.dc.html:150-151`), and the PNK sign is a character in the value — 007 and
      // aletheia are both net *down* on the experiment, which is a fact this page has to be able
      // to state as plainly as a gain (ADR-0006).
      expect(header("007").getByText("0.0026")).toBeInTheDocument();
      expect(header("007").getByText("-93.50")).toBeInTheDocument();

      expect(header("blaise").getByText("0.0036")).toBeInTheDocument();
      expect(header("blaise").getByText("+218.17")).toBeInTheDocument();

      expect(header("aletheia").getByText("-561.00")).toBeInTheDocument();
      expect(header("daemonhill").getByText("+264.92")).toBeInTheDocument();
      expect(header("columbo").getByText("+171.42")).toBeInTheDocument();
    });

    it("says nothing about a payout it has not read, rather than reading it as zero", () => {
      // The state every cold load passes through, and the one that makes these two figures
      // different from the four beside them. A median that cannot be taken is a dash; a *sum*
      // that has not been read is `0.0000`, which is a number in the ink of a measurement
      // saying six agent jurors earned nothing across sixteen disputes.
      renderMatrix(build({ rewards: null }));

      expect(screen.queryByText("0.0000")).not.toBeInTheDocument();
      expect(screen.queryByText("0.00")).not.toBeInTheDocument();
      expect(header("007").queryByText("0.0026")).not.toBeInTheDocument();
      // Every column falls back to the same dash the never-drawn one shows.
      expect(header("007").getAllByText("—").length).toBeGreaterThanOrEqual(2);
    });

    it("marks the column drawn in dispute 151, and leaves the others unmarked", () => {
      renderMatrix();

      // Dispute 151 ran under 8-hour commit and vote windows; columbo and daemonhill are the
      // two agent jurors the court drew for it. A column that was not there is comparable with
      // the court as it stands and says nothing.
      expect(header("columbo").getAllByText("†")).toHaveLength(2);
      expect(header("007").queryByText("†")).not.toBeInTheDocument();
    });

    it("marks the coherence of the column that sat on the panel of one", () => {
      renderMatrix();

      // Dispute 155 was decided by columbo alone, where being the majority took no agreement.
      // The reason is read off the mark's accessible name: it is drawn under the figure at
      // neither density now, and the six columns share one baseline because of it.
      expect(header("columbo").getByText("‡")).toBeInTheDocument();
      expect(
        header("columbo").getByRole("link", { name: /coherence count is marked/i }),
      ).toHaveAccessibleName(/of \d+ draws sat on a panel of one/i);
      expect(header("blaise").queryByText("‡")).not.toBeInTheDocument();
    });

    it("leaves every commit median a dash until the log scan has come back", () => {
      // The trap this repository has now hit four times: a flag that is false while a read is
      // in flight is not a flag that the read failed. Six columns reading "Not read" for the
      // length of every cold load is a failure announced before it has happened.
      renderMatrix(build({ commits: null }));

      expect(screen.queryByText("Not read")).not.toBeInTheDocument();
    });
  });

  describe("the live rows", () => {
    it("counts the court as finalised against live, not as a bare total", () => {
      renderMatrix();

      expect(screen.getByText(/13 finalised/)).toHaveTextContent("13 finalised · 3 live");
    });

    it("flags a live row with the period that is open and how long it has been open", () => {
      renderMatrix();
      const row = rowFor(166);
      if (row === null) throw new Error("no row for dispute 166");

      // Not only that it is live: a reader watching a commit period unfold needs the elapsed
      // time, and a pill that said "Live" alone would be the same pill for an hour.
      expect(within(row).getByText("Live · appeal 3m 12s")).toBeInTheDocument();
    });

    it("puts no live flag on a dispute the court has ruled on", () => {
      renderMatrix();
      const row = rowFor(163);
      if (row === null) throw new Error("no row for dispute 163");

      expect(within(row).queryByText(/live/i)).not.toBeInTheDocument();
    });

    it("marks a live row without a word, so it is distinguishable at a glance", () => {
      renderMatrix();
      const live = rowFor(166);
      const finalised = rowFor(163);
      if (live === null || finalised === null) throw new Error("missing a row");

      const marked = getComputedStyle(live);
      const plain = getComputedStyle(finalised);

      // Asserted as a difference rather than as two colour literals: what the design requires
      // is that the two rows do not look alike, and pinning the token here would make a
      // palette change look like a regression.
      expect(marked.backgroundColor).not.toBe(plain.backgroundColor);
      expect(marked.boxShadow).not.toBe(plain.boxShadow);
      expect(plain.boxShadow).toBe("");
    });

    it("rails a row in the colour of its flag, and tints it only if it is live", () => {
      // The artboard keeps these two apart: `bg` is mint exactly when the dispute is live,
      // `mark` is the colour of whichever flag the row wears. A finalised lone panel therefore
      // has a rail and no tint, which is the case that shows the two are not the same question.
      renderMatrix();
      const lone = rowFor(155);
      const plain = rowFor(163);
      const live = rowFor(166);
      if (lone === null || plain === null || live === null) throw new Error("missing a row");

      expect(getComputedStyle(lone).boxShadow).not.toBe("");
      expect(getComputedStyle(lone).backgroundColor).toBe(getComputedStyle(plain).backgroundColor);
      // And the live row's rail is a different colour from the lone panel's.
      expect(getComputedStyle(live).boxShadow).not.toBe(getComputedStyle(lone).boxShadow);
    });

    it("keeps the flag for a lone panel above the flag for a live dispute", () => {
      // Both apply to dispute 900 here. The precedence is the point of `ROW_FLAGS`, and the
      // lone panel is the one that changes how a figure should be read.
      const both = build({
        disputes: [
          {
            id: "900",
            disputeID: "900",
            period: "vote",
            ruled: false,
            currentRuling: "0",
            createdAt: "100",
            lastPeriodChange: "200",
            currentRoundIndex: "0",
            rounds: [{ id: "900-0", timeline: ["100", "200", "0", "0"] }],
          },
        ],
        draws: [
          {
            id: "900-0-0",
            juror: { id: ROSTER[3]?.address.toLowerCase() ?? "" },
            dispute: { disputeID: "900" },
            round: { id: "900-0" },
            vote: { commited: true, voted: false, choice: null, justification: null },
          },
        ],
        commits: [],
      });
      renderMatrix(both);
      const row = rowFor(900);
      if (row === null) throw new Error("no row for dispute 900");

      expect(within(row).getByText("Lone panel")).toBeInTheDocument();
      expect(within(row).queryByText(/live ·/i)).not.toBeInTheDocument();
      // The row still carries the live treatment: the flag slot holds one pill, and the rail
      // and tint are not the flag.
      expect(getComputedStyle(row).boxShadow).not.toBe("");
    });

    it("drops the live treatment as soon as the dispute is ruled, without a reload", () => {
      // The refetch replaces the payload and nothing else happens: no effect, no timer, no
      // second source of truth about whether a row is live.
      renderMatrix();
      const before = rowFor(166);
      if (before === null) throw new Error("no row for dispute 166");
      expect(within(before).getByText(/live ·/i)).toBeInTheDocument();
      cleanup();

      const ruled = build({
        disputes: (disputeFixture as RawDispute[]).map((dispute) =>
          dispute.disputeID === "166" ? { ...dispute, ruled: true, currentRuling: "1" } : dispute,
        ),
      });
      renderMatrix(ruled);
      const row = rowFor(166);
      if (row === null) throw new Error("no row for dispute 166");

      expect(within(row).queryByText(/live ·/i)).not.toBeInTheDocument();
      expect(screen.getByText(/14 finalised/)).toHaveTextContent("14 finalised · 2 live");
    });

    it("says a live row is live without dating it when the moment is the epoch", () => {
      // `lastPeriodChange` of 0 would otherwise read as a period open since 1970.
      const undated = build({
        disputes: (disputeFixture as RawDispute[]).map((dispute) =>
          dispute.disputeID === "166" ? { ...dispute, lastPeriodChange: "0" } : dispute,
        ),
      });
      renderMatrix(undated);
      const row = rowFor(166);
      if (row === null) throw new Error("no row for dispute 166");

      expect(within(row).getByText("Live · appeal")).toBeInTheDocument();
    });
  });

  describe("the commit line", () => {
    it("shows both halves of the speed dimension in one cell", () => {
      renderMatrix();
      const row = rowFor(163);
      if (row === null) throw new Error("no row for dispute 163");

      // blaise revealed 46s after the vote period opened, and committed 24s after the commit
      // period opened. Both figures, in the same unit, in the same cell.
      expect(within(row).getByText("46s")).toBeInTheDocument();
      expect(within(row).getByText("24s")).toBeInTheDocument();
    });

    it("names both measures for a reader who cannot see the legend", () => {
      renderMatrix();
      const row = rowFor(163);
      if (row === null) throw new Error("no row for dispute 163");

      // The keys beside the figures are `R` and `C` and are hidden from the accessibility
      // tree; the words are what a screen reader gets, once per drawn cell.
      expect(within(row).getAllByText("Reveal latency")).toHaveLength(5);
      expect(within(row).getAllByText("Commit latency")).toHaveLength(5);
    });

    it("keys the commit rail in the legend, now that the cells carry one", () => {
      renderMatrix();

      expect(screen.getByText("Commit")).toBeInTheDocument();
      expect(screen.getByText("Reveal")).toBeInTheDocument();
      expect(screen.getByText(/rail: 1s — 1h, log/i)).toBeInTheDocument();
    });

    it("reproduces the range the rail was drawn for", () => {
      renderMatrix();

      // 2m 06s to 53m 56s, both in dispute 151 — the spread that made the rail logarithmic.
      const row = rowFor(151);
      if (row === null) throw new Error("no row for dispute 151");
      expect(within(row).getByText("2m 06s")).toBeInTheDocument();
      expect(within(row).getByText("53m 56s")).toBeInTheDocument();
    });
  });

  describe("the commit cross-check", () => {
    it("says nothing when every commitment was found", () => {
      renderMatrix();

      expect(screen.queryByText(/could not be found on Arbitrum/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/could be read from Arbitrum/i)).not.toBeInTheDocument();
    });

    it("names the shortfall as a count when the log scan came back short", () => {
      // What a provider capping `eth_getLogs` produces: the subgraph still reports 56
      // commitments and only some of them have a log. The page has to say so — otherwise the
      // missing ones read as commitments that never happened.
      const short = build({ commits: (commitFixture as RawCommitCast[]).slice(0, 50) });
      renderMatrix(short);

      expect(screen.getByText(/6 of the 56 commitments/i)).toBeInTheDocument();
      // The words the cells actually carry. "Unknown" until ticket 13, which reassigned that word
      // to the unread *row* — so a notice still saying it would send a reader looking for whole
      // rows of Unknown and let them conclude the shortfall had blanked sixteen disputes.
      expect(screen.getByText(/those cells read "Not read"/i)).toBeInTheDocument();
      expect(screen.getByText(/not an agent juror that failed to commit/i)).toBeInTheDocument();
    });

    it("says nothing at all while the log read is still out", () => {
      // The load-order bug this guards: the chain answers slower than the subgraph and the
      // matrix deliberately does not wait for it, so for the first second of every cold load
      // no commitment is resolved. Counting that as a shortfall would put "none of the 56
      // commitments could be read" on the public page on every single visit.
      renderMatrix(build({ commits: null }));

      expect(screen.queryByText(/could not be found on Arbitrum/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/None of the 56 commitments/i)).not.toBeInTheDocument();
    });

    it("tells a read still out from a read that came back empty", () => {
      // Identical models but for one field, and the difference is a claim about an endpoint.
      renderMatrix(build({ commits: [] }));

      expect(screen.getByText(/None of the 56 commitments/i)).toBeInTheDocument();
    });

    it("says the whole read failed rather than counting when nothing came back at all", () => {
      renderMatrix(build({ commits: [] }));

      expect(screen.getByText(/None of the 56 commitments/i)).toBeInTheDocument();
      expect(screen.getByText(/no commit latency below is a measurement/i)).toBeInTheDocument();
    });

    it("keeps the reveal and coherence figures when no commitment could be read", () => {
      // The whole reason this degrades rather than blanks: an Arbitrum outage costs the commit
      // line, and nothing else on this page is read from Arbitrum.
      renderMatrix(build({ commits: [] }));
      const row = rowFor(163);
      if (row === null) throw new Error("no row for dispute 163");

      expect(within(row).getAllByText("Coherent")).toHaveLength(5);
      expect(within(row).getByText("46s")).toBeInTheDocument();
    });

    it("never blames an agent juror for a commitment it could not read", () => {
      renderMatrix(build({ commits: [] }));
      const row = rowFor(163);
      if (row === null) throw new Error("no row for dispute 163");

      // Five committed draws, five commit slots reading "Not read", and not one of them worded
      // as a miss. The words were "Unknown" until ticket 13, which gave that word to the unread
      // row and left this — a scan that came back short — saying what actually happened.
      expect(within(row).getAllByText("Not read")).toHaveLength(5);
      expect(within(row).queryByText("Missed")).not.toBeInTheDocument();
      expect(within(row).queryByText("No vote")).not.toBeInTheDocument();
    });
  });

  describe("a dispute whose draws were never read", () => {
    /**
     * The sixth cell state. It exists because a row with no cells and a row nobody asked about
     * look identical, and the difference between them is the difference between a fact about
     * the court and a gap in this dashboard.
     *
     * Built from a hand-made dispute rather than a fixture: every fixture is one successful
     * read, so none can hold a dispute that post-dates the read that returned it.
     */
    const READ_AT = 1787340123 * 1000;

    const newcomer = {
      id: "170",
      disputeID: "170",
      period: "evidence",
      ruled: false,
      currentRuling: "0",
      createdAt: String(READ_AT / 1000 + 600),
      lastPeriodChange: String(READ_AT / 1000 + 600),
      currentRoundIndex: "0",
      rounds: [{ id: "170-0", timeline: ["0", "0", "0", "0"] }],
      templateId: null,
    } as RawDispute;

    function renderDrifted() {
      renderMatrix(
        build({
          disputes: [newcomer, ...(disputeFixture as RawDispute[])],
          drawsReadAt: READ_AT,
        }),
      );
      const row = rowFor(170);
      if (row === null) throw new Error("no row for dispute 170");
      return row;
    }

    it("says not read in every slot where a figure belongs, never leaving one blank", () => {
      const row = renderDrifted();

      // Twice per cell — once for the reveal, once for the commit — plus the row header's own
      // not-read badge. The words are what let a reader name the row a gap without consulting
      // the legend, which is the criterion; rose alone would not.
      expect(within(row).getAllByText("Not read")).toHaveLength(ROSTER.length * 2 + 1);
      expect(within(row).getAllByText("Unknown")).toHaveLength(ROSTER.length);
    });

    it("never draws an unread cell as not drawn", () => {
      // The whole point. Its cells are all null, so a component testing for null first would
      // draw six "not drawn" dots — an unread state rendering as a fact about the court.
      const row = renderDrifted();

      expect(within(row).queryByText("Not drawn")).not.toBeInTheDocument();
    });

    it("never blames the row on an agent juror", () => {
      // Rose is shared with "no vote" and separated by glyph and word alone (ADR-0006). If the
      // separation ever collapses, this is where it shows.
      const row = renderDrifted();

      expect(within(row).queryByText("No vote")).not.toBeInTheDocument();
      expect(within(row).queryByText("Missed")).not.toBeInTheDocument();
    });

    it("says the row is unavailable rather than printing a panel of nobody", () => {
      // Its panel size is 0 because nobody asked, and "Panel 0" is exactly the sort of zero
      // this ticket exists to keep off a page that may be cited.
      const row = renderDrifted();

      // "Draws not read" and not "Row unavailable" since ticket 16: the phone's card list
      // fills the same slot, and a card has no row to be unavailable. It also names what is
      // missing rather than the element that was going to hold it.
      expect(within(row).getByText("Draws not read")).toBeInTheDocument();
      expect(within(row).queryByText(/Panel 0/)).not.toBeInTheDocument();
    });

    it("names Unknown in the legend only when the grid contains one", () => {
      renderMatrix(build());
      expect(screen.queryByText("Unknown")).not.toBeInTheDocument();

      renderDrifted();
      expect(screen.getAllByText("Unknown").length).toBeGreaterThan(0);
    });

    it("keeps an unread row's cells apart from a court that has not drawn yet", () => {
      // Two absences that are one row apart on a live court, and this asserts they never read
      // the same: the unread row says its draws were not read, and the dispute nobody has been
      // drawn for yet says it has no panel. Neither is "Panel 0", and only one of them is rose.
      const row = renderDrifted();

      expect(within(row).getByText("Draws not read")).toBeInTheDocument();
      expect(within(row).queryByText("No panel yet")).not.toBeInTheDocument();
    });

    it("stops calling any column never drawn, because an unread row is not part of the record", () => {
      // The claim the marginals made reachable, and the one this page must never make wrongly:
      // baskerville reads "Never drawn · 0 · 0v" over a court that has been read whole, and the
      // *first dispute it is ever drawn in* arrives in exactly the state this block describes —
      // created since the draws were last read, cells null because nobody asked. Saying "never
      // drawn" there is an unread state rendering as a fact about the court, over the single
      // observation this dashboard was built to catch.
      renderMatrix(build());
      expect(screen.getByText("Never drawn")).toBeInTheDocument();

      cleanup();
      renderDrifted();
      expect(screen.queryByText("Never drawn")).not.toBeInTheDocument();
      // The stack is a fact about how the agent juror was built, not about the court, so it
      // stands in — the column goes quiet about the record rather than blank about everything.
      expect(screen.getAllByText(ROSTER[5]?.stack.label ?? "").length).toBeGreaterThan(0);
    });
  });

  /**
   * A dispute that was read and has no panel yet — the reading a live court produces today.
   *
   * Disputes 167, 168 and 169 arrived in their evidence period on 2026-08-25 with nobody drawn,
   * and both layouts drew them as six blanks under a note saying every blank is random sparsity.
   * That claim is true of a dispute with a panel and false of one without: the draw has not
   * happened, rather than these agent jurors not having been selected. Hand-built, because the
   * captured court stops at 166 and holds no such dispute.
   */
  describe("a dispute the court has not drawn a panel for yet", () => {
    const waiting = {
      id: "167",
      disputeID: "167",
      period: "evidence",
      ruled: false,
      currentRuling: "0",
      createdAt: "1787620000",
      lastPeriodChange: "1787620000",
      currentRoundIndex: "0",
      rounds: [{ id: "167-0", timeline: ["0", "0", "0", "0"] }],
      templateId: null,
    } as RawDispute;

    function renderWaiting() {
      // `drawsReadAt` stays null, so every row is *read*: this dispute's blank cells are a fact
      // about the court and not a gap in the read, which is the whole distinction.
      renderMatrix(build({ disputes: [waiting, ...(disputeFixture as RawDispute[])] }));
      const row = rowFor(167);
      if (row === null) throw new Error("no row for dispute 167");
      return row;
    }

    it("never prints a panel of nobody", () => {
      const row = renderWaiting();

      expect(within(row).queryByText(/Panel 0/)).not.toBeInTheDocument();
      expect(within(row).getByText("No panel yet")).toBeInTheDocument();
    });

    it("does not word it as a read that failed", () => {
      // Ticket 13's instruction: a court that has not drawn yet is not a read that came up
      // short, and ADR-0006 gives rose two meanings, neither of which is this.
      const row = renderWaiting();

      expect(within(row).queryByText("Draws not read")).not.toBeInTheDocument();
      expect(within(row).queryByText("Unknown")).not.toBeInTheDocument();
      expect(within(row).getAllByText("Not drawn")).toHaveLength(ROSTER.length);
    });

    it("says nothing about it on a court where every dispute has a panel", () => {
      // A caveat naming a case that does not apply reads as a caveat about the whole page.
      renderMatrix();

      expect(screen.queryByText(/a different absence/i)).not.toBeInTheDocument();
    });
  });

  /**
   * The two densities, and that the difference between them is exactly the stated reduction.
   *
   * Ticket 17. Every case here renders one court at both densities — the same fixture padded to
   * either side of `COMPACT_FROM_ROWS` — because what has to hold is a *difference*, and a case
   * that only ever saw the compact form could not tell a reduction from a bug.
   */
  describe("the two densities", () => {
    it("compacts past the threshold and not at it, whatever the threshold is", () => {
      // The switch itself, from the row count in the model rather than from anything a reader
      // set: there is no control for this on the page.
      renderMatrix(comfortableCourt());
      expect(screen.getAllByText("Median commit latency")).toHaveLength(ROSTER.length);

      cleanup();
      renderMatrix(compactCourt());
      expect(screen.queryByText("Median commit latency")).not.toBeInTheDocument();
    });

    it("keeps every dispute, in the same order, at both densities", () => {
      // The whole reason for compacting: density never filters, paginates, collapses, reorders
      // or windows away a row.
      renderMatrix(comfortableCourt());
      const comfortable = renderedIds();

      cleanup();
      renderMatrix(compactCourt());
      const compact = renderedIds();

      expect(comfortable).toHaveLength(COMPACT_FROM_ROWS);
      expect(compact).toHaveLength(COMPACT_FROM_ROWS + 1);
      // Newest first, and the compact list is the comfortable one with the extra row at its head.
      expect([...compact].sort((a, b) => b - a)).toEqual(compact);
      expect(compact).toEqual(expect.arrayContaining(comfortable));
    });

    it("keeps the six columns and their order", () => {
      renderMatrix(compactCourt());

      const columns = screen.getAllByRole("columnheader");
      expect(columns).toHaveLength(ROSTER.length + 1);
      expect(columns.slice(1).map((column) => column.textContent)).toEqual(
        ROSTER.map((agentJuror) => expect.stringContaining(agentJuror.nickname)),
      );
    });

    it("halves the cell rather than reflowing it", () => {
      renderMatrix(comfortableCourt());
      const tall = getComputedStyle(within(rowOrThrow(156)).getAllByRole("cell")[0] as HTMLElement);

      cleanup();
      renderMatrix(compactCourt());
      const short = getComputedStyle(
        within(rowOrThrow(156)).getAllByRole("cell")[0] as HTMLElement,
      );

      // The ratio is the requirement; the artboards disagree about the pixel.
      expect(Number.parseFloat(short.height) * 2).toBe(Number.parseFloat(tall.height));
    });

    it("drops the commit line from the cell and nothing else that carries a figure", () => {
      renderMatrix(compactCourt());
      const row = rowOrThrow(156);
      const cell = within(row).getAllByRole("cell")[0] as HTMLElement;

      // What survives: the reveal, said as a duration, with the state it belongs to.
      expect(within(cell).getByText("Reveal latency", { exact: false })).toBeInTheDocument();
      expect(within(cell).getByText(/^\d+s$/)).toBeInTheDocument();
      // What goes: the commit figure, its key and its rail. Never rendered empty — an empty slot
      // beside a full one reads as missing data.
      expect(within(cell).queryByText("Commit latency")).not.toBeInTheDocument();
      expect(within(cell).queryByText("C")).not.toBeInTheDocument();
      expect(within(cell).queryByText("R")).not.toBeInTheDocument();
    });

    it("keeps the coherence state in the compact cell, in a glyph and in words", () => {
      renderMatrix(compactCourt());
      const row = rowOrThrow(156);
      const cell = within(row).getAllByRole("cell")[0] as HTMLElement;

      // The word stops being drawn and does not stop being said: the glyph beside it is
      // decoration, and a reader hearing this page would otherwise have a bare number. 007
      // diverged in dispute 156, which is one of the two states that carry a fill.
      expect(cell.textContent).toContain("Diverged");
      expect(cell.textContent).toContain("✕");
      // ADR-0006: the fill and the border are what keep the five states apart in greyscale, so
      // a filled state stays filled at this density.
      const filled = within(row)
        .getAllByRole("cell")
        .map((box) => getComputedStyle(box).boxShadow)
        .filter((shadow) => shadow !== "" && shadow !== "none");
      expect(filled.length).toBeGreaterThan(0);
    });

    it("drops the vote-count annotation with the rest of the cell's second voice", () => {
      renderMatrix(comfortableCourt());
      expect(screen.getAllByText(/^×\d+$/).length).toBeGreaterThan(0);

      cleanup();
      renderMatrix(compactCourt());
      expect(screen.queryByText(/^×\d+$/)).not.toBeInTheDocument();
    });

    it("draws an agent juror that was not drawn identically at both densities", () => {
      // The emptiest state and the loudest have to stay unconfusable however far the matrix is
      // compressed — so the blank keeps its one dot, and gains no tile, border or glyph.
      renderMatrix(comfortableCourt());
      const comfortable = blankCellOf(155);

      cleanup();
      renderMatrix(compactCourt());
      const compact = blankCellOf(155);

      expect(compact.textContent).toBe(comfortable.textContent);
      expect(getComputedStyle(compact).boxShadow).toBe(getComputedStyle(comfortable).boxShadow);
      expect(getComputedStyle(compact).backgroundColor).toBe(
        getComputedStyle(comfortable).backgroundColor,
      );
    });

    it("carries commit latency on the row once the cell has stopped carrying it", () => {
      renderMatrix(compactCourt());
      const row = rowOrThrow(156);

      // One figure on the row, and none in any of its six cells.
      expect(
        within(row).getByText(/^Median commit latency across \d+ draws in this dispute$/),
      ).toBeInTheDocument();
      for (const cell of within(row).getAllByRole("cell")) {
        expect(within(cell).queryByText("Commit latency")).not.toBeInTheDocument();
      }
    });

    it("names what the row's commit figure summarises rather than standing as a number", () => {
      renderMatrix(compactCourt());
      const row = rowOrThrow(156);

      // A row holds up to six draws and one figure cannot be all of them. "MED" is what says so
      // in the 40 pixels the row can spare; the count of draws behind it is in the accessible
      // name, where it costs a reader who cannot see the row nothing.
      expect(within(row).getByText("MED C")).toBeInTheDocument();
      expect(
        within(row).getByText(/^Median commit latency across \d+ draws in this dispute$/),
      ).toBeInTheDocument();
    });

    it("says nothing on the row about a commit read that has not come back", () => {
      // The `RosterView` trap in its fifth place: between the subgraph's answer and Arbitrum's,
      // every commitment is unread, and a row reading "Not read" on every cold load would
      // announce a failure before it happened.
      renderMatrix(padToUnscanned());
      const row = rowOrThrow(156);

      expect(within(row).queryByText("Not read")).not.toBeInTheDocument();
      expect(within(row).getByText("MED C").parentElement?.textContent).toContain("—");
    });

    it("keeps three of the six figures in the column header and drops three", () => {
      renderMatrix(compactCourt());

      for (const kept of [
        "Median reveal latency",
        "Coherent draws, of the draws the court has ruled on",
        "Draws, and the vote IDs they hold",
      ]) {
        expect(screen.getAllByText(kept)).toHaveLength(ROSTER.length);
      }
      for (const dropped of [
        "Median commit latency",
        "Cumulative ETH earned",
        "Net PNK gained or lost",
      ]) {
        expect(screen.queryByText(dropped)).not.toBeInTheDocument();
      }
    });

    it("keeps every marker on the figures it keeps, and the full account one click away", () => {
      // A caveat is never among what density drops. The mark stays on the number, it stays a
      // link to the account at /method, and the two footnotes below the grid state both facts
      // in full at either density.
      renderMatrix(compactCourt());

      expect(screen.getAllByText("†").length).toBeGreaterThan(0);
      expect(screen.getAllByText("‡").length).toBeGreaterThan(0);
      expect(
        screen.getAllByRole("link", { name: /why .* median reveal is marked/i })[0],
      ).toHaveAttribute("href", "/method#window");
      expect(screen.getByText(/ran with a commit window of/i)).toBeInTheDocument();
      expect(screen.getByText(/was decided by a panel of one/i)).toBeInTheDocument();
    });

    it("draws no reason line at either density, and carries it on the marker at both", () => {
      // Ticket 06's hand-off, taken at the compact density by ticket 17 and at the comfortable
      // one once this block was measured on the live court: five near-duplicate paragraphs and
      // 350px of column header, and — because a paragraph's height varies with its own wrapping
      // — the six columns' figures on three different baselines, which is the one comparison a
      // block of marginals exists to allow. What a sighted reader loses is the fourth telling of
      // a caveat already on the figure, in the footnote below the grid and at /method; what a
      // reader hearing the page gets is the same sentence, on the mark itself, at both.
      for (const court of [comfortableCourt(), compactCourt()]) {
        renderMatrix(court);
        expect(screen.queryByText(/draws ran under a vote window of/i)).not.toBeInTheDocument();
        expect(
          screen.getAllByRole("link", { name: /why .*median reveal is marked: .*draws ran under/i })
            .length,
        ).toBeGreaterThan(0);
        cleanup();
      }
    });

    it("holds its declared measurements at both densities rather than asking for them", () => {
      // The defect this pins is three tickets old and was invisible to every test here, because
      // jsdom lays nothing out and a width is a layout. The comfortable table was table-layout
      // auto, so its 440px row header and 148px columns were a suggestion: the page had 1104px
      // to give a grid asking for 1328, and an auto table resolves that by shrinking whatever
      // can shrink. Six columns of identity and figures cannot; the dispute title can, and did,
      // down to 180px of its natural 836 — a 1440px desktop showing a fifth of a question the
      // 390pt phone showed whole. What is assertable offline is the declaration; the width it
      // produces was measured in a browser.
      for (const [court, floor] of [
        [comfortableCourt(), "1328px"],
        [compactCourt(), "1064px"],
      ] as const) {
        renderMatrix(court);
        const table = screen.getByRole("table");
        expect(getComputedStyle(table).tableLayout).toBe("fixed");
        expect(getComputedStyle(table).minWidth).toBe(floor);
        cleanup();
      }
    });

    it("freezes the column header and nothing else", () => {
      renderMatrix(compactCourt());

      for (const column of screen.getAllByRole("columnheader")) {
        expect(getComputedStyle(column).position).toBe("sticky");
        expect(getComputedStyle(column).top).toBe("0px");
      }
      // The rows, the legend and the footnotes scroll past it: one scroll context, one frozen
      // element. A row header that stuck would pin a dispute to the top of the viewport.
      expect(getComputedStyle(screen.getByRole("rowheader", { name: /^156\b/ })).position).not.toBe(
        "sticky",
      );
    });

    it("leaves the column header unfrozen at the comfortable density", () => {
      renderMatrix(comfortableCourt());

      for (const column of screen.getAllByRole("columnheader")) {
        expect(getComputedStyle(column).position).not.toBe("sticky");
      }
    });

    it("says in the corner cell what the density did", () => {
      renderMatrix(compactCourt());

      // So a reader meets the reduction as a stated choice rather than as a figure that went
      // missing, and knows where the one that moved has moved to.
      const corner = screen.getAllByRole("columnheader")[0] as HTMLElement;
      expect(corner.textContent).toContain("Reveal latency and coherence survive at this density");
      expect(corner.textContent).toContain("commit latency moves to the row");
    });

    it("takes the second line off the row and leaves everything else on it", () => {
      const slots = () => ({ title: "An escrow dispute", category: "Escrow" });

      renderMatrix(comfortableCourt(), slots);
      const comfortable = rowOrThrow(156);
      expect(within(comfortable).getByText("Escrow")).toBeInTheDocument();
      expect(within(comfortable).getByText("Ruling 2")).toBeInTheDocument();

      cleanup();
      renderMatrix(compactCourt(), slots);
      const compact = rowOrThrow(156);
      // What the row loses is closed: the category and the ruling, and nothing else.
      expect(within(compact).queryByText("Escrow")).not.toBeInTheDocument();
      expect(within(compact).queryByText("Ruling 2")).not.toBeInTheDocument();
      expect(within(compact).getByText("An escrow dispute")).toBeInTheDocument();
      expect(within(compact).getByText(/med c/i)).toBeInTheDocument();
      expect(within(compact).getByRole("link", { name: "156" })).toBeInTheDocument();
    });

    it("keeps every flag and the precedence between them, abbreviated", () => {
      renderMatrix(comfortableCourt());
      expect(within(rowOrThrow(151)).getByText(/8h window/)).toBeInTheDocument();
      expect(within(rowOrThrow(155)).getByText("Lone panel")).toBeInTheDocument();

      cleanup();
      renderMatrix(compactCourt());

      // Dispute 151 still wears the window flag over its lone-panel neighbour: the precedence is
      // `row-flags.ts`'s and density does not touch it. What density touches is the qualifier
      // after the flag, which the dense artboard drops (`MatrixDense.dc.html:213`) — every row
      // still says *which* flag it wears, and 175px of live pill stops eating the title.
      expect(within(rowOrThrow(151)).getByText("8h")).toBeInTheDocument();
      expect(within(rowOrThrow(155)).getByText("Lone")).toBeInTheDocument();
      expect(within(rowOrThrow(166)).getByText("Live")).toBeInTheDocument();
      expect(screen.queryByText(/Live · appeal/i)).not.toBeInTheDocument();
    });

    it("keys only the rails the compact cell actually carries", () => {
      // Ticket 07's instruction against this legend group: a page that keys a commit rail no
      // cell wears is decoding a mark the reader cannot find.
      renderMatrix(comfortableCourt());
      expect(screen.getByText("Commit")).toBeInTheDocument();

      cleanup();
      renderMatrix(compactCourt());
      expect(screen.queryByText("Commit")).not.toBeInTheDocument();
      expect(screen.getByText("Reveal")).toBeInTheDocument();
      expect(screen.getByText("Rail: 1s — 1h, log")).toBeInTheDocument();
    });

    it("says that volume does not resolve sparsity, which sixteen rows never tempted anyone to think", () => {
      renderMatrix(compactCourt());

      // The sentence a reader scrolling hundreds of rows needs and one reading sixteen does not.
      // The counts themselves are the sparsity note's, in the footer — this says the one thing
      // volume tempts a reader to assume away, from the same `totals.sparsity` the note quotes.
      const volume = screen.getByText(/sparsity does not resolve with volume/i);
      expect(volume).toHaveTextContent(/still blank across all \d+ disputes/);
    });

    it("leaves the volume note off the comfortable density", () => {
      renderMatrix(comfortableCourt());

      expect(screen.queryByText(/sparsity does not resolve with volume/i)).not.toBeInTheDocument();
    });

    it("says where the commit figure went, in the corner cell that is left to say it", () => {
      // This used to assert the lede and the corner cell agreed, after review found the lede
      // promising a commit figure in a cell that no longer had one. There is no lede now — it
      // described a cell to a reader looking at a hundred and sixty-eight of them, under a
      // legend keying every state — so the corner is the only voice and there is nothing left
      // to disagree with it.
      renderMatrix(comfortableCourt());
      expect(screen.getByText(/newest first\. one row per dispute/i)).toBeInTheDocument();
      expect(screen.queryByText(/commit latency moves to the row/i)).not.toBeInTheDocument();

      cleanup();
      renderMatrix(compactCourt());
      expect(screen.getByText(/commit latency moves to the row/i)).toBeInTheDocument();
    });

    it("sends nobody looking for a shortfall in cells that carry no commit figure", () => {
      // The shortfall notice named cells reading "Not read" — true of the comfortable cell and
      // false of the compact one, which has no commit slot at all. At this density a partial
      // shortfall shrinks each row's median instead, silently, so the notice has to say that.
      const short = (commitFixture as RawCommitCast[]).slice(0, 5);

      renderMatrix(padTo(COMPACT_FROM_ROWS, { commits: short }));
      expect(screen.getByRole("status")).toHaveTextContent(/those cells read "Not read"/);

      cleanup();
      renderMatrix(padTo(COMPACT_FROM_ROWS + 1, { commits: short }));
      const notice = screen.getByRole("status");
      expect(notice).not.toHaveTextContent(/those cells read/);
      expect(notice).toHaveTextContent(/each row's median commit is taken over fewer draws/);
    });

    it("says not read on the row of a dispute whose draws were never read", () => {
      // An unread row has no cells, so the row's median has nothing to reduce and would fall
      // through to the em dash this design defines as "nothing to measure" — an unread state
      // stating a fact about the court, in the one figure a compact row carries.
      const padded = padCourt(COMPACT_FROM_ROWS);
      const newcomer = {
        id: "300",
        disputeID: "300",
        period: "evidence",
        ruled: false,
        currentRuling: "0",
        createdAt: String(NOW / 1000 + 600),
        lastPeriodChange: String(NOW / 1000 + 600),
        currentRoundIndex: "0",
        rounds: [{ id: "300-0", timeline: ["0", "0", "0", "0"] }],
        templateId: null,
      } as RawDispute;

      renderMatrix(
        build({
          ...padded,
          disputes: [newcomer, ...padded.disputes],
          drawsReadAt: NOW,
        }),
      );
      const row = rowOrThrow(300);

      expect(within(row).getByText("MED C").parentElement).toHaveTextContent("Not read");
      expect(within(row).queryByText("—")).not.toBeInTheDocument();
    });
  });

  it("never calls a column never drawn over a court that has drawn nobody at all", () => {
    // Every read dispute still in its evidence period — a court in its opening hours, and the
    // one case where "never drawn" and "blank end to end" are claims about a draw that has not
    // happened rather than about six agent jurors. Found by review on this ticket's own figures.
    const waiting = [167, 168, 169].map(
      (id) =>
        ({
          id: String(id),
          disputeID: String(id),
          period: "evidence",
          ruled: false,
          currentRuling: "0",
          createdAt: "1787620000",
          lastPeriodChange: "1787620000",
          currentRoundIndex: "0",
          rounds: [{ id: `${id}-0`, timeline: ["0", "0", "0", "0"] }],
          templateId: null,
        }) as RawDispute,
    );

    renderMatrix(build({ disputes: waiting, draws: [], commits: [], rewards: [] }));

    expect(screen.queryByText("Never drawn")).not.toBeInTheDocument();
    expect(screen.queryByText(/blank end to end/i)).not.toBeInTheDocument();
    // And it still says what it does know: nobody has been drawn for any of them.
    expect(screen.getAllByText("No panel yet")).toHaveLength(waiting.length);
  });
});
