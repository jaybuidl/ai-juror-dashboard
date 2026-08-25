import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { formatAgo } from "../read-failure";
import { disputes, READ_AT, renderAt } from "../test/court";

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
      disputes: {
        ...disputes,
        titles: { expected: 16, resolved: 11, isLoading: false, readAt: 1_700_000_000_000 },
      },
    });

    expect(screen.getByText(/5 of 16 titles did not come back/i)).toBeInTheDocument();
  });

  it("dates an incomplete page by the read that fell short, not the one that worked", () => {
    // The failing half here is the template read, and the dispute read beside it is fresh.
    // Dating the page by that one would put "Last complete read: 3s ago" directly under "Part of
    // this page could not be read" — precisely the reassurance the banner exists to withhold.
    const titlesReadAt = READ_AT - 60 * 60 * 1000;
    renderAt("/disputes", {
      disputes: {
        ...disputes,
        titles: { expected: 16, resolved: 11, isLoading: false, readAt: titlesReadAt },
      },
    });

    const banner = screen.getByRole("alert");

    expect(within(banner).getByText(formatAgo(titlesReadAt, Date.now()))).toBeInTheDocument();
    expect(within(banner).queryByText(formatAgo(READ_AT, Date.now()))).not.toBeInTheDocument();
  });

  it("dates a whole page by its own read, with no template shortfall to fold in", () => {
    // The other direction, and the one that is easy to break while fixing the first: with every
    // title in hand the template read is not a second condition on completeness, and reporting
    // "Never" on a page that is entirely fine would be the same failure in reverse.
    renderAt("/disputes");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
