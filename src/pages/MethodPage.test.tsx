import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderAt } from "../test/court";

/**
 * The method page.
 *
 * Its fragment identifiers are linked to from elsewhere — the failure banner goes to `#partial`,
 * and outside citations may name any of them — so they are pinned here. A renamed anchor still resolves to a page, just not to
 * the part that answers the question, which is the kind of breakage nothing reports.
 */

/** The anchors this page promises to keep. */
const ANCHORS = [
  "unit",
  "latency",
  "comparison",
  "coherence",
  "window",
  "caveats",
  "partial",
  "sources",
];

describe("the method page", () => {
  it("is reachable by URL and says what it is", () => {
    renderAt("/method");

    expect(screen.getByRole("heading", { level: 1, name: "Method" })).toBeInTheDocument();
  });

  it("keeps a stable fragment identifier on every section", () => {
    const { container } = renderAt("/method");

    for (const anchor of ANCHORS) {
      expect(container.querySelector(`#${anchor}`), `#${anchor}`).not.toBeNull();
    }
  });

  it("resolves /method#window to the window section", () => {
    const { container } = renderAt("/method#window");

    const section = container.querySelector("#window");

    expect(section).not.toBeNull();
    expect(section).toHaveTextContent(/period durations changed/i);
  });

  it("explains what is measured in the glossary's vocabulary", () => {
    renderAt("/method");

    expect(screen.getByText(/the unit is the draw/i)).toBeInTheDocument();
    expect(screen.getByText(/one agent juror's involvement in one dispute/i)).toBeInTheDocument();
    expect(screen.getByText(/seconds from the moment the vote period opened/i)).toBeInTheDocument();
    expect(
      screen.getByText(/the choice it revealed is the dispute's final ruling/i),
    ).toBeInTheDocument();
  });

  it("accounts for where the comparison band comes from, as it does for every other read", () => {
    // Ticket 23 made the band a reading, so it is provenance now and this page owes it an
    // account: which court, what is measured, what is left out, and what a short read does.
    renderAt("/method");

    const section = screen.getByRole("region", { name: /the comparison band/i });

    expect(section).toHaveTextContent(/court 29/i);
    expect(section).toHaveTextContent(/time to ruling/i);
    expect(section).toHaveTextContent(/appealed disputes are left out/i);
    expect(section).toHaveTextContent(/counted against the number the court itself says it holds/i);
    expect(section).toHaveTextContent(/never drawn at a default/i);
    expect(section).not.toHaveTextContent(/illustrative/i);
  });

  it("names all five configurations as absolute durations", () => {
    // The account the † marker's link used to reach, until 2026-09-24. Every regime, in the units the court
    // was configured in, and no ratio anywhere between them — ADR-0005.
    renderAt("/method");

    const section = screen.getByRole("region", { name: /the window/i });

    expect(section).toHaveTextContent(/configured five times/i);
    expect(section).toHaveTextContent(/commit window of 8 hours/i);
    expect(section).toHaveTextContent(/commit window of 45 minutes/i);
    expect(section).toHaveTextContent(/vote window of 30 minutes/i);
    expect(section).toHaveTextContent(/Evidence 12h · commit 8h · vote 8h · appeal 36h/);
    expect(section).toHaveTextContent(/Evidence 45m · commit 45m · vote 30m · appeal 36h/);
    expect(section).toHaveTextContent(/Evidence 10m · commit 45m · vote 30m · appeal 36h/);
    expect(section).toHaveTextContent(/Evidence 5m · commit 45m · vote 30m · appeal 36h/);
    expect(section).toHaveTextContent(/From 13 Nov/i);
  });

  it("says every change after the second moved the evidence period and no commit or vote window", () => {
    // Ticket 19. The court was reconfigured on 26 August and dispute 152 is older than that
    // change, and its draws' times were still taken against today's windows, which is a
    // contradiction to anyone who has not been told that only the commit and vote windows matter
    // to them. This is where they are told.
    renderAt("/method");

    const section = screen.getByRole("region", { name: /the window/i });

    expect(section).toHaveTextContent(
      /Every change since has moved the evidence period alone: from 45 minutes to 10 on 26 August, to 5 on 2 November, and back to 10 on 13 November/i,
    );
    expect(section).toHaveTextContent(
      /None of the three reconfigurations since moved a commit or vote window/i,
    );
    expect(section).toHaveTextContent(
      /dispute 152 ran under a configuration the court has since replaced, and still its draws' commit and reveal times were taken against the windows the court holds now/i,
    );
  });

  it("says the evidence change does reach the median time to appeal, and why", () => {
    // 2026-09-24: the headline became a time to appeal, measured from a dispute's creation. The
    // sentence "nothing on this dashboard is measured from the evidence period at all" stood
    // here until then and would have been false about the tile's own figure.
    renderAt("/method");

    const section = screen.getByRole("region", { name: /the window/i });

    expect(section).not.toHaveTextContent(
      /nothing on this dashboard is measured from the evidence/i,
    );
    expect(section).toHaveTextContent(/median time to appeal is the exception/i);
    expect(section).toHaveTextContent(
      /45 minutes of evidence, and one created between 2 and 13 November through 5, where one created today sits through 10/i,
    );
  });

  it("defines time to appeal, per dispute and round 0 only", () => {
    renderAt("/method");

    const section = screen.getByRole("region", { name: /speed is time to appeal/i });

    expect(section).toHaveTextContent(/time to appeal/i);
    expect(section).toHaveTextContent(/measured per dispute rather than per draw/i);
    expect(section).toHaveTextContent(/only the first round counts/i);
  });

  it("calls time to appeal the speed figure, and says why latency is not one (ADR-0010)", () => {
    renderAt("/method");

    const section = screen.getByRole("region", { name: /speed is time to appeal/i });

    expect(section).toHaveTextContent(/it is the one figure here that measures speed/i);
    expect(section).toHaveTextContent(/neither is averaged, ranked or plotted here/i);
    expect(section).toHaveTextContent(/reveals in the same block reads 0 seconds/i);
    expect(section).toHaveTextContent(/not shown anywhere on this dashboard/i);
    // The framing this replaced, on the page a citing reader goes to for definitions.
    expect(screen.queryByText(/speed and coherence/i)).not.toBeInTheDocument();
  });

  it("says where the moments are shown, and that an opener off the roster is not named (ADR-0012)", () => {
    renderAt("/method");

    const section = screen.getByRole("region", { name: /speed is time to appeal/i });

    expect(section).toHaveTextContent(/each dispute's page shows the moments themselves/i);
    expect(section).toHaveTextContent(/none of them is counted from another/i);
    expect(section).toHaveTextContent(/anyone else is an account off the roster/i);
    expect(section).not.toHaveTextContent(/each dispute's page show what a draw did, not when/i);
  });

  it("says the band on the matrix page is not the quantity its marks are", () => {
    renderAt("/method");

    const section = screen.getByRole("region", { name: /the comparison band/i });

    expect(section).toHaveTextContent(
      /each mark is a time to appeal, which stops where the appeal period opens, and the band is a time to ruling/i,
    );
  });

  it("says which disputes ran under which, and how that is decided", () => {
    renderAt("/method");

    const section = screen.getByRole("region", { name: /the window/i });

    expect(section).toHaveTextContent(/dispute 151 is the only dispute/i);
    // Read from the court's history and never from what it holds now — the trap this whole
    // section exists to keep a reader out of.
    expect(section).toHaveTextContent(/CourtModified/);
    expect(section).toHaveTextContent(/never from what the court is configured with today/i);
  });

  it("does not claim the PNK nets to zero, since a dispute nobody voted with pays nobody", () => {
    // #30. Dispute 282 ruled 0 on a one-sided appeal after all five votes went to 2, and its
    // 935 PNK left the court. "It nets to zero across the court" stood here until then.
    renderAt("/method");

    const section = screen.getByRole("region", { name: /what each agent juror has earned/i });

    expect(section).not.toHaveTextContent(/nets to zero across the court/i);
    expect(section).toHaveTextContent(/Where nobody voted with the ruling, nobody is paid/i);
  });

  it("never turns a duration into a fraction of a window, and says so", () => {
    renderAt("/method");

    expect(screen.getByText(/no duration is ever divided by one/i)).toBeInTheDocument();
  });

  it("stamps no read, carrying no figure of its own", () => {
    renderAt("/method");

    expect(screen.queryByText(/^Read (dispute \d+|\d+ disputes)/)).not.toBeInTheDocument();
  });
});
