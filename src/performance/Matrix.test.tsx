import { render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { describe, expect, it } from "vitest";
import disputeFixture from "../disputes/court-34.fixture.json" with { type: "json" };
import type { DisputeRowSlots } from "../disputes/DisputeList";
import type { Dispute, RawDispute } from "../disputes/disputes";
import { ROSTER } from "../roster/agent-jurors";
import { rosterIdentity } from "../roster/ens";
import type { RosterView } from "../roster/useRoster";
import { theme } from "../styles/theme";
import drawFixture from "./court-34-draws.fixture.json" with { type: "json" };
import { Matrix } from "./Matrix";
import {
  buildCourtPerformance,
  type CourtPerformance,
  type RawCourtData,
  type RawDraw,
} from "./performance";

const roster: RosterView = {
  entries: ROSTER.map((agentJuror) => ({ agentJuror, identity: rosterIdentity(agentJuror) })),
  isResolving: false,
  isResolvedFromEns: false,
};

function build(raw: Partial<RawCourtData> = {}): CourtPerformance {
  const result = buildCourtPerformance({
    disputes: disputeFixture as RawDispute[],
    draws: drawFixture as RawDraw[],
    roster: ROSTER,
    ...raw,
  });
  if (!result.success) throw new Error(`${result.code}: ${result.message}`);
  return result.data;
}

function renderMatrix(
  performance: CourtPerformance = build(),
  slotsFor?: (dispute: Dispute) => DisputeRowSlots,
) {
  return render(
    <ThemeProvider theme={theme}>
      <Matrix performance={performance} roster={roster} slotsFor={slotsFor} />
    </ThemeProvider>,
  );
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
    });
    renderMatrix(missed);

    expect(screen.getAllByText("No vote").length).toBeGreaterThan(0);
    // The reveal figure reads as a miss, not as a number and not as a blank.
    expect(screen.getByText("Missed")).toBeInTheDocument();
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
    });
    renderMatrix(acting);

    expect(screen.getByText("Committed")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
