import { fireEvent, render, screen, within } from "@testing-library/react";
import { BrowserRouter } from "react-router";
import { ThemeProvider } from "styled-components";
import { describe, expect, it, vi } from "vitest";
import { DESTINATIONS, isCurrent } from "./chrome/Nav";
import { DashboardRoutes } from "./routes";
import { theme } from "./styles/theme";
import { renderAt, unmeasured, views } from "./test/court";
import { PHONE_WIDTH, stubViewportWidth } from "./test/viewport";

/**
 * The shell, and the routes it wraps.
 *
 * These are the tests ticket 15 asks for by name — the invariant text in the nav and the
 * footer, and an unknown path rendering the 404 rather than the matrix — plus the ones that
 * would otherwise only be caught by clicking: a destination that goes nowhere, a link to the
 * page you are already on, and a view that lost its chrome.
 */

/**
 * Every path the nav offers, plus the two beneath one of them.
 *
 * `/disputes/156` is not a destination and is still a view, so the chrome invariants below have
 * to hold on it: ticket 15's rule is about every view, not about every nav entry, and a detail
 * route is exactly where a page is most likely to be built without the shell around it.
 * `/agent-jurors/blaise` is ticket 11's, and is here on the same terms.
 */
const ROUTES = [
  "/",
  "/disputes",
  "/disputes/156",
  "/agent-jurors",
  "/agent-jurors/blaise",
  "/method",
];

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

describe("a route change", () => {
  /*
   * Ticket 18. A client-side route change is silent: the URL moves, React swaps a subtree, and
   * nothing tells a screen reader that the page it was reading is gone. The two things a real
   * page load would have done are the two done here — the document is retitled, and focus moves
   * into the new view so the next thing read is the new view rather than wherever the reader's
   * caret happened to be in a document that no longer exists.
   */
  it("gives every view its own document title", () => {
    const titles = new Set<string>();

    for (const path of [...ROUTES, "/nowhere"]) {
      const { unmount } = renderAt(path);
      expect(document.title, `title at ${path}`).toMatch(/AI Juror Dashboard$/);
      titles.add(document.title);
      unmount();
    }

    // Seven routes, seven titles. One shared title is what the tab strip, the history menu and
    // a screen reader's page-change announcement all had before this.
    expect(titles.size).toBe(ROUTES.length + 1);
  });

  it("names the dispute and the agent juror in the title, not just the view", () => {
    const { unmount } = renderAt("/disputes/156");
    expect(document.title).toMatch(/^Dispute 156\b/);
    unmount();

    renderAt("/agent-jurors/blaise");
    expect(document.title).toMatch(/^blaise\b/);
  });

  it("moves focus to the section a hash names, not just the scroll", () => {
    // The links carrying a hash are the ones a careful reader follows: /method#window from the
    // stat tiles and the matrix's footnote, /method#caveats from a lone-panel mark,
    // /method#partial from the failure banner. Each changes the route and unmounts the link that
    // was activated, so an early return before the focus move drops the reader on <body> —
    // exactly the defect the plain-route case was changed to fix.
    renderAt("/");
    const footnote = screen.getByRole("link", { name: /what that means for these figures/i });

    fireEvent.click(footnote);

    const section = document.getElementById("window");
    expect(section, "the method page has no #window section").not.toBeNull();
    expect(document.activeElement).toBe(section);
    expect(section).toHaveAttribute("tabindex", "-1");
  });

  it("hands focus back to the menu button when the folded panel is dismissed", () => {
    // Escape unmounts the panel and whichever of its links had focus with it, so without this
    // the reader is dropped on `<body>` — the top of the tab order, and nowhere they chose.
    // Ticket 16 added Escape precisely so a keyboard reader would not be stuck in the panel;
    // this is the other half of that.
    stubViewportWidth(PHONE_WIDTH);
    try {
      renderAt("/");
      const button = screen.getByRole("button", { name: /open the menu/i });
      fireEvent.click(button);
      expect(screen.getByRole("button", { name: /close the menu/i })).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });

      expect(screen.queryByRole("button", { name: /close the menu/i })).not.toBeInTheDocument();
      expect(document.activeElement).toBe(button);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("moves focus into the view when you navigate, and not on first render", () => {
    // The "not on first render" half matters as much as the other: a page that grabs focus on
    // load takes it away from the browser's own chrome, which is where a keyboard reader who
    // just typed a URL is standing.
    renderInBrowserAt("/");
    expect(document.activeElement).toBe(document.body);

    fireEvent.click(screen.getByRole("link", { name: "Method" }));

    const main = screen.getByRole("main");
    expect(document.activeElement).toBe(main);
    expect(main).toHaveAttribute("tabindex", "-1");
  });
});

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
    await screen.findByRole("heading", { level: 1, name: /kleros ai agent jurors dashboard/i });

    window.history.forward();
    await screen.findByRole("heading", { level: 1, name: "Method" });
  });

  it("resolves a dispute's own URL to that dispute, and not to the 404", () => {
    // Asserted against something only this view says. The chrome tests above run over the same
    // path and would pass with the 404 behind them — it renders the same nav and the same
    // footer — so they proved the route table matched *something*, and not what. The route
    // genuinely did 404 in the browser while every one of them was green.
    renderAt("/disputes/156");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Image Similarity Assessment",
    );
    expect(screen.queryByText(/nothing at this address/i)).not.toBeInTheDocument();
  });

  it("resolves an agent juror's own URL to that agent juror, and not to the 404", () => {
    // Asserted against something only that view says, for the reason the dispute route above is:
    // the chrome tests run over this path too and the 404 renders the same nav and footer, so
    // they prove the route table matched something rather than what.
    renderAt("/agent-jurors/blaise");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("blaise");
    expect(screen.queryByText(/nothing at this address/i)).not.toBeInTheDocument();
  });

  it("keeps the agent-juror index marked in the nav while you are on one of them", () => {
    renderAt("/agent-jurors/blaise");
    // Scoped to the nav: the breadcrumb on that view links back to the same index, and an
    // unscoped query would find that one and pass whatever the nav did.
    const nav = screen.getByRole("navigation", { name: "Dashboard" });

    expect(within(nav).queryByRole("link", { name: "Agent jurors" })).not.toBeInTheDocument();
    expect(within(nav).getByText("Agent jurors")).toBeInTheDocument();
  });

  it("keeps the dispute index marked in the nav while you are on one of its disputes", () => {
    renderAt("/disputes/156");
    // Scoped to the nav: the breadcrumb on this view links back to the same index, and an
    // unscoped query would find that one and pass whatever the nav did.
    const nav = screen.getByRole("navigation", { name: "Dashboard" });

    // The destination stays current on the view beneath it, and a current destination is text
    // rather than a link to itself — which is what makes the nav and the breadcrumb agree
    // about where the reader is.
    expect(within(nav).queryByRole("link", { name: "Disputes" })).not.toBeInTheDocument();
    expect(within(nav).getByText("Disputes")).toBeInTheDocument();
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
