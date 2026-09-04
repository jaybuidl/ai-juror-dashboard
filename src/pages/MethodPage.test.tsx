import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderAt } from "../test/court";

/**
 * The method page.
 *
 * Its fragment identifiers are linked to from elsewhere — the matrix's window footnote goes to
 * `#window` — so they are pinned here. A renamed anchor still resolves to a page, just not to
 * the part that answers the question, which is the kind of breakage nothing reports.
 */

/** The anchors this page promises to keep. */
const ANCHORS = ["unit", "latency", "coherence", "window", "caveats", "sources"];

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

  it("names all three configurations as absolute durations", () => {
    // The account the † marker's link exists to reach. Every regime, in the units the court
    // was configured in, and no ratio anywhere between them — ADR-0005.
    renderAt("/method");

    const section = screen.getByRole("region", { name: /the window/i });

    expect(section).toHaveTextContent(/configured three times/i);
    expect(section).toHaveTextContent(/commit window of 8 hours/i);
    expect(section).toHaveTextContent(/commit window of 45 minutes/i);
    expect(section).toHaveTextContent(/vote window of 30 minutes/i);
    expect(section).toHaveTextContent(/Evidence 12h · commit 8h · vote 8h · appeal 36h/);
    expect(section).toHaveTextContent(/Evidence 45m · commit 45m · vote 30m · appeal 36h/);
    expect(section).toHaveTextContent(/Evidence 10m · commit 45m · vote 30m · appeal 36h/);
  });

  it("says the third change moved the evidence period and reached no figure", () => {
    // Ticket 19. The court was reconfigured on 26 August and dispute 152 is older than that
    // change and unmarked, which is a contradiction to anyone who has not been told that the
    // marker is about the commit and vote windows alone. This is where they are told.
    renderAt("/method");

    const section = screen.getByRole("region", { name: /the window/i });

    expect(section).toHaveTextContent(/moved the evidence period alone, from 45 minutes to 10/i);
    // Which change is which. The one that reaches a figure is the court's *first*
    // reconfiguration and its *second* configuration, and a sentence naming the wrong ordinal
    // reads as though the marked dispute were the wrong one.
    expect(section).toHaveTextContent(
      /Only the first of the court's two reconfigurations reaches anything on this dashboard/i,
    );
    expect(section).toHaveTextContent(
      /dispute 152 ran under a configuration the court has since replaced and still carries no marker/i,
    );
    expect(section).toHaveTextContent(
      /nothing on this dashboard is measured from the evidence period at all/i,
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

  it("never turns a latency into a fraction of a window, and says so", () => {
    renderAt("/method");

    expect(
      screen.getByText(/a latency is never divided by one, in a cell, in a total/i),
    ).toBeInTheDocument();
  });

  it("dates the account, because the court could be reconfigured again", () => {
    // The one sentence on this page that can go stale. It is prose so that a reader arriving
    // from the matrix's footnote is answered on a cold load; saying what date it is true as of
    // is what stops that convenience becoming a quiet falsehood.
    renderAt("/method");

    expect(screen.getByText(/as of 4 September 2026/i)).toBeInTheDocument();
  });

  it("carries no figure of its own, and says so", () => {
    renderAt("/method");

    expect(screen.getByText(/nothing on this page is a measurement/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing on this view rests on a read/i)).toBeInTheDocument();
  });
});
