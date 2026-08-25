import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ROSTER } from "../roster/agent-jurors";
import { renderAt, resolvingRoster, unresolvedRoster } from "../test/court";

/**
 * The agent-juror index.
 *
 * Ticket 02's promise — that all six are named, with their stacks and avatars, and that a
 * fallback to the checked-in roster is said out loud — moved here from the landing page when
 * ticket 15 gave the nav's agent-juror destination somewhere to go. These are its tests,
 * carried across so that promise is still pinned somewhere.
 */

describe("the agent-juror index", () => {
  it("shows every agent juror by nickname, including the one never drawn", () => {
    renderAt("/agent-jurors");

    for (const agentJuror of ROSTER) {
      expect(screen.getByText(agentJuror.nickname)).toBeInTheDocument();
    }
    expect(screen.getByText("baskerville")).toBeInTheDocument();
  });

  it("shows each agent juror's stack", () => {
    renderAt("/agent-jurors");

    // Two agent jurors can share a stack, so the assertion is that each label is present —
    // not that it is unique.
    for (const agentJuror of ROSTER) {
      expect(screen.getAllByText(agentJuror.stack.label).length).toBeGreaterThan(0);
    }
  });

  it("shows an avatar per agent juror when ENS resolved", () => {
    renderAt("/agent-jurors");

    // Decorative: the nickname beside it is the accessible name, so an empty alt is
    // correct and screen readers are not told the same thing twice.
    const avatars = screen.getAllByRole("presentation");

    expect(avatars).toHaveLength(ROSTER.length);
    expect(avatars[0]).toHaveAttribute("src", expect.stringContaining("euc.li"));
  });

  it("falls back to roster nicknames and says so when ENS cannot be reached", () => {
    renderAt("/agent-jurors", { roster: unresolvedRoster });

    expect(screen.getAllByText(/ENS could not be reached/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole("presentation")).toHaveLength(0);
    for (const agentJuror of ROSTER) {
      expect(screen.getByText(agentJuror.nickname)).toBeInTheDocument();
    }
  });

  it("does not caveat ENS when ENS worked", () => {
    renderAt("/agent-jurors");

    expect(screen.queryByText(/ENS could not be reached/i)).not.toBeInTheDocument();
  });

  it("does not announce a failure while the ENS lookup is still out", () => {
    // `isResolvedFromEns` is false in both states. Keyed on that alone, every cold load
    // asserts that ENS failed for as long as mainnet takes to answer, then retracts it —
    // and a caveat that comes and goes teaches a reader to ignore caveats.
    renderAt("/agent-jurors", { roster: resolvingRoster });

    expect(screen.queryByText(/ENS could not be reached/i)).not.toBeInTheDocument();
    // The six are still there throughout: the roster is the value, not the fallback.
    for (const agentJuror of ROSTER) {
      expect(screen.getByText(agentJuror.nickname)).toBeInTheDocument();
    }
  });

  it("says the roster is this dashboard's own list and not a read", () => {
    renderAt("/agent-jurors");

    expect(screen.getByText(/not a read of the court/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing on this page is a measurement/i)).toBeInTheDocument();
  });

  it("states how agent jurors are identified", () => {
    renderAt("/agent-jurors");

    expect(screen.getByText(/never by the person or team who built them/i)).toBeInTheDocument();
  });
});
