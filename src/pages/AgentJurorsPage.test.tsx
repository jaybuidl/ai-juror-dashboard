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
    expect(screen.getByText("Baskerville")).toBeInTheDocument();
  });

  it("takes a visitor from a nickname to that agent juror's own view", () => {
    // The click the ticket is written around, and the route it lands on is keyed on the roster
    // nickname rather than the one ENS resolves, because a URL built from what is on screen
    // would be a URL an operator can change from a wallet.
    renderAt("/agent-jurors");

    for (const agentJuror of ROSTER) {
      expect(
        screen.getByRole("link", { name: agentJuror.nickname }),
        agentJuror.nickname,
      ).toHaveAttribute("href", `/agent-jurors/${agentJuror.nickname}`);
    }
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

  it("says outright that no figure anywhere depends on ENS", () => {
    // The sentence the panel exists for. A reader who meets any caveat at all on a dashboard of
    // measurements will assume the measurements are affected unless told they are not, and this
    // is the one failure on this dashboard where they genuinely are not.
    renderAt("/agent-jurors", { roster: unresolvedRoster });

    expect(
      screen.getByText(/no measurement on this dashboard depends on ens/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/degraded, not broken/i)).toBeInTheDocument();
  });

  it("marks the fallback on the elements it reached, not only in a panel above them", () => {
    // The other half of the criterion: the panel says ENS is down once, and these say which
    // names and which portraits are the consequence — on a card a reader is looking at directly.
    renderAt("/agent-jurors", { roster: unresolvedRoster });

    expect(screen.getAllByText(/from roster/i)).toHaveLength(ROSTER.length);
  });

  it("does not mark a card whose name came from ENS", () => {
    renderAt("/agent-jurors");

    expect(screen.queryByText(/from roster/i)).not.toBeInTheDocument();
  });

  it("does not announce a failure while the ENS lookup is still out", () => {
    // `isResolvedFromEns` is false in both states. Keyed on that alone, every cold load
    // asserts that ENS failed for as long as mainnet takes to answer, then retracts it —
    // and a caveat that comes and goes teaches a reader to ignore caveats.
    renderAt("/agent-jurors", { roster: resolvingRoster });

    expect(screen.queryByText(/ENS could not be reached/i)).not.toBeInTheDocument();
    // Both channels, since ticket 13 added the second: a panel that stays quiet while the
    // per-card marks appear would be the same premature claim in a smaller typeface.
    expect(screen.queryByText(/degraded, not broken/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/from roster/i)).not.toBeInTheDocument();
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
