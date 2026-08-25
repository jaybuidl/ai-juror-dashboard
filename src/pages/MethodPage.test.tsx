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

  it("says outright that the window account is not written yet", () => {
    // Ticket 08 writes it. Until then the section exists and says so, so the matrix footnote
    // never arrives at an empty anchor.
    renderAt("/method");

    expect(screen.getByText(/are not written here yet/i)).toBeInTheDocument();
  });

  it("does not duplicate ticket 08's half of the window section", () => {
    renderAt("/method");

    // The two period regimes as absolute durations are 08's to write. Quoting one here would
    // be a second account of the court's parameters, free to disagree with the first.
    expect(screen.queryByText(/45 minutes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/8 hours/i)).not.toBeInTheDocument();
  });

  it("carries no figure of its own, and says so", () => {
    renderAt("/method");

    expect(screen.getByText(/nothing on this page is a measurement/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing on this view rests on a read/i)).toBeInTheDocument();
  });
});
