import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { describe, expect, it } from "vitest";
import { Dashboard } from "./Dashboard";
import fixture from "./disputes/court-34.fixture.json" with { type: "json" };
import type { DisputeListView } from "./disputes/DisputeList";
import { type RawDispute, toDisputes } from "./disputes/disputes";
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

function renderDashboard(roster: RosterView, disputeList: DisputeListView = disputes) {
  return render(
    <ThemeProvider theme={theme}>
      <Dashboard roster={roster} disputes={disputeList} />
    </ThemeProvider>,
  );
}

describe("Dashboard", () => {
  it("names the dashboard", () => {
    renderDashboard(resolved);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("AI Juror Dashboard");
  });

  it("states that it holds no measurements, rather than rendering an empty result", () => {
    renderDashboard(resolved);

    expect(screen.getByText(/nothing measured yet/i)).toBeInTheDocument();
  });

  it("shows every agent juror by nickname, including the one never drawn", () => {
    renderDashboard(resolved);

    for (const agentJuror of ROSTER) {
      expect(screen.getByText(agentJuror.nickname)).toBeInTheDocument();
    }
    expect(screen.getByText("baskerville")).toBeInTheDocument();
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

    expect(avatars).toHaveLength(ROSTER.length);
    expect(avatars[0]).toHaveAttribute("src", expect.stringContaining("euc.li"));
  });

  it("falls back to roster nicknames and says so when ENS cannot be reached", () => {
    renderDashboard(unresolved);

    expect(screen.getByText(/ENS could not be reached/i)).toBeInTheDocument();
    expect(screen.queryAllByRole("presentation")).toHaveLength(0);
    for (const agentJuror of ROSTER) {
      expect(screen.getByText(agentJuror.nickname)).toBeInTheDocument();
    }
  });

  it("does not caveat ENS when ENS worked", () => {
    renderDashboard(resolved);

    expect(screen.queryByText(/ENS could not be reached/i)).not.toBeInTheDocument();
  });

  it("lists the court's disputes alongside the roster", () => {
    renderDashboard(resolved);

    expect(screen.getByRole("heading", { name: /the disputes/i })).toBeInTheDocument();
    expect(screen.getByText("151")).toBeInTheDocument();
    expect(screen.getByText("166")).toBeInTheDocument();
  });

  it("still says it holds no measurement now that disputes are shown", () => {
    // The caveat used to claim no dispute had been read, which this ticket made false.
    // What must survive is the part that matters: the page holds no metric.
    renderDashboard(resolved);

    expect(screen.getByText(/nothing measured yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/no draw, latency or coherence figure has been read/i),
    ).toBeInTheDocument();
  });
});
