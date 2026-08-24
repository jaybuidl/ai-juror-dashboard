import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { describe, expect, it } from "vitest";
import { Dashboard } from "./Dashboard";
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

function renderDashboard(roster: RosterView) {
  return render(
    <ThemeProvider theme={theme}>
      <Dashboard roster={roster} />
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
});
