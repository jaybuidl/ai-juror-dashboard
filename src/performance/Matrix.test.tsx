import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ThemeProvider } from "styled-components";
import { describe, expect, it } from "vitest";
import disputeFixture from "../disputes/court-34.fixture.json" with { type: "json" };
import type { DisputeRowSlots } from "../disputes/DisputeList";
import type { Dispute, RawDispute } from "../disputes/disputes";
import { ROSTER } from "../roster/agent-jurors";
import { rosterIdentity } from "../roster/ens";
import type { RosterView } from "../roster/useRoster";
import { theme } from "../styles/theme";
import commitFixture from "./court-34-commits.fixture.json" with { type: "json" };
import drawFixture from "./court-34-draws.fixture.json" with { type: "json" };
import parameterFixture from "./court-34-parameters.fixture.json" with { type: "json" };
import { Matrix } from "./Matrix";
import {
  buildCourtPerformance,
  type CourtPerformance,
  type RawCommitCast,
  type RawCourtData,
  type RawDraw,
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

function renderMatrix(
  performance: CourtPerformance = build(),
  slotsFor?: (dispute: Dispute) => DisputeRowSlots,
  now: number = NOW,
) {
  // Inside a router since ticket 08: the window footnote links to the method page's account of
  // the two period regimes, which is a part of the matrix and not of the page around it.
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <Matrix performance={performance} roster={roster} slotsFor={slotsFor} now={now} />
      </MemoryRouter>
    </ThemeProvider>,
  );
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
    // The row draws its own panel pill; a filled title slot does not displace it.
    expect(within(titled).getByText(/^Panel \d+$/)).toBeInTheDocument();

    // 152 resolves no title here, which is what a dispute with no template looks like. It keeps
    // its row and its header rather than dropping out of the matrix.
    const untitled = screen.getByText("152").closest("tr") as HTMLElement;
    expect(within(untitled).getByText(/^Panel \d+$/)).toBeInTheDocument();
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

  it("puts panel size on the row and never in a cell", () => {
    renderMatrix();
    const row = rowFor(163);
    if (row === null) throw new Error("no row for dispute 163");

    expect(within(row).getByText("Panel 5")).toBeInTheDocument();
    expect(within(row).queryAllByText(/panel/i)).toHaveLength(1);
  });

  it("flags a dispute decided by a panel of one, and explains why it matters", () => {
    renderMatrix();
    const row = rowFor(155);
    if (row === null) throw new Error("no row for dispute 155");

    expect(within(row).getByText("Panel 1")).toBeInTheDocument();
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

      expect(within(row).getByText("Panel 1")).toBeInTheDocument();
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

  it("says in the page that a blank cell is the normal case", () => {
    renderMatrix();

    expect(screen.getByText(/sparsity is the normal state of this matrix/i)).toBeInTheDocument();
    expect(screen.getByText(/one column is blank end to end/i)).toBeInTheDocument();
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
    expect(screen.getByText("Missed")).toBeInTheDocument();
    // And the commit that did happen is still a figure: a draw can commit and never reveal.
    expect(screen.getByText("60s")).toBeInTheDocument();
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
    expect(screen.getByText("—")).toBeInTheDocument();
    // The reveal is the dash; the commit already has a moment, and the cell shows both.
    expect(screen.getByText("50s")).toBeInTheDocument();
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

      expect(within(row).getByText("Row unavailable")).toBeInTheDocument();
      expect(within(row).queryByText(/Panel 0/)).not.toBeInTheDocument();
    });

    it("keeps the gap out of the sparsity count, which is about draws and not about reads", () => {
      renderDrifted();

      // The sparsity card's claim — that every blank means an agent juror was not drawn — is
      // true of the rows that were read and false of the one that was not. Folding the unread
      // row's six nulls into that count would make the sentence false about six of them.
      expect(screen.getByText(/not counted here at all/i, { selector: "p" })).toBeInTheDocument();
    });

    it("names Unknown in the legend only when the grid contains one", () => {
      renderMatrix(build());
      expect(screen.queryByText("Unknown")).not.toBeInTheDocument();

      renderDrifted();
      expect(screen.getAllByText("Unknown").length).toBeGreaterThan(0);
    });
  });
});
