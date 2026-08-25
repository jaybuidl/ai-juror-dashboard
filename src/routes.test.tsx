import { fireEvent, render, screen, within } from "@testing-library/react";
import { BrowserRouter } from "react-router";
import { ThemeProvider } from "styled-components";
import { describe, expect, it } from "vitest";
import { DESTINATIONS, isCurrent } from "./chrome/Nav";
import { DashboardRoutes } from "./routes";
import { theme } from "./styles/theme";
import { renderAt, unmeasured, views } from "./test/court";

/**
 * The shell, and the routes it wraps.
 *
 * These are the tests ticket 15 asks for by name — the invariant text in the nav and the
 * footer, and an unknown path rendering the 404 rather than the matrix — plus the ones that
 * would otherwise only be caught by clicking: a destination that goes nowhere, a link to the
 * page you are already on, and a view that lost its chrome.
 */

/** Every path the nav offers. */
const ROUTES = ["/", "/disputes", "/agent-jurors", "/method"];

/**
 * The app on a real history stack, which `MemoryRouter` deliberately is not.
 *
 * Only the back/forward test needs this. Everywhere else the memory router is the better
 * harness — it takes the starting URL as an argument and leaves no state behind between tests.
 */
function renderInBrowserAt(path: string) {
  window.history.pushState({}, "", path);

  return render(
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <DashboardRoutes {...views} />
      </BrowserRouter>
    </ThemeProvider>,
  );
}

describe("the shell", () => {
  it("states what this dashboard is in the nav, on every view", () => {
    for (const path of ROUTES) {
      const { unmount } = renderAt(path);

      expect(
        within(screen.getByRole("navigation", { name: /dashboard/i })).getByText(/read only/i),
        `nav at ${path}`,
      ).toBeInTheDocument();
      unmount();
    }
  });

  it("states the read-only invariant in full in the footer, on every view", () => {
    for (const path of [...ROUTES, "/nowhere"]) {
      const { unmount } = renderAt(path);

      expect(
        screen.getByText(/never votes, stakes, holds a key, or connects a wallet/i),
        `footer at ${path}`,
      ).toBeInTheDocument();
      unmount();
    }
  });

  it("offers every destination as a real link, in the canvas's order", () => {
    renderAt("/method");

    const nav = screen.getByRole("navigation", { name: /dashboard/i });
    const labels = within(nav)
      .getAllByRole("link")
      // The lockup comes first and links home; the destinations follow it.
      .slice(1)
      .map((link) => link.textContent);

    expect(labels).toEqual(
      DESTINATIONS.filter(({ path }) => path !== "/method").map(({ label }) => label),
    );
  });

  it("marks the destination you are on, and does not link it to itself", () => {
    renderAt("/disputes");

    const nav = screen.getByRole("navigation", { name: /dashboard/i });
    const current = within(nav).getByText("Disputes");

    expect(current).toHaveAttribute("aria-current", "page");
    expect(within(nav).queryByRole("link", { name: "Disputes" })).not.toBeInTheDocument();
  });

  it("navigates between views without leaving the app", () => {
    renderAt("/");

    const nav = screen.getByRole("navigation", { name: /dashboard/i });
    fireEvent.click(within(nav).getByRole("link", { name: "Method" }));

    expect(screen.getByRole("heading", { level: 1, name: "Method" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /dashboard/i })).toBeInTheDocument();
  });

  it("moves back and forward with the browser's own buttons", async () => {
    renderInBrowserAt("/");

    const nav = screen.getByRole("navigation", { name: /dashboard/i });
    fireEvent.click(within(nav).getByRole("link", { name: "Method" }));
    expect(window.location.pathname).toBe("/method");

    window.history.back();
    await screen.findByRole("heading", { level: 1, name: /agents do not wait/i });

    window.history.forward();
    await screen.findByRole("heading", { level: 1, name: "Method" });
  });

  it("says a path matches nothing, rather than showing the matrix at the wrong URL", () => {
    renderAt("/disputes/152/latency");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/nothing at this address/i);
    expect(screen.getByText("/disputes/152/latency")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /the matrix/i })).not.toBeInTheDocument();
  });

  it("offers a way back from a wrong address, and never reads as a failed read", () => {
    renderAt("/nowhere");

    expect(screen.getByRole("link", { name: /go to the matrix/i })).toHaveAttribute("href", "/");
    // Ticket 13's failure state is about a source. A mistyped URL is not one, and dressing it
    // up as one would tell a visitor a public dashboard is down when it is not.
    expect(screen.queryByText(/could not be read/i)).not.toBeInTheDocument();
    expect(screen.getByText(/nothing failed to load/i)).toBeInTheDocument();
  });

  it("keeps the shell around a view that could not be measured", () => {
    renderAt("/", { performance: unmeasured });

    expect(screen.getByRole("navigation", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/never votes, stakes, holds a key/i)).toBeInTheDocument();
  });
});

describe("isCurrent", () => {
  it("matches the index only on the index", () => {
    expect(isCurrent("/", "/")).toBe(true);
    expect(isCurrent("/", "/method")).toBe(false);
  });

  it("keeps a destination current on the views beneath it", () => {
    // Ticket 09's /disputes/152 sits under the disputes destination; a nav that went blank
    // there would tell a visitor they had left the dashboard.
    expect(isCurrent("/disputes", "/disputes/152")).toBe(true);
    expect(isCurrent("/agent-jurors", "/agent-jurors/blaise")).toBe(true);
  });

  it("does not match a destination that merely shares a prefix", () => {
    expect(isCurrent("/disputes", "/disputes-archive")).toBe(false);
  });

  it("ignores a trailing slash", () => {
    expect(isCurrent("/method", "/method/")).toBe(true);
  });
});
