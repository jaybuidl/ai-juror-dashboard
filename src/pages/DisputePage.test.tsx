import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ThemeProvider } from "styled-components";
import { describe, expect, it } from "vitest";
import { arbitrumSource } from "../performance/arbitrum";
import detailFixture from "../performance/dispute-156-detail.fixture.json" with { type: "json" };
import detail318Fixture from "../performance/dispute-318-detail.fixture.json" with { type: "json" };
import { NO_DETAIL, type RawDisputeDetail, toDisputeDetail } from "../performance/dispute-detail";
import type { CourtPerformance, DrawState, LiveStage } from "../performance/performance";
import type { CourtPerformanceView } from "../performance/useCourtPerformance";
import type { DisputeDetailView } from "../performance/useDisputeDetail";
import { ReadFailure, SOURCES } from "../read-failure";
import { VisuallyHidden } from "../styles/hidden";
import { theme } from "../styles/theme";
import {
  answered,
  DISPUTE_156_CHAIN,
  disputes,
  failed,
  measured,
  pending,
  READ_AT,
  resolvedRoster,
  unresolvedRoster,
} from "../test/court";
import { DisputeView, type DisputeViewProps } from "./DisputePage";

/**
 * One dispute, its whole panel on one page.
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
    isBehindReveals: false,
    isBehindStage: false,
    ...overrides,
  };
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
          chain={answered(DISPUTE_156_CHAIN)}
          ensNames={new Map()}
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
    expect(screen.getByRole("link", { name: "Dispute 156 on Kleros Court ↗" })).toBeVisible();
  });

  it("identifies the dispute beyond its title", () => {
    // Ticket 09's criterion named five — category, court, round, panel size and the period — and
    // this is three of them on purpose. The panel size left every surface that already draws the
    // panel, and this view draws it most plainly of all: every member, one card each, in roster
    // order, under a heading that counts it. The chip counted what the reader is looking at.
    // `AgentJurorDraws` kept a panel column until 2026-11-02, when each draw's share of the
    // round's vote replaced it, and the ‡ took over marking a panel of one. The court left on
    // 2026-11-02: this dashboard reads one court, so its pill said the same thing on every
    // dispute.
    renderDispute();

    expect(screen.getByText("IP")).toBeInTheDocument();
    expect(screen.queryByText(/Court 34/)).not.toBeInTheDocument();
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
    const link = screen.getByRole("link", { name: /arbiscan/i });

    expect(link).toHaveAttribute(
      "href",
      "https://arbiscan.io/tx/0x81097239dba2585c9e9982e38ea8c05435c96d5155ddc053f87a2d9669db3c8d",
    );
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("offers no chain link at all rather than a broken one", () => {
    renderDispute({ detail: read({ detail: NO_DETAIL }) });

    expect(screen.queryByRole("link", { name: /arbiscan/i })).not.toBeInTheDocument();
  });

  it("makes the dispute's own pill the link to its case on the Kleros court, Arbiscan last", () => {
    renderDispute();
    const court = screen.getByRole("link", { name: "Dispute 156 on Kleros Court ↗" });

    expect(court).toHaveAttribute("href", "https://v2.kleros.builders/#/cases/156/overview");
    expect(court).toHaveAttribute("target", "_blank");
    expect(court).toHaveAttribute("rel", "noopener noreferrer");
    // The court first, Arbiscan last: the order is the design, so it is asserted.
    expect(court.compareDocumentPosition(screen.getByRole("link", { name: /arbiscan/i }))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    // One link to the case, not a pill and a second link beside it.
    expect(screen.queryByRole("link", { name: "Kleros Court ↗" })).not.toBeInTheDocument();
  });

  it("keeps the case link when the transaction is unknown, since it needs only the id", () => {
    renderDispute({ detail: read({ detail: NO_DETAIL }) });

    expect(screen.getByRole("link", { name: "Dispute 156 on Kleros Court ↗" })).toBeVisible();
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
  it("names the winning choice in words, with no bare number that reads as a count", () => {
    // The choice number left the headline on 2026-11-02: drawn as a metric beside a ballot it
    // read as a vote count. The tally's ruling row still carries it, as "2 · NO (under 50%)".
    renderDispute();
    const card = screen.getByRole("region", { name: /final ruling/i });

    expect(within(card).getAllByText(/NO \(under 50%\)/)).toHaveLength(2);
    expect(within(card).queryByText(/^2$/)).not.toBeInTheDocument();
  });

  it("gives the vote count for every choice, including one nobody picked", () => {
    // Dispute 156's ballot: choice 0 took one vote, choice 2 took four, and choice 1 took
    // none. A card that omitted choice 1 would read as a choice nobody was offered.
    renderDispute();
    const card = screen.getByRole("region", { name: /final ruling/i });
    const rows = within(card).getAllByRole("listitem");

    expect(rows).toHaveLength(3);
    // The bare choice number leads each row, with no "Choice" in front of it.
    expect(rows[0]).toHaveTextContent(/^0 · Refuse to arbitrate/);
    expect(rows[0]).toHaveTextContent("1 vote");
    expect(rows[1]).toHaveTextContent(/^1\b/);
    expect(rows[1]).not.toHaveTextContent(/Choice/);
    expect(rows[1]).toHaveTextContent("0 votes");
    expect(rows[2]).toHaveTextContent("4 votes");
  });

  it("names choice 0 as refusing to arbitrate, which no template ever names", () => {
    renderDispute();
    const card = screen.getByRole("region", { name: /final ruling/i });

    expect(within(card).getByText(/Refuse to arbitrate/)).toBeInTheDocument();
  });

  it("adds no note under a ruling the court has made", () => {
    renderDispute();

    expect(
      screen.queryByText(/Coherence on this page is measured against this ruling/),
    ).not.toBeInTheDocument();
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
    const strip = screen.getByRole("list", { name: "Timeline" });

    for (const name of ["Evidence", "Commit period", "Vote period", "Appeal period"]) {
      expect(within(strip).getByText(name)).toBeInTheDocument();
    }
  });

  it("carries the configured window and what elapsed as two absolute durations", () => {
    // ADR-0005: never a ratio, at any altitude. Two durations side by side, the window bracketed, and
    // the reader forms the comparison themselves if they want it.
    renderDispute();
    const strip = screen.getByRole("list", { name: "Timeline" });

    // How long it ran, then the most allowed, in the window's own units (#34).
    expect(within(strip).getAllByText(/^(\d+s|\d+m \d{2}s) \(max 45m\)$/).length).toBeGreaterThan(
      0,
    );
    expect(within(strip).getByText(/^\d+h \d{2}m \(max 36h\)$/)).toBeInTheDocument();
    expect(within(strip).queryByText(/configured|closed in|\dd /)).not.toBeInTheDocument();
    expect(within(strip).queryByText(/%/)).not.toBeInTheDocument();
  });

  it("carries the evidence submission count where no window governs", () => {
    renderDispute();
    const strip = screen.getByRole("list", { name: "Timeline" });

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

  it("carries each draw's identity and outcome, and no time", () => {
    renderDispute();
    const column = screen.getAllByRole("article")[0];
    if (column === undefined) throw new Error("no columns rendered");

    // The name is a link to the agent juror's own page.
    expect(within(column).getByRole("link", { name: "007" })).toHaveAttribute(
      "href",
      "/agent-jurors/007",
    );
    expect(within(column).getByText("OpenClaw")).toBeInTheDocument();
    expect(within(column).getByText("Diverged")).toBeInTheDocument();
    // The vote by name, not by number: 007 voted choice 0 (2026-11-02).
    expect(within(column).getByText("Refuse to arbitrate")).toBeInTheDocument();
    // Its share of the round's vote stays; the commit and reveal times left with ADR-0011, which
    // keeps them on the agent juror's page.
    expect(within(column).getByText(/^\d+\/\d+ votes?$/)).toBeInTheDocument();
    expect(within(column).queryByText(/latency/i)).not.toBeInTheDocument();
    expect(within(column).queryByText(/^\d+s$|^\d+m \d{2}s$/)).not.toBeInTheDocument();
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

  it("says how many votes each panel member holds, and nothing about the prose's length", () => {
    // The card footer — the prose's length and format, and the vote count only above one — went
    // on 2026-11-02 (maintainer's ruling). The vote count moved to the header, on every card.
    renderDispute();
    const cards = screen.getAllByRole("article");

    for (const card of cards) {
      // Its share of the round's vote: drawn "1/5 votes", said "1 of 5 votes".
      expect(within(card).getByText(/^\d+\/\d+ votes?$/)).toBeInTheDocument();
      expect(within(card).getByText(/^\d+ of \d+ votes?$/)).toBeInTheDocument();
    }
    expect(screen.queryByText("0 chars")).not.toBeInTheDocument();
    expect(screen.queryByText(/ · MD$/)).not.toBeInTheDocument();
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

/** Dispute 156 restated, its first draws given these states in roster order. */
function restated(...states: DrawState[]): CourtPerformanceView {
  const performance = measured.performance as CourtPerformance;
  return {
    ...measured,
    performance: {
      ...performance,
      rows: performance.rows.map((row) => {
        if (row.dispute.id !== 156) return row;
        let next = 0;
        const cells = row.cells.map((cell) => {
          if (cell === null || next >= states.length) return cell;
          return { ...cell, state: states[next++] as DrawState };
        });
        return { ...row, cells };
      }),
    },
  };
}

describe("a draw that has not revealed yet", () => {
  /** Dispute 156 reopened, its first draws back to before their reveal. */
  function live(...stages: LiveStage[]): CourtPerformanceView {
    return restated(...stages.map((stage) => ({ kind: "live" as const, stage })));
  }

  it("says the vote is not revealed rather than that it counts", () => {
    renderDispute({
      performance: live("awaiting", "committed"),
      detail: read({ detail: { ...detail156, justifications: [] } }),
    });

    const [awaiting, committed] = screen.getAllByRole("article");
    for (const card of [awaiting, committed]) {
      if (card === undefined) throw new Error("no columns rendered");
      expect(within(card).getByText("Not revealed yet")).toBeInTheDocument();
      expect(
        within(card).getByText("The justification arrives with the vote."),
      ).toBeInTheDocument();
      expect(within(card).queryByText(/counts in full/)).not.toBeInTheDocument();
      expect(within(card).queryByText(/Nothing failed here/)).not.toBeInTheDocument();
    }
  });

  it("shows prose that has arrived, whatever the court read still says", () => {
    // The two reads disagree for up to a poll after a reveal: the justification is in, the
    // court read still says committed. The prose wins.
    renderDispute({ performance: live("committed") });
    const card = screen.getAllByRole("article")[0];
    if (card === undefined) throw new Error("no columns rendered");

    expect(within(card).queryByText("Not revealed yet")).not.toBeInTheDocument();
    expect(within(card).queryByText("No justification published")).not.toBeInTheDocument();
  });

  it("keeps the published-empty copy for a draw that has revealed", () => {
    // The gate tested the other way: a live draw that *has* revealed, with no justification,
    // is a vote on chain whose prose is absent, and says so.
    renderDispute({
      performance: live("revealed", "revealed"),
      detail: read({ detail: { ...detail156, justifications: [] } }),
    });

    expect(screen.queryByText("Not revealed yet")).not.toBeInTheDocument();
    expect(
      screen.getAllByText(/This agent juror published no justification with its vote/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Nothing failed here, and nothing was lost in transit/).length,
    ).toBeGreaterThan(0);
  });
});

describe("a draw that never voted", () => {
  it("says no vote was revealed rather than that it counts", () => {
    // A no-vote draw let the vote period close without revealing (`stateOf`). Its justification
    // is null because there is no vote, not because the prose was left out of one (#20).
    renderDispute({
      performance: restated({ kind: "no-vote" }),
      detail: read({ detail: { ...detail156, justifications: [] } }),
    });
    const [missed, revealed] = screen.getAllByRole("article");
    if (missed === undefined || revealed === undefined) throw new Error("no columns rendered");

    expect(within(missed).getByText("No vote revealed")).toBeInTheDocument();
    expect(within(missed).queryByText(/counts in full/)).not.toBeInTheDocument();
    expect(within(missed).queryByText(/Nothing failed here/)).not.toBeInTheDocument();
    // The gate tested the other way: the next card, a vote revealed with no prose, keeps it.
    expect(within(revealed).queryByText("No vote revealed")).not.toBeInTheDocument();
    expect(within(revealed).getByText(/counts in full/)).toBeInTheDocument();
  });
});

describe("a draw revealed after the dispute was last read", () => {
  it("says its justification is not read yet rather than published empty", () => {
    // #21: the court read has seen a reveal this dispute's read predates.
    renderDispute({
      detail: read({ detail: { ...detail156, justifications: [] }, isBehindReveals: true }),
    });
    const card = screen.getAllByRole("article")[0];
    if (card === undefined) throw new Error("no columns rendered");

    expect(within(card).getByText("Justification not read yet")).toBeInTheDocument();
    expect(within(card).queryByText(/counts in full/)).not.toBeInTheDocument();
    expect(within(card).queryByText(/Nothing failed here/)).not.toBeInTheDocument();
  });

  it("keeps the published-empty copy once the read has caught up", () => {
    renderDispute({ detail: read({ detail: { ...detail156, justifications: [] } }) });
    const card = screen.getAllByRole("article")[0];
    if (card === undefined) throw new Error("no columns rendered");

    expect(within(card).queryByText("Justification not read yet")).not.toBeInTheDocument();
    expect(within(card).getByText(/counts in full/)).toBeInTheDocument();
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

    expect(screen.queryByText("What the agent jurors wrote")).not.toBeInTheDocument();
    expect(screen.getByText("No reasoning to compare yet.")).toBeInTheDocument();
  });

  it("does not call a panel drawn entirely off the roster nobody", () => {
    // The other zero. `columns` holds roster agent jurors only, so a panel of three jurors none
    // of whom is on the roster shows no column either, and "nobody has been drawn yet" would
    // be false about a dispute the court has already drawn for.
    const performance = withNoPanel();
    const first = performance.performance?.rows[0];
    if (performance.performance === null || first === undefined) {
      throw new Error("the captured court holds no rows");
    }
    const offRoster: CourtPerformanceView = {
      ...performance,
      performance: {
        ...performance.performance,
        rows: [
          { ...first, dispute: { ...first.dispute, period: "vote" }, panelSize: 3 },
          ...performance.performance.rows.slice(1),
        ],
      },
    };

    renderDispute({ performance: offRoster, pathId: String(first.dispute.id) });

    expect(screen.getByText(/The court has drawn 3 jurors for this dispute/)).toBeInTheDocument();
    expect(screen.queryByText(/Nobody has been drawn/)).not.toBeInTheDocument();
    expect(screen.getByText("No reasoning to compare.")).toBeInTheDocument();
  });

  it("does not claim a panel size for a dispute nobody has been drawn for", () => {
    const performance = withNoPanel();
    const id = performance.performance?.rows[0]?.dispute.id;

    renderDispute({ performance, pathId: String(id) });

    expect(screen.queryByText("Panel 0")).not.toBeInTheDocument();
  });
});

/** One lane of the timeline, read as the lines a reader sees, in order. */
function laneLines(period: string): string[] {
  const lane = screen.getByRole("list", { name: period });
  return within(lane)
    .getAllByRole("listitem")
    .map((item) => item.textContent?.replace(/\s+/g, " ").trim() ?? "");
}

/**
 * Dispute 156's own appeal took no contribution, so its funding here is dispute 318's, as the
 * subgraph returned it on 2026-11-21: No funded by an account off the roster, Yes contributed to
 * by Grokleros and not funded (#32).
 */
const FUNDED = toDisputeDetail(detail318Fixture as RawDisputeDetail).funding.map((round) => round);

/** The appeal lane's funding block, as the lines a reader sees, head first. */
function fundingLines(): string[] {
  const list = screen.getByRole("list", { name: /funded|funding/i });
  const head = document.getElementById(list.getAttribute("aria-labelledby") ?? "");
  return [
    head?.textContent?.replace(/\s+/g, " ").trim() ?? "",
    ...within(list)
      .getAllByRole("listitem")
      .map((item) => item.textContent?.replace(/\s+/g, " ").trim() ?? ""),
  ];
}

describe("the appeal's funding (#32)", () => {
  it("lists each side funded or not, with what it raised and who gave it", () => {
    renderDispute({ detail: read({ detail: { ...detail156, funding: FUNDED } }) });

    expect(fundingLines()).toEqual([
      "Partially funded · no appealETH",
      // Dispute 156's own choice names, since its template is the one on the page.
      // "funded" is said and not drawn; the check mark is what a sighted reader sees (#34).
      "1 · YES (50% or more) funded ✓0.0089 ETH0x1111…1111",
      // Short of the 0.0089 a tied round asks of every side but Refuse (#32, the maintainer's
      // question).
      "2 · NO (under 50%) not funded 0.0059 of 0.0089 ETHGrokleros",
    ]);
  });

  it("marks a funded side with a check mark and says 'funded' only to a screen reader", () => {
    // #34: the mark carries it on the page; the word stays for whoever cannot see the mark.
    renderDispute({ detail: read({ detail: { ...detail156, funding: FUNDED } }) });
    const list = screen.getByRole("list", { name: /funded|funding/i });
    const [funded, short] = within(list).getAllByRole("listitem");

    expect(within(funded as HTMLElement).getByText("✓")).toHaveAttribute("aria-hidden", "true");
    expect(within(funded as HTMLElement).getByText("funded").className).toContain(
      VisuallyHidden.styledComponentId,
    );
    expect(within(short as HTMLElement).queryByText("✓")).not.toBeInTheDocument();
    expect(within(short as HTMLElement).getByText("not funded").className).toContain(
      VisuallyHidden.styledComponentId,
    );
  });

  it("shows a funder nothing else names by its short address, linked to it on Arbiscan", () => {
    renderDispute({ detail: read({ detail: { ...detail156, funding: FUNDED } }) });
    const link = screen.getByRole("link", {
      name: "Account 0x1111111111111111111111111111111111111111 on Arbiscan",
    });

    expect(link).toHaveTextContent("0x1111…1111");
    expect(link).toHaveAttribute(
      "href",
      "https://arbiscan.io/address/0x1111111111111111111111111111111111111111",
    );
  });

  it("shows a funder with an ENS name by that name, linked to its account on Arbiscan", () => {
    renderDispute({
      detail: read({ detail: { ...detail156, funding: FUNDED } }),
      ensNames: new Map([["0x1111111111111111111111111111111111111111", "alice.eth"]]),
    });
    const link = screen.getByRole("link", {
      name: "alice.eth, account 0x1111111111111111111111111111111111111111 on Arbiscan",
    });

    expect(link).toHaveTextContent("alice.eth");
    expect(link).toHaveAttribute(
      "href",
      "https://arbiscan.io/address/0x1111111111111111111111111111111111111111",
    );
  });

  it("names an agent juror by its nickname, never its address", () => {
    const { container } = renderDispute({
      detail: read({ detail: { ...detail156, funding: FUNDED } }),
    });

    expect(container.innerHTML).not.toMatch(/0x93aa/i);
  });

  it("says nothing about funding where nothing was contributed", () => {
    renderDispute();

    expect(screen.queryByRole("list", { name: /funded|funding/i })).not.toBeInTheDocument();
  });

  it("does not guess who created the dispute before the chain read answers", () => {
    renderDispute({
      detail: read({ detail: { ...detail156, funding: FUNDED } }),
      chain: pending(),
    });

    expect(fundingLines()[1]).toBe(
      "1 · YES (50% or more) funded ✓0.0089 ETH—an account not read yet",
    );
  });
});

describe("the appeal's funding, where a read it depends on is missing (#32)", () => {
  const withFunding = () => read({ detail: { ...detail156, funding: FUNDED } });
  /** The court's disputes with dispute 156's template not come back, as the template read left it. */
  const untemplated = (isLoading: boolean) => ({
    ...disputes,
    templateFor: () => undefined,
    titles: { expected: 2, resolved: 1, isLoading, readAt: READ_AT },
  });

  it("does not guess party or a bare account while the template is still being read", () => {
    renderDispute({ detail: withFunding(), disputes: untemplated(true) });

    expect(fundingLines()[1]).toBe("Choice 1 funded ✓0.0089 ETH—an account not read yet");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says so once the template read has settled without it", () => {
    renderDispute({ detail: withFunding(), disputes: untemplated(false) });

    const banner = screen.getByRole("alert");
    expect(banner).toHaveTextContent("kleros-v2-drt");
    expect(banner).toHaveTextContent(
      /Its parties are unknown too, so an appeal funder nothing else names shows as not read/,
    );
  });

  it("says what a failed chain read costs the funders, where it leaves one unnamed", () => {
    renderDispute({ detail: withFunding(), chain: failed() });

    expect(screen.getByRole("alert")).toHaveTextContent(
      /An appeal funder nothing else names shows as not read, since who created the dispute is unknown/,
    );
  });

  it("says nothing about funders a failed chain read leaves unnamed where there are none", () => {
    renderDispute({ chain: failed() });

    expect(screen.getByRole("alert")).not.toHaveTextContent(/Appeal funders/);
  });

  it("says the template banner without the funders clause where no funder is left unnamed", () => {
    renderDispute({ disputes: untemplated(false) });

    const banner = screen.getByRole("alert");
    expect(banner).toHaveTextContent(/identified by its ID alone\./);
    expect(banner).not.toHaveTextContent(/appeal funder/);
  });

  it("does not name an outcome over sums read before the court saw the dispute move on", () => {
    renderDispute({
      detail: read({ detail: { ...detail156, funding: FUNDED }, isBehindStage: true }),
    });

    expect(fundingLines()[0]).toBe("Funding as last readETH");
  });

  it("says the funding is an earlier read's when this dispute's re-read fails", () => {
    renderDispute({
      detail: read({
        detail: { ...detail156, funding: FUNDED },
        error: new ReadFailure("The core subgraph returned HTTP 503 Service Unavailable", {
          source: SOURCES.core,
          status: "HTTP 503",
        }),
      }),
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      /show what an earlier read said, and so does the appeal funding/,
    );
  });
});

describe("what a failed dispute read costs the funding (#32)", () => {
  const failure = new ReadFailure("The core subgraph returned HTTP 503 Service Unavailable", {
    source: SOURCES.core,
    status: "HTTP 503",
  });
  /** The court's reading of dispute 156 with no appeal period opened in any round. */
  const beforeAppeal = (): CourtPerformanceView => {
    const rows = measured.performance?.rows.map((row) =>
      row.dispute.id === 156
        ? {
            ...row,
            dispute: {
              ...row.dispute,
              rounds: row.dispute.rounds.map((round) => ({
                ...round,
                appealOpenedAt: null,
                executionOpenedAt: null,
              })),
            },
          }
        : row,
    );
    if (measured.performance === null || rows === undefined) throw new Error("no court reading");
    return { ...measured, performance: { ...measured.performance, rows } };
  };

  it("leaves the funding out of a first read's failure before any appeal period opened", () => {
    renderDispute({
      performance: beforeAppeal(),
      detail: read({ error: failure, detail: NO_DETAIL, readAt: null }),
      chain: pending(),
    });

    const banner = screen.getByRole("alert");
    expect(banner).toHaveTextContent(
      /the timeline cannot say who opened each period or when each agent juror committed\./,
    );
    expect(banner).not.toHaveTextContent(/funded/);
  });

  it("names the funding in a failed re-read once an appeal opened, even with none read", () => {
    renderDispute({ detail: read({ error: failure }) });

    expect(screen.getByRole("alert")).toHaveTextContent(/and so does the appeal funding/);
  });

  it("leaves it out of a failed re-read with no appeal opened and none read", () => {
    renderDispute({ performance: beforeAppeal(), detail: read({ error: failure }) });

    expect(screen.getByRole("alert")).not.toHaveTextContent(/appeal funding/);
  });
});

/** A lane's lines as drawn: its text with everything said only to a screen reader taken out. */
function drawnLines(lane: HTMLElement): string[] {
  return within(lane)
    .getAllByRole("listitem")
    .map((item) => {
      const drawn = item.cloneNode(true) as HTMLElement;
      for (const hidden of drawn.querySelectorAll(`.${VisuallyHidden.styledComponentId}`)) {
        hidden.remove();
      }
      return drawn.textContent?.replace(/\s+/g, " ").trim() ?? "";
    });
}

describe("the timeline (ADR-0012)", () => {
  it("says when each period opened, and who opened it, in UTC", () => {
    renderDispute();

    expect(laneLines("Evidence")).toEqual(["21 Aug 06:56:27 Dispute created"]);
    expect(screen.getByText("All times UTC")).toBeInTheDocument();
    expect(laneLines("Commit period")[0]).toBe("07:42:00 Opened by the Kleros bot");
    expect(laneLines("Vote period")[0]).toBe("08:02:35 Opened by the Kleros bot");
    expect(laneLines("Appeal period")).toEqual([
      "08:12:55 Opened by the Kleros bot",
      // The appeal ran into the next day, which is the one place a day is printed again.
      "22 Aug 02:18:45 Closed by the Kleros bot",
    ]);
  });

  it("draws the bot's periods as the verb alone, and says who to a screen reader", () => {
    // #34: the bot passes most periods, so naming it on every line was noise. Every other
    // opener is still drawn.
    renderDispute();
    const lane = screen.getByRole("list", { name: "Appeal period" });
    const bot = within(lane).getAllByText("by the Kleros bot");

    for (const said of bot) expect(said.className).toContain(VisuallyHidden.styledComponentId);
    expect(drawnLines(lane)).toEqual(["08:12:55 Opened", "22 Aug 02:18:45 Closed"]);
  });

  it("draws an agent juror's commitment as its name alone, and says the verb to a screen reader", () => {
    renderDispute();
    const lane = screen.getByRole("list", { name: "Commit period" });
    const verbs = within(lane).getAllByText("committed");

    expect(verbs.length).toBeGreaterThan(0);
    for (const verb of verbs) expect(verb.className).toContain(VisuallyHidden.styledComponentId);
    expect(drawnLines(lane).some((line) => /committed/.test(line))).toBe(false);
  });

  it("calls any other account off the roster an off-roster account, never by its address", () => {
    // Whoever called `passPeriod` is not an agent juror this dashboard follows, nor the court's
    // own bot, and an address is the personal data it does not hold.
    const unknown = "0x1111111111111111111111111111111111111111";
    const { container } = renderDispute({
      chain: answered({
        ...DISPUTE_156_CHAIN,
        openings: DISPUTE_156_CHAIN.openings.map((opening) => ({ ...opening, from: unknown })),
      }),
    });

    expect(laneLines("Commit period")[0]).toBe("07:42:00 Opened by an off-roster account");
    expect(container.textContent).not.toMatch(/0x1111/i);
    expect(container.innerHTML).not.toMatch(/0x1111/i);
  });

  it("names the Kleros bot without printing its address either", () => {
    const { container } = renderDispute();

    expect(container.innerHTML).not.toMatch(/0x9eb6/i);
  });

  it("names a rostered agent juror that opened a period, by the name the panel uses", () => {
    const blaise = "0x57eb05d4dfFAc43A0C52B42C47a4E7d1838725Ea";
    renderDispute({
      chain: answered({
        ...DISPUTE_156_CHAIN,
        openings: DISPUTE_156_CHAIN.openings.map((opening) =>
          opening.period === "2" ? { ...opening, from: blaise.toLowerCase() } : opening,
        ),
      }),
    });

    expect(laneLines("Vote period")[0]).toBe("08:02:35 Opened by Blaise");
  });

  it("lists each commitment and reveal at its moment, in the order they happened", () => {
    // Clock readings and no durations: the seconds from an opening to an agent juror acting are
    // latency, which no surface setting agent jurors side by side may carry (ADR-0010).
    renderDispute();

    expect(laneLines("Commit period").slice(1)).toEqual([
      "07:43:43 ◐ Daemonhill committed",
      "07:44:12 ◐ 007 committed",
      "07:47:23 ◐ Blaise committed",
      "07:54:17 ◐ Columbo committed",
    ]);
    expect(laneLines("Vote period").slice(1)).toEqual([
      "08:03:06 ● Blaise revealed",
      "08:03:15 ● Daemonhill revealed",
      "08:03:58 ● 007 revealed",
      "08:04:32 ● Columbo revealed",
    ]);
    for (const period of ["Commit period", "Vote period"]) {
      for (const line of laneLines(period)) {
        expect(line).not.toMatch(/\d+m \d{2}s|\b\d+s\b/);
      }
    }
  });

  it("keeps the glyph out of what a screen reader hears", () => {
    renderDispute();
    const lane = screen.getByRole("list", { name: "Commit period" });

    for (const glyph of within(lane).getAllByText("◐")) {
      expect(glyph).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("marks who opened and when each committed as not read yet while the chain answers", () => {
    // Every cold load, for as long as the chain takes: a dash and nothing louder, because nothing
    // has failed. The openings are still dated, from the subgraph.
    renderDispute({ chain: pending() });

    expect(laneLines("Commit period")[0]).toBe("07:42:00 Opened by —an account not read yet");
    // With no moment to order them by, they keep the roster's order: 007 first, never a ranking.
    expect(laneLines("Commit period")[1]).toBe("—Time not read yet ◐ 007 committed");
    expect(screen.queryByText("Not read")).not.toBeInTheDocument();
    // Reveals are the subgraph's and need no chain read.
    expect(laneLines("Vote period")[1]).toBe("08:03:06 ● Blaise revealed");
  });

  it("marks a commitment an answered read did not find as not read, in rose", () => {
    renderDispute({ chain: answered({ ...DISPUTE_156_CHAIN, commits: [] }) });

    const lines = laneLines("Commit period").slice(1);
    expect(lines).toHaveLength(4);
    for (const line of lines) expect(line).toMatch(/^Not read ◐ \w+ committed$/);
  });

  it("says an opening an answered read did not find was not found, not who it guesses", () => {
    renderDispute({ chain: answered({ ...DISPUTE_156_CHAIN, openings: [] }) });

    expect(laneLines("Commit period")[0]).toBe("07:42:00 Opened by an account not found on chain");
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

  it("raises the window history, which the timeline is drawn against", () => {
    renderDispute({
      performance: { ...measured, parametersError: new Error("UnknownRpcError") },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(/period durations could not be read/i);
  });

  it("raises this dispute's own record when it could not be read, and says what it cost", () => {
    renderDispute({ chain: failed() });

    const banner = screen.getByRole("alert");
    expect(banner).toHaveTextContent(/this dispute's record could not be read from Arbitrum/i);
    expect(banner).toHaveTextContent(/not who opened it/i);
  });

  it("words a failed re-read as an earlier read still standing", () => {
    renderDispute({ chain: failed(DISPUTE_156_CHAIN) });

    expect(screen.getByRole("alert")).toHaveTextContent(/could not be re-read/i);
  });

  it("says both failed reads cost what an earlier read cannot cover, when one is held", () => {
    renderDispute({
      performance: { ...measured, parametersError: new Error("UnknownRpcError") },
      chain: failed(DISPUTE_156_CHAIN),
    });

    expect(screen.getByRole("alert")).toHaveTextContent(/come from an earlier read/);
  });

  it("says a failed dispute read costs the timeline its openers and commitments too", () => {
    renderDispute({
      detail: read({
        error: new ReadFailure("The core subgraph returned HTTP 503 Service Unavailable", {
          source: SOURCES.core,
          status: "HTTP 503",
        }),
        detail: NO_DETAIL,
        readAt: null,
      }),
      chain: pending(),
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      /the timeline cannot say who opened each period, when each agent juror committed, or how the appeal was funded/,
    );
  });

  it("still says so when the read it fell back to predates the draws and has no range", () => {
    // The read landed before anyone was drawn, and its re-read once the court saw a draw failed:
    // the payload is held, but it has no block range, so the timeline's chain read cannot run.
    renderDispute({
      detail: read({
        error: new ReadFailure("The core subgraph returned HTTP 503 Service Unavailable", {
          source: SOURCES.core,
          status: "HTTP 503",
        }),
        detail: { ...detail156, blockRange: null },
      }),
      chain: pending(),
    });

    expect(screen.getByRole("alert")).toHaveTextContent(/the timeline cannot say who opened/);
  });

  it("does not say so when only a re-read failed, since the timeline still has what it needs", () => {
    // A failed re-read keeps the earlier payload, block range and all, so the chain read runs and
    // the timeline is drawn: a banner saying it cannot be would describe something not on screen.
    renderDispute({
      detail: read({
        error: new ReadFailure("The core subgraph returned HTTP 503 Service Unavailable", {
          source: SOURCES.core,
          status: "HTTP 503",
        }),
      }),
    });

    const banner = screen.getByRole("alert");
    expect(banner).toHaveTextContent(/show what an earlier read said/);
    expect(banner).not.toHaveTextContent(/the timeline cannot say/);
  });

  it("states both Arbitrum failures in one line, since they share an endpoint", () => {
    // One source gets one banner line: listed twice it would read as two things having gone
    // wrong.
    renderDispute({
      performance: { ...measured, parametersError: new Error("UnknownRpcError") },
      chain: failed(),
    });

    const banner = screen.getByRole("alert");
    expect(banner).toHaveTextContent(/Neither the court's parameter history nor this dispute's/);
    // The host the build is configured to read, never a literal: a deploy that overrides
    // `VITE_ARBITRUM_RPC_URL` names its own host here, and a literal failed the deploy preview.
    expect(within(banner).getAllByText(arbitrumSource().name)).toHaveLength(1);
  });

  it("counts what an answered read did not find, as a count", () => {
    // A read that comes back short throws nothing: `eth_getLogs` capped at fewer blocks answers
    // with fewer logs. Two of 156's four commitments and one opening are dropped here.
    renderDispute({
      chain: answered({
        ...DISPUTE_156_CHAIN,
        openings: DISPUTE_156_CHAIN.openings.filter((opening) => opening.period !== "2"),
        commits: DISPUTE_156_CHAIN.commits.slice(2),
      }),
    });

    const banner = screen.getByRole("alert");
    expect(banner).toHaveTextContent(
      /2 of 4 commitments could not be found on Arbitrum, so when those agent jurors committed is unknown/,
    );
    // An opening that was not found keeps its moment, which is the subgraph's: only who opened
    // it is lost, and the banner says that rather than that the moment is unknown.
    expect(banner).toHaveTextContent(
      /1 of 4 period openings could not be found on Arbitrum, so who opened those periods is unknown/,
    );
  });

  it("raises nothing while the record is still being read, however much of it is missing", () => {
    // The trap this repository keeps meeting: an absence is only a shortfall once there has
    // been an answer to fall short of.
    renderDispute({ chain: pending() });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("raises nothing over a read standing in for one the court has since moved past", () => {
    // The court saw a commitment this read predates and a re-read is in flight. What it lacks is
    // not yet a finding.
    renderDispute({
      chain: { ...answered({ openings: [], commits: [], creator: null }), answered: false },
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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

  it("stamps no read under a page showing no dispute", () => {
    // A dispute range under a not-found page would be provenance for figures the reader cannot
    // see.
    renderDispute({ pathId: "abc" });

    expect(screen.queryByText(/^Read dispute/)).not.toBeInTheDocument();
  });
});
