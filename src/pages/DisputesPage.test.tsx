import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { disputes, renderAt } from "../test/court";

/**
 * The dispute index: the destination the nav's disputes link now has, and the parent ticket
 * 09's per-dispute view will hang its breadcrumb from.
 */

describe("the dispute index", () => {
  it("lists the court's disputes, newest first", () => {
    renderAt("/disputes");

    expect(screen.getByRole("heading", { level: 1, name: "Disputes" })).toBeInTheDocument();

    // Scoped: the footer's caveats are a list too, and an unscoped query would read one of
    // those as the oldest dispute.
    const rows = within(screen.getByRole("region", { name: /the disputes/i })).getAllByRole(
      "listitem",
    );
    expect(rows[0]).toHaveTextContent("166");
    expect(rows[rows.length - 1]).toHaveTextContent("151");
  });

  it("says nothing on it is a measurement", () => {
    renderAt("/disputes");

    expect(screen.getByText(/nothing on this page is a measurement/i)).toBeInTheDocument();
  });

  it("never implies the list is the whole record", () => {
    renderAt("/disputes");

    expect(screen.getByText(/never a claim that it is the whole record/i)).toBeInTheDocument();
    expect(
      screen.getByText(/no latency, coherence or draw has been measured/i),
    ).toBeInTheDocument();
  });

  it("says a title comes from whoever created the dispute", () => {
    renderAt("/disputes");

    expect(screen.getByText(/not validated by anything before publication/i)).toBeInTheDocument();
  });

  it("reports a shortfall in the titles read, rather than leaving rows silently untitled", () => {
    renderAt("/disputes", {
      disputes: { ...disputes, titles: { expected: 16, resolved: 11, isLoading: false } },
    });

    expect(screen.getByText(/5 of 16 titles did not come back/i)).toBeInTheDocument();
  });
});
