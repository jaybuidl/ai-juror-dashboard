import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ThemeProvider } from "styled-components";
import { describe, expect, it } from "vitest";
import detailFixture from "../performance/dispute-156-detail.fixture.json" with { type: "json" };
import { NO_DETAIL, type RawDisputeDetail, toDisputeDetail } from "../performance/dispute-detail";
import type { CourtPerformanceView } from "../performance/useCourtPerformance";
import type { DisputeDetailView } from "../performance/useDisputeDetail";
import { ReadFailure, SOURCES } from "../read-failure";
import { theme } from "../styles/theme";
import { disputes, measured, READ_AT, resolvedRoster, unresolvedRoster } from "../test/court";
import { DisputeView, type DisputeViewProps } from "./DisputePage";

/**
 * One dispute, side by side.
 *
 * Rendered through `DisputeView` rather than the route, because the route reads the one thing
 * this view fetches for itself and `yarn test` reaches no network. What the route does — that
 * the URL resolves, and that the chrome is around it — is pinned in `routes.test.tsx`.
 *
 * Dispute 156 throughout, and deliberately: it is the live payload carrying a justification
 * published *empty*, a vote for choice 0, a choice nobody picked, and one agent juror holding
 * two vote IDs. Every absence this view has to keep apart from every other is in one dispute.
 */

const detail156 = toDisputeDetail(detailFixture as RawDisputeDetail);

function read(overrides: Partial<DisputeDetailView> = {}): DisputeDetailView {
  return {
    detail: detail156,
    isUnknownDispute: false,
    isLoading: false,
    error: null,
    isPaused: false,
    readAt: READ_AT,
    retry: () => {},
    ...overrides,
  };
}

/**
 * The page's own provenance footer, told apart from the columns'.
 *
 * Every justification column ends in a `<footer>`, which is what that element is for — and
 * HTML-AAM scopes a `<footer>` inside an `<article>` out of the `contentinfo` landmark, so a
 * browser exposes exactly one. `dom-accessibility-api` does not implement that scoping and maps
 * all of them, so the query has to do it here rather than in the markup.
 */
function provenanceFooter(): HTMLElement {
  const page = screen
    .getAllByRole("contentinfo")
    .find((footer) => footer.closest("article") === null);
  if (page === undefined) throw new Error("the view rendered no provenance footer");
  return page;
}

function renderDispute(overrides: Partial<DisputeViewProps> = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <DisputeView
          roster={resolvedRoster}
          disputes={disputes}
          performance={measured}
          pathId="156"
          detail={read()}
          {...overrides}
        />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("the header", () => {
  it("names the dispute by its title and by its own id", () => {
    renderDispute();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Image Similarity Assessment",
    );
    expect(screen.getByText("Dispute 156")).toBeInTheDocument();
  });

  it("identifies the dispute beyond its title", () => {
    // Ticket 09's criterion named five — category, court, round, panel size and the period — and
    // this is four of them on purpose. The panel size left every surface that already draws the
    // panel, and this view draws it most plainly of all: every member side by side in roster
    // order, under a sentence saying the whole panel fits at once. The
    // chip counted what the reader is looking at. Where a panel cannot be counted off the page
    // the figure stays, which is why `AgentJurorDraws` keeps its column.
    renderDispute();

    expect(screen.getByText("IP")).toBeInTheDocument();
    expect(screen.getByText("Court 34")).toBeInTheDocument();
    expect(screen.getByText("Round 1 of 1")).toBeInTheDocument();
    expect(screen.queryByText(/^Panel \d+$/)).not.toBeInTheDocument();
    expect(screen.getByText("execution")).toBeInTheDocument();
  });

  it("puts the question the panel was actually asked above the answers", () => {
    renderDispute();

    expect(
      screen.getByText(/Would ordinary observers think there is concerning similarity/),
    ).toBeInTheDocument();
  });

  it("links out to the transaction that created the dispute", () => {
    // A transaction and not the arbitrator's address: Arbiscan has no page for a dispute, and
    // linking the contract would send a reader to one holding hundreds of them.
    renderDispute();
    const link = screen.getByRole("link", { name: /on chain/i });

    expect(link).toHaveAttribute(
      "href",
      "https://arbiscan.io/tx/0x81097239dba2585c9e9982e38ea8c05435c96d5155ddc053f87a2d9669db3c8d",
    );
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("offers no chain link at all rather than a broken one", () => {
    renderDispute({ detail: read({ detail: NO_DETAIL }) });

    expect(screen.queryByRole("link", { name: /on chain/i })).not.toBeInTheDocument();
  });

  it("points its breadcrumb at the index it sits under", () => {
    renderDispute();
    const trail = screen.getByRole("navigation", { name: "Breadcrumb" });

    expect(within(trail).getByRole("link", { name: "Disputes" })).toHaveAttribute(
      "href",
      "/disputes",
    );
    // The dispute's own id, never a resolved name: the route is keyed on the number.
    expect(within(trail).getByText("156")).toBeInTheDocument();
  });
});

describe("the ruling card", () => {
  it("names the winning choice by number and in words", () => {
    renderDispute();
    const card = screen.getByRole("region", { name: /final ruling/i });

    expect(within(card).getByText("2")).toBeInTheDocument();
    expect(within(card).getByText("NO (under 50%)")).toBeInTheDocument();
  });

  it("gives the vote count for every choice, including one nobody picked", () => {
    // Dispute 156's ballot: choice 0 took one vote, choice 2 took four, and choice 1 took
    // none. A card that omitted choice 1 would read as a choice nobody was offered.
    renderDispute();
    const card = screen.getByRole("region", { name: /final ruling/i });
    const rows = within(card).getAllByRole("listitem");

    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Choice 0");
    expect(rows[0]).toHaveTextContent("1 vote");
    expect(rows[1]).toHaveTextContent("Choice 1");
    expect(rows[1]).toHaveTextContent("0 votes");
    expect(rows[2]).toHaveTextContent("4 votes");
  });

  it("names choice 0 as refusing to arbitrate, which no template ever names", () => {
    renderDispute();

    expect(screen.getByText(/Refuse to arbitrate/)).toBeInTheDocument();
  });

  it("states that coherence is measured against this ruling and nothing else", () => {
    renderDispute();

    expect(
      screen.getByText(/Coherence on this page is measured against this ruling and nothing else/),
    ).toBeInTheDocument();
  });

  it("asserts no ruling while the court has not reached one", () => {
    // A dispute in `appeal` has every vote in and no ruling. Showing the round majority as the
    // ruling would state a result the court has not reached.
    const inAppeal = measured.performance?.rows.find(
      (row) => row.dispute.ruling.state === "pending",
    );
    if (inAppeal === undefined) throw new Error("the captured court holds no unruled dispute");

    renderDispute({ pathId: String(inAppeal.dispute.id) });

    expect(
      screen.getByText(/Coherence cannot be measured until the court rules/),
    ).toBeInTheDocument();
  });
});

describe("the timeline strip", () => {
  it("covers the four periods a dispute runs through", () => {
    renderDispute();
    const strip = screen.getByRole("list", { name: /how long each period ran/i });

    for (const name of ["Evidence", "Commit period", "Vote period", "Appeal period"]) {
      expect(within(strip).getByText(name)).toBeInTheDocument();
    }
  });

  it("carries the configured window and what elapsed as two absolute durations", () => {
    // ADR-0005: never a ratio, at any altitude. Two durations with a middot between them, and
    // the reader forms the comparison themselves if they want it.
    renderDispute();
    const strip = screen.getByRole("list", { name: /how long each period ran/i });

    expect(within(strip).getByText(/45m configured · closed in/)).toBeInTheDocument();
    expect(within(strip).queryByText(/%/)).not.toBeInTheDocument();
  });

  it("carries the evidence submission count where no window governs", () => {
    renderDispute();
    const strip = screen.getByRole("list", { name: /how long each period ran/i });

    expect(within(strip).getByText("1 submission")).toBeInTheDocument();
  });

  it("says the evidence count was not read rather than reporting none", () => {
    // The subgraph carries no link from a dispute to its evidence, so the count rests on a
    // join this dashboard checks and can fail. Zero would be a claim; this is an absence.
    renderDispute({ detail: read({ detail: { ...detail156, evidenceCount: null } }) });

    expect(screen.getByText("Submissions not read")).toBeInTheDocument();
  });
});

describe("the justification band", () => {
  it("shows every drawn agent juror at once, in roster order", () => {
    renderDispute();
    const columns = screen.getAllByRole("article");

    expect(columns).toHaveLength(4);
    // Roster order is 007, aletheia, blaise, columbo, daemonhill, baskerville. Dispute 156
    // drew four of them and aletheia was not among them: the drawn keep their roster
    // positions and the gap simply closes, rather than anything re-sorting.
    expect(columns.map((column) => column.getAttribute("aria-label"))).toEqual([
      expect.stringContaining("007"),
      expect.stringContaining("Blaise"),
      expect.stringContaining("Columbo"),
      expect.stringContaining("Daemonhill"),
    ]);
  });

  it("does not sort the diverged reading last", () => {
    // 007 voted choice 0 against a ruling of 2. It is first in the roster and stays first:
    // ordering the band by coherence would be this dashboard ranking the panel.
    renderDispute();
    const columns = screen.getAllByRole("article");

    expect(columns[0]?.getAttribute("aria-label")).toContain("Diverged");
  });

  it("says how many of the panel are shown", () => {
    renderDispute();

    expect(screen.getByText("4 of 4 shown")).toBeInTheDocument();
  });

  it("carries each draw's identity, outcome and both latencies", () => {
    renderDispute();
    const column = screen.getAllByRole("article")[0];
    if (column === undefined) throw new Error("no columns rendered");

    expect(within(column).getByText("007")).toBeInTheDocument();
    expect(within(column).getByText("OpenClaw")).toBeInTheDocument();
    expect(within(column).getByText("Diverged")).toBeInTheDocument();
    expect(within(column).getByText("Choice 0")).toBeInTheDocument();
    // The phrases, not the tooltips. Ticket 18 moved these off `title` — a tooltip on a
    // non-focusable span reaches a pointer and nothing else — so what to assert is the text a
    // reader is actually given, which is also what the matrix's own keys have always carried.
    expect(within(column).getByText("Reveal latency")).toBeInTheDocument();
    expect(within(column).getByText("Commit latency")).toBeInTheDocument();
  });

  it("carries the justification's length and what it is", () => {
    renderDispute();
    const columns = screen.getAllByRole("article");
    const footers = columns.map((column) => column.textContent ?? "");

    // Spanish is named in place of the format — the more surprising of the two facts.
    expect(footers.some((text) => /· ES$|· ES\b/.test(text) || text.includes("· ES"))).toBe(true);
  });

  it("renders Markdown with GitHub-flavoured extensions", () => {
    const withTable: DisputeDetailView = read({
      detail: {
        ...detail156,
        justifications: [
          {
            juror: "0x245314a76fc9b8e48fea7abb3b9b07e34e13d8c6",
            justification: {
              text: "## Vote\n\n| Feed | Value |\n| --- | --- |\n| A | 4.01 |\n\n~~struck~~",
              length: 60,
              form: { kind: "markdown" },
              lang: null,
            },
          },
        ],
      },
    });

    renderDispute({ detail: withTable });

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Vote" })).toBeInTheDocument();
    // Strikethrough is GFM and not CommonMark, so it is the one that proves the plugin is on.
    expect(screen.getByText("struck").tagName).toBe("DEL");
  });

  it("does not build raw HTML, however the prose is written", () => {
    // Stricter than the Kleros court frontend, which enables raw HTML and sanitises after.
    // The parser never makes the node, so there is nothing to sanitise and nothing to miss.
    const withHtml: DisputeDetailView = read({
      detail: {
        ...detail156,
        justifications: [
          {
            juror: "0x245314a76fc9b8e48fea7abb3b9b07e34e13d8c6",
            justification: {
              text: '<img src="x" onerror="alert(1)"><b>bold</b><script>alert(2)</script>',
              length: 67,
              form: { kind: "plain" },
              lang: null,
            },
          },
        ],
      },
    });

    renderDispute({ detail: withHtml });
    const column = screen.getAllByRole("article")[0];
    if (column === undefined) throw new Error("no columns rendered");

    // Scoped to the column: its header carries a real avatar `img`, and a page-wide query
    // would find that and prove nothing about what the parser did with the prose.
    expect(column.querySelector('img[src="x"]')).toBeNull();
    expect(column.querySelector("script")).toBeNull();
    expect(column.querySelector("b")).toBeNull();
    // Rendered as the text it is, which is what a reader should see: the agent juror published
    // this, and reproducing it verbatim is the whole contract of this view.
    expect(screen.getByText(/bold/)).toBeInTheDocument();
  });

  /** One justification holding one outbound link, which is all three tests below need. */
  function withLinkFixture(): DisputeDetailView {
    return read({
      detail: {
        ...detail156,
        justifications: [
          {
            juror: "0x245314a76fc9b8e48fea7abb3b9b07e34e13d8c6",
            justification: {
              text: "The policy is [published here](https://example.org/policy).",
              length: 58,
              form: { kind: "markdown" },
              lang: null,
            },
          },
        ],
      },
    });
  }

  it("warns before a link inside a justification takes you away", () => {
    renderDispute({ detail: withLinkFixture() });

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "published here" }));

    const warning = screen.getByRole("alertdialog");
    expect(warning).toHaveTextContent(/not part of this dashboard/i);
    // The host, so a reader can check where they are actually going: the link's own text is
    // written by the same agent that wrote the prose.
    expect(warning).toHaveTextContent("example.org");
    expect(within(warning).getByRole("link", { name: /open in a new tab/i })).toHaveAttribute(
      "href",
      "https://example.org/policy",
    );
  });

  /*
   * Ticket 18. The panel replaces a navigation the reader asked for, so it is a question, and a
   * question has to arrive where the reader is standing. It was announced assertively and left
   * focus on the link that opened it — which sits inside the prose, above the panel, sometimes
   * thousands of characters and a dozen other links above it. A keyboard reader had to tab
   * through the rest of the justification to reach the Cancel button of a panel their own
   * keypress had just opened.
   */
  it("moves focus into the warning, and back to the link when it is dismissed", () => {
    renderDispute({ detail: withLinkFixture() });

    const link = screen.getByRole("link", { name: "published here" });
    fireEvent.click(link);

    const warning = screen.getByRole("alertdialog");
    expect(document.activeElement).toBe(warning);

    fireEvent.click(within(warning).getByRole("button", { name: /cancel/i }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    // Back where they were, so the next Tab continues from the link rather than from the top of
    // a document they never left.
    expect(document.activeElement).toBe(link);
  });

  it("dismisses the warning on Escape, and returns focus then too", () => {
    renderDispute({ detail: withLinkFixture() });

    const link = screen.getByRole("link", { name: "published here" });
    fireEvent.click(link);
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(link);
  });
});

describe("a link the parser refused", () => {
  it("swallows the click without warning about a link that goes nowhere", () => {
    // `react-markdown` rewrites a blocked protocol to the empty string rather than dropping
    // the attribute, so a `javascript:` link reaches the DOM as `href=""` — which the browser
    // resolves to this very page. The sanitiser did its job; warning about it would put a rose
    // panel on screen offering the dashboard back to the reader.
    const withBlockedLink: DisputeDetailView = read({
      detail: {
        ...detail156,
        justifications: [
          {
            juror: "0x245314a76fc9b8e48fea7abb3b9b07e34e13d8c6",
            justification: {
              text: "Read [the policy](javascript:alert(1)) for the rule.",
              length: 51,
              form: { kind: "markdown" },
              lang: null,
            },
          },
        ],
      },
    });

    const { container } = renderDispute({ detail: withBlockedLink });
    const link = container.querySelector("a[href='']");
    if (link === null) throw new Error("the sanitised link did not render");

    // Queried out of the DOM rather than by role: what matters is the attribute the parser
    // left behind, and that clicking it neither navigates nor warns.
    expect(link.textContent).toBe("the policy");
    fireEvent.click(link);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("a draw that published nothing", () => {
  it("says so in its own column rather than leaving empty space", () => {
    // `156-0-2` published an empty justification. The vote is on chain and counts in full.
    renderDispute();

    expect(screen.getByText("No justification published")).toBeInTheDocument();
    expect(
      screen.getByText(/The vote itself is on chain and counts in full; only the prose is absent/),
    ).toBeInTheDocument();
  });

  it("reads as a field published empty and never as a failed read", () => {
    renderDispute();

    expect(
      screen.getByText(/Nothing failed here, and nothing was lost in transit/),
    ).toBeInTheDocument();
  });

  it("counts it as zero characters rather than naming the format of nothing", () => {
    renderDispute();

    expect(screen.getByText("0 chars")).toBeInTheDocument();
  });

  it("tells prose published empty from prose never published", () => {
    // Two different facts about two different draws. The first revealed with an empty field;
    // the second left no justification entity at all.
    renderDispute({ detail: read({ detail: { ...detail156, justifications: [] } }) });

    expect(
      screen.getAllByText(/This agent juror published no justification with its vote/).length,
    ).toBeGreaterThan(0);
  });
});

describe("a dispute with no panel yet", () => {
  /**
   * A dispute the court has read and drawn nobody for, built by hand.
   *
   * Disputes 167, 168 and 169 landed exactly like this on 2026-08-25: in `evidence`, nobody
   * drawn, and an all-zero timeline. The captured court holds none of them — every dispute in
   * it had been drawn by the time it was captured — which is this repository's standing rule in
   * miniature: every fixture here is one successful read of a working court, so a state that
   * matters has to be written rather than searched for. The first cut of these tests looked for
   * such a row in the fixture, found none, and passed without asserting anything.
   *
   * Distinct from a dispute whose draws were never *read*, which is why this view words it as
   * the panel not having been selected rather than as anything being missing.
   */
  function withNoPanel(): CourtPerformanceView {
    const model = measured.performance;
    const [first, ...rest] = model?.rows ?? [];
    if (model === null || first === undefined) {
      throw new Error("the captured court holds no rows");
    }

    return {
      ...measured,
      performance: {
        ...model,
        rows: [
          {
            ...first,
            dispute: { ...first.dispute, period: "evidence", ruling: { state: "pending" } },
            // Read, and nobody drawn. Both halves matter: `read: false` is the other state
            // entirely, and it is the one that says the draws were never fetched at all.
            read: true,
            panelSize: 0,
            cells: first.cells.map(() => null),
          },
          ...rest,
        ],
      },
    };
  }

  it("says the panel has not been selected rather than showing nothing", () => {
    const performance = withNoPanel();
    const id = performance.performance?.rows[0]?.dispute.id;

    renderDispute({ performance, pathId: String(id) });

    expect(screen.getByText(/Nobody has been drawn for this dispute yet/)).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("does not headline a panel of nobody", () => {
    const performance = withNoPanel();
    const id = performance.performance?.rows[0]?.dispute.id;

    renderDispute({ performance, pathId: String(id) });

    expect(screen.queryByText(/0 stacks/)).not.toBeInTheDocument();
    expect(screen.getByText("No reasoning to compare yet.")).toBeInTheDocument();
  });

  it("does not claim a panel size for a dispute nobody has been drawn for", () => {
    const performance = withNoPanel();
    const id = performance.performance?.rows[0]?.dispute.id;

    renderDispute({ performance, pathId: String(id) });

    expect(screen.queryByText("Panel 0")).not.toBeInTheDocument();
  });
});

describe("what could not be read", () => {
  it("raises one banner line when this dispute's own read fails", () => {
    renderDispute({
      detail: read({
        error: new ReadFailure("The core subgraph returned HTTP 503 Service Unavailable", {
          source: SOURCES.core,
          status: "HTTP 503",
        }),
        detail: NO_DETAIL,
      }),
    });

    const banner = screen.getByRole("alert");
    expect(banner).toHaveTextContent("kleros-v2-coreneo");
    expect(banner).toHaveTextContent("HTTP 503");
  });

  it("says an address that names no dispute is not a failed read", () => {
    renderDispute({ pathId: "9999", detail: read({ isUnknownDispute: true }) });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Dispute 9999");
    expect(
      screen.getByText(/No dispute anywhere on this subgraph carries this number/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says a path segment that is not a number names nothing", () => {
    renderDispute({ pathId: "latency", detail: read({ isUnknownDispute: false }) });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("That is not a dispute");
  });

  it("falls back to roster names without raising a banner when ENS is down", () => {
    // The one documented exception: no measurement depends on ENS, so it is quiet and local.
    renderDispute({ roster: unresolvedRoster });

    expect(screen.getByText(/Names are falling back to the roster/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("an address this dashboard cannot show", () => {
  it("does not nest a second main landmark inside the view's own", () => {
    // `View` already wraps every view's children in a `main`. Two of them is invalid HTML and
    // two landmarks of the same name, and it is reachable on any bad id.
    renderDispute({ pathId: "abc" });

    expect(screen.getAllByRole("main")).toHaveLength(1);
  });

  it("says a dispute from another court is not this court's, rather than unread", () => {
    // Dispute ids are global on the subgraph, so this names something real that court 34 does
    // not hold. The read succeeded and will never produce a row, so "has not been read yet"
    // would state an unread condition as a permanent fact.
    renderDispute({ pathId: "50", detail: read({ isUnknownDispute: false }) });

    expect(screen.getByText(/it is not one of court 34's/)).toBeInTheDocument();
    expect(screen.queryByText(/has not been read yet/)).not.toBeInTheDocument();
  });

  it("still says a dispute is unread while the court's own list is out", () => {
    // The other half of that test. Until the court list lands, "not in this court" is a guess.
    renderDispute({
      pathId: "50",
      disputes: { ...disputes, isLoading: true },
      detail: read({ isUnknownDispute: false }),
    });

    expect(screen.getByText(/has not been read yet/)).toBeInTheDocument();
  });

  it("does not describe measurements on a page showing no dispute", () => {
    // The footer's job is the provenance of what is above it. Naming three measures over a
    // not-found page is provenance for figures the reader cannot see, which is the same
    // mistake as a caveat about something absent.
    renderDispute({ pathId: "abc" });

    expect(provenanceFooter()).toHaveTextContent(/Nothing on this page is a measurement/);
    expect(provenanceFooter()).not.toHaveTextContent(/Commit latency, reveal latency/);
  });

  it("does not claim a read is in flight when none was ever started", () => {
    // A non-numeric segment disables the query, and react-query leaves a disabled query
    // pending for ever. A caveat keyed on that alone says "still being read" about a read
    // nobody started, under a page saying the address names nothing — and never retracts it.
    renderDispute({ pathId: "latency", detail: read({ isLoading: false }) });

    expect(provenanceFooter()).not.toHaveTextContent(/still being read/);
  });
});

describe("the provenance footer", () => {
  it("says what on this view is measured and what is only reproduced", () => {
    renderDispute();
    expect(provenanceFooter()).toHaveTextContent(/The prose is reproduced and not measured/);
  });

  it("states how agent jurors are identified, because this view shows them", () => {
    renderDispute();

    expect(provenanceFooter()).toHaveTextContent(/nickname/i);
  });

  it("does not repeat a failure the banner already carries", () => {
    // One failed source gets one banner line, and the footer never carries the failed half.
    renderDispute({
      detail: read({
        error: new ReadFailure("The core subgraph returned HTTP 503", {
          source: SOURCES.core,
          status: "HTTP 503",
        }),
        detail: NO_DETAIL,
      }),
    });

    expect(provenanceFooter()).not.toHaveTextContent("HTTP 503");
  });
});
