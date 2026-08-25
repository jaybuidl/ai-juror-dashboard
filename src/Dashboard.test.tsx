import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { describe, expect, it } from "vitest";
import { Dashboard } from "./Dashboard";
import fixture from "./disputes/court-34.fixture.json" with { type: "json" };
import type { DisputeListView } from "./disputes/DisputeList";
import { type RawDispute, toDisputes } from "./disputes/disputes";
import commitFixture from "./performance/court-34-commits.fixture.json" with { type: "json" };
import drawFixture from "./performance/court-34-draws.fixture.json" with { type: "json" };
import { buildCourtPerformance, type RawCommitCast, type RawDraw } from "./performance/performance";
import type { CourtPerformanceView } from "./performance/useCourtPerformance";
import { ROSTER } from "./roster/agent-jurors";
import { rosterIdentity } from "./roster/ens";
import type { RosterView } from "./roster/useRoster";
import { theme } from "./styles/theme";

/** What the page has before ENS answers, and keeps if it never does. */
const unresolved: RosterView = {
  entries: ROSTER.map((agentJuror) => ({ agentJuror, identity: rosterIdentity(agentJuror) })),
  isResolving: false,
  isResolvedFromEns: false,
};

/** What the page has once ENS answers for everyone. */
const resolved: RosterView = {
  entries: ROSTER.map((agentJuror) => ({
    agentJuror,
    identity: {
      address: agentJuror.address,
      nickname: agentJuror.nickname,
      avatarUrl: `https://euc.li/${agentJuror.nickname}.agents.kleroslabs.eth`,
      resolvedFromEns: true,
    },
  })),
  isResolving: false,
  isResolvedFromEns: true,
};

/** The court as the dashboard holds it, read from the captured payload. */
const disputes: DisputeListView = {
  disputes: toDisputes(fixture as RawDispute[]),
  isLoading: false,
  error: null,
};

const built = buildCourtPerformance({
  disputes: fixture as RawDispute[],
  draws: drawFixture as RawDraw[],
  commits: commitFixture as RawCommitCast[],
  roster: ROSTER,
});
if (!built.success) throw new Error(`${built.code}: ${built.message}`);

/** The matrix, measured from the same payload. */
const measured: CourtPerformanceView = {
  performance: built.data,
  commitError: null,
  isLoading: false,
  error: null,
};

/** What the page has when the draws could not be read at all. */
const unmeasured: CourtPerformanceView = {
  performance: null,
  isLoading: false,
  error: new Error("Core subgraph returned HTTP 503 Service Unavailable"),
  commitError: null,
};

function renderDashboard(
  roster: RosterView,
  performance: CourtPerformanceView = measured,
  disputeList: DisputeListView = disputes,
) {
  return render(
    <ThemeProvider theme={theme}>
      <Dashboard roster={roster} disputes={disputeList} performance={performance} />
    </ThemeProvider>,
  );
}

describe("Dashboard", () => {
  it("names the dashboard", () => {
    renderDashboard(resolved);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("AI Juror Dashboard");
  });

  it("says what it has measured and, in the same breath, what it has not", () => {
    renderDashboard(resolved);

    expect(screen.getByText(/three measures, and what is missing from them/i)).toBeInTheDocument();
    expect(
      screen.getByText(/per-agent-juror summaries and rewards have not been read/i),
    ).toBeInTheDocument();
  });

  it("claims no measurement it has not made", () => {
    // The page now holds two figures, so the old blanket caveat would be false. What has to
    // survive is the half that still is true: everything it has not read, said outright.
    renderDashboard(resolved);

    expect(screen.queryByText(/nothing measured yet/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/no figure here is a fraction of a period's window/i),
    ).toBeInTheDocument();
  });

  it("shows every agent juror by nickname, including the one never drawn", () => {
    renderDashboard(resolved);

    for (const agentJuror of ROSTER) {
      // Twice over: once on the roster, once as a column of the matrix.
      expect(screen.getAllByText(agentJuror.nickname).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText("baskerville").length).toBeGreaterThan(0);
  });

  it("shows each agent juror's stack", () => {
    renderDashboard(resolved);

    for (const agentJuror of ROSTER) {
      expect(screen.getAllByText(agentJuror.stack.label).length).toBeGreaterThan(0);
    }
  });

  it("shows an avatar per agent juror when ENS resolved", () => {
    renderDashboard(resolved);

    // Decorative: the nickname beside it is the accessible name, so an empty alt is
    // correct and screen readers are not told the same thing twice.
    const avatars = screen.getAllByRole("presentation");

    expect(avatars).toHaveLength(ROSTER.length * 2);
    expect(avatars[0]).toHaveAttribute("src", expect.stringContaining("euc.li"));
  });

  it("falls back to roster nicknames and says so when ENS cannot be reached", () => {
    renderDashboard(unresolved);

    expect(screen.getByText(/ENS could not be reached/i)).toBeInTheDocument();
    expect(screen.queryAllByRole("presentation")).toHaveLength(0);
    for (const agentJuror of ROSTER) {
      expect(screen.getAllByText(agentJuror.nickname).length).toBeGreaterThan(0);
    }
  });

  it("does not caveat ENS when ENS worked", () => {
    renderDashboard(resolved);

    expect(screen.queryByText(/ENS could not be reached/i)).not.toBeInTheDocument();
  });

  it("hangs the matrix off the court's disputes, newest first", () => {
    renderDashboard(resolved);

    expect(screen.getByRole("heading", { name: /the matrix/i })).toBeInTheDocument();

    const rows = screen.getAllByRole("rowheader");

    expect(rows[0]).toHaveTextContent("166");
    expect(rows[rows.length - 1]).toHaveTextContent("151");
  });

  it("lists the disputes and says why, when the matrix cannot be built", () => {
    // A matrix built from a partial read would be a page of blank cells, and a blank cell says
    // an agent juror was not drawn. The record is shown instead, and the gap is stated.
    renderDashboard(resolved, unmeasured);

    expect(
      screen.getByText(/the matrix could not be built from what was read/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /the disputes/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /the matrix/i })).not.toBeInTheDocument();
    expect(screen.getByText("151")).toBeInTheDocument();
  });

  it("does not describe cells and coherence above a page that is showing neither", () => {
    // The caveat can overstate as easily as the matrix can. On the failure path it says what
    // was not measured on this load, rather than how to read a matrix that is not there.
    renderDashboard(resolved, unmeasured);

    expect(screen.getByText(/nothing measured on this load/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/a blank cell means an agent juror was not drawn/i),
    ).not.toBeInTheDocument();
  });

  it("says nothing about a failed read while the read is still out", () => {
    renderDashboard(resolved, {
      performance: null,
      isLoading: true,
      error: null,
      commitError: null,
    });

    expect(screen.queryByText(/the matrix could not be built/i)).not.toBeInTheDocument();
  });

  it("says the matrix may be stale when the court could not be re-read", () => {
    // react-query keeps the rows already held when a refetch fails, so the matrix rebuilds and
    // stays on the page. Rendering it silently would show an hour-old court as the full record.
    renderDashboard(resolved, measured, {
      ...disputes,
      error: new Error("Core subgraph returned HTTP 503 Service Unavailable"),
    });

    expect(screen.getByText(/this matrix may be incomplete or out of date/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /the matrix/i })).toBeInTheDocument();
  });
});
