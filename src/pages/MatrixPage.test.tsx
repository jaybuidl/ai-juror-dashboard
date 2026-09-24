import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { arbitrumSource } from "../performance/arbitrum";
import { formatMinutes } from "../performance/latency";
import { formatAgo, SOURCES } from "../read-failure";
import { ROSTER } from "../roster/agent-jurors";
import {
  COMFORTABLE_COLUMN_PX,
  COMFORTABLE_GRID_MIN_PX,
  ROW_HEADER_PX,
} from "../styles/breakpoints";
import {
  arbitrumFailed,
  arbitrumPending,
  disputes,
  disputesWithNewcomer,
  FIXTURE_ROSTER,
  measured,
  pausedDisputes,
  pausedPerformance,
  READ_AT,
  referenceFailed,
  referencePending,
  referenceShort,
  referenceStale,
  refused,
  renderAt,
  resolvingRoster,
  rewardsFailed,
  rewardsShort,
  staleDraws,
  unmeasured,
  unresolvedRoster,
  waitingCourt,
} from "../test/court";
import { PHONE_WIDTH, stubViewportWidth } from "../test/viewport";

/**
 * The landing view: the hero, the totals, the time-to-appeal strip and the matrix.
 *
 * Most of this suite came from `Dashboard.test.tsx`, which ticket 15 replaced. What moved with
 * the roster to `/agent-jurors` is tested there; what is left here is what the matrix view
 * itself claims.
 */

describe("the matrix view", () => {
  it("names what the page is", () => {
    // It used to state a finding — "Agents do not wait for the deadline." — which is the
    // artboard's headline and the more arresting of the two. Named rather than asserted now, on
    // the maintainer's call: the page is a dashboard people return to rather than an essay they
    // read once, and a title that says which dashboard is the one that survives a bookmark.
    renderAt("/");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /kleros ai agent jurors dashboard/i,
    );
  });

  it("takes the grid measure, so the grid is not asked to fit a prose page", () => {
    // The matrix is the one view whose content has a measurement of its own — a 440px row header
    // and one 148px column per agent juror — and the shared "wide" measure gives 1104px of
    // content on a 1440px screen. Under it the grid scrolled sideways in its own box on every
    // desktop, and it did something worse than scroll for three tickets: the table was laid out
    // auto, so it absorbed the shortfall by crushing the dispute title to 180px.
    renderAt("/");

    const frame = screen.getByRole("main").parentElement as HTMLElement;
    // Read off the constant rather than written down: the grid measure *is* the comfortable
    // grid's own width, so the page follows the roster the moment the grid does. It was a
    // literal 1328 here and a literal six behind that constant until ticket 24.
    expect(getComputedStyle(frame).maxWidth).toContain(`${COMFORTABLE_GRID_MIN_PX}px`);
  });

  /**
   * The chain the page measure hangs off, pinned link by link (ticket 25).
   *
   * The comment above `Frame` in `View.tsx` claims the grid measure "is derived from that
   * measurement rather than chosen … so it cannot drift from the grid it exists to fit". That was
   * true of the *page* and not of the grid: `COMFORTABLE_GRID_MIN_PX` held a literal 1328 for four
   * tickets, which is six columns, so the page could not drift from the grid and both could drift
   * from the roster together. Ticket 24 derived the constant and this pins the whole chain.
   *
   * Nothing here can add a roster entry — `ROSTER` is a module constant, and a test that could
   * replace it would be testing a roster nobody ships. What it asserts instead is that the width
   * is that arithmetic, so one more entry moves it by exactly one column, and that the page quotes
   * the width rather than a number of its own.
   */
  it("moves the grid minimum and the page measure together when the roster grows", () => {
    expect(COMFORTABLE_GRID_MIN_PX).toBe(ROW_HEADER_PX + ROSTER.length * COMFORTABLE_COLUMN_PX);

    // What a seventh, eighth or ninth agent juror costs: one column each, and nothing taken from
    // the row header. The ticket's own figures — seven columns give 1476 and nine give 1772.
    const withOneMore = ROW_HEADER_PX + (ROSTER.length + 1) * COMFORTABLE_COLUMN_PX;
    expect(withOneMore - COMFORTABLE_GRID_MIN_PX).toBe(COMFORTABLE_COLUMN_PX);

    renderAt("/");
    const frame = screen.getByRole("main").parentElement as HTMLElement;
    // The page's own half of it: a `calc` over the constant, so there is no second number here to
    // be left behind. A literal would pass the assertion above and still strand the page.
    expect(getComputedStyle(frame).maxWidth).toBe(
      `calc(${COMFORTABLE_GRID_MIN_PX}px + 2 * var(--gutter))`,
    );
  });

  it("says what it measures and, in the same breath, that it does nothing else", () => {
    renderAt("/");

    expect(screen.getByText(/it never votes, stakes, or holds a key/i)).toBeInTheDocument();
  });

  it("says what it has measured and, in the same breath, what it has not", () => {
    renderAt("/");

    // No caveat card. It was titled "Three measures, and what is missing from them" and every
    // claim in it was the method page's said a second time — checked claim by claim, including
    // the appeal-period one, which /method puts better.
    expect(
      screen.queryByText(/three measures, and what is missing from them/i),
    ).not.toBeInTheDocument();

    // The list of what has *not* been read is now empty, and that is the whole of ticket 10.
    // The court's period durations left it with ticket 08, the per-agent-juror summaries with
    // ticket 06, and the rewards here — every one of them because it was read. A caveat naming
    // an absence that has stopped being one is the same failure as an unnamed absence, in the
    // other direction, and it is the one this page is most at risk of: nobody notices a
    // sentence that has quietly become false.
    expect(screen.queryByText(/it measures nothing else yet/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/have not been read at all/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/per-agent-juror summaries.*not been read/i)).not.toBeInTheDocument();
  });

  it("claims no measurement it has not made", () => {
    // The page holds three figures, so the old blanket caveat would be false. What has to
    // survive is the half that still is true: everything it has not read, said outright.
    renderAt("/");

    expect(screen.queryByText(/nothing measured yet/i)).not.toBeInTheDocument();
  });

  /**
   * The sparsity note, which the phone's card list carries at its head.
   *
   * It was the third footnote below the grid, then a line in the provenance footer, and went with
   * that footer on 2026-09-24 (maintainer's ruling): the desktop page no longer carries it. The
   * phone's card is unchanged, so what the note says is pinned there.
   */
  describe("the sparsity note", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("says that a blank slot is the normal case", () => {
      stubViewportWidth(PHONE_WIDTH);
      renderAt("/");

      expect(screen.getByText(/sparsity is the normal state of this record/i)).toBeInTheDocument();
      // Count-agnostic: how many columns are blank end to end is a fact about what was read,
      // and this fixture's answer changed the day the court drew baskerville and a seventh
      // agent juror joined. What the note must keep saying is that the blankness is the
      // record's, not the read's.
      expect(screen.getByText(/agent jurors? (is|are) blank end to end/i)).toBeInTheDocument();
      expect(screen.getByText(/slots here are blank/i)).toBeInTheDocument();
    });

    it("is not on the desktop page, having gone with the footer", () => {
      renderAt("/");

      expect(
        screen.queryByText(/sparsity is the normal state of this record/i),
      ).not.toBeInTheDocument();
    });

    it("keeps a dispute whose draws were never read out of the count", () => {
      // The note's claim — that every blank means an agent juror was not drawn — is true of the
      // rows that were read and false of the one that was not. Folding the unread row's six
      // nulls into that count would make the sentence false about six of them.
      stubViewportWidth(PHONE_WIDTH);
      renderAt("/", { disputes: disputesWithNewcomer, performance: staleDraws });

      expect(screen.getByText(/not counted here at all/i, { selector: "p" })).toBeInTheDocument();
    });

    it("separates the two kinds of blank where the blanks are counted", () => {
      // The sentence that was wrong about eighteen slots: the note goes on saying that a blank
      // means an agent juror was not drawn, and now says which of the blanks it is counting
      // mean something else, by dispute id and as a count.
      stubViewportWidth(PHONE_WIDTH);
      renderAt("/", { performance: waitingCourt });

      const note = screen.getByText(/sparsity is the normal state of this record/i);

      // One panel-less dispute is one blank per agent juror, so the count follows the roster —
      // the one this court was built over, which since ticket 25 is `FIXTURE_ROSTER` rather than
      // the shipped list.
      expect(note).toHaveTextContent(
        new RegExp(`${FIXTURE_ROSTER.length} of those blanks are a different absence`),
      );
      expect(note).toHaveTextContent(/dispute 167 has no panel at all yet/);
      expect(note).toHaveTextContent(/the draw has not happened/);
    });

    it("is absent with no cards on screen, having no slots left to count", () => {
      // The dispute list replaces the cards there, and a note counting blank slots would be
      // counting cards that are not on the page.
      stubViewportWidth(PHONE_WIDTH);
      renderAt("/", { performance: unmeasured });

      expect(
        screen.queryByText(/sparsity is the normal state of this record/i),
      ).not.toBeInTheDocument();
    });
  });

  it("hangs the matrix off the court's disputes, newest first", () => {
    renderAt("/");

    expect(screen.getByRole("heading", { name: /the matrix/i })).toBeInTheDocument();

    const rows = screen.getAllByRole("rowheader");

    expect(rows[0]).toHaveTextContent("166");
    expect(rows[rows.length - 1]).toHaveTextContent("151");
  });

  it("names every agent juror as a column, including the one never drawn", () => {
    renderAt("/");

    for (const agentJuror of FIXTURE_ROSTER) {
      expect(screen.getAllByText(agentJuror.nickname).length).toBeGreaterThan(0);
    }
  });

  it("lists the disputes and says why, when the matrix cannot be built", () => {
    // A matrix built from a partial read would be a page of blank cells, and a blank cell says
    // an agent juror was not drawn. The record is shown instead, and the gap is stated.
    renderAt("/", { performance: unmeasured });

    expect(
      screen.getByText(/the matrix could not be built from what was read/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /the disputes/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /the matrix/i })).not.toBeInTheDocument();
  });

  it("does not describe cells and coherence above a page that is showing neither", () => {
    // The caveat can overstate as easily as the matrix can. On the failure path it says what
    // was not measured on this load, rather than how to read a matrix that is not there.
    renderAt("/", { performance: unmeasured });

    expect(screen.getByText(/nothing measured on this load/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/a blank cell means an agent juror was not drawn/i),
    ).not.toBeInTheDocument();
  });

  it("says nothing about a failed read while the read is still out", () => {
    renderAt("/", {
      performance: { ...measured, performance: null, isLoading: true, error: null },
    });

    expect(screen.queryByText(/the matrix could not be built/i)).not.toBeInTheDocument();
  });

  it("says the matrix may be stale when the court could not be re-read", () => {
    // react-query keeps the rows already held when a refetch fails, so the matrix rebuilds and
    // stays on the page. Rendering it silently would show an hour-old court as the full record.
    renderAt("/", {
      disputes: {
        ...disputes,
        error: new Error("Core subgraph returned HTTP 503 Service Unavailable"),
      },
    });

    expect(screen.getByText(/this matrix may be incomplete or out of date/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /the matrix/i })).toBeInTheDocument();
  });
});

describe("the totals above the matrix", () => {
  it("prints figures read from the model, not written into the page", () => {
    renderAt("/");

    const totals = measured.performance?.totals;
    if (totals === undefined) throw new Error("The captured court builds a model");

    expect(screen.getByText(String(totals.disputes))).toBeInTheDocument();
    expect(screen.getByText(String(totals.draws))).toBeInTheDocument();
    // The vote-ID count left the label on 2026-09-24, on the maintainer's call.
    expect(screen.queryByText(`Draws · ${totals.votes} vote IDs`)).not.toBeInTheDocument();
  });

  it("reads the drawn count against the whole roster, so a never-drawn agent juror is legible", () => {
    renderAt("/");

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText(`/${FIXTURE_ROSTER.length}`)).toBeInTheDocument();
  });

  it("plots one mark per dispute at appeal and says how many that is", () => {
    renderAt("/");

    const latency = measured.performance?.totals.timeToAppeal.summary;
    if (latency == null) throw new Error("The captured court has disputes at appeal");

    expect(
      screen.getByRole("heading", { name: `Time to appeal · ${latency.seconds.length} disputes` }),
    ).toBeInTheDocument();
    // Not a draw count: the headline stopped being the median reveal on 2026-09-24.
    expect(screen.queryByRole("heading", { name: /reveal latency ·/i })).not.toBeInTheDocument();
  });

  it("quotes the median as one figure, wherever it appears", () => {
    renderAt("/");

    const latency = measured.performance?.totals.timeToAppeal.summary;
    if (latency == null) throw new Error("The captured court has disputes at appeal");
    const median = formatMinutes(latency.median);

    // The tile, the median line on the strip and the summary are three readings of one
    // number — read from the model here too, because a literal would only pin the fixture.
    expect(screen.getAllByText(median).length).toBeGreaterThan(1);
    expect(screen.getByText(`${median} median`)).toBeInTheDocument();
  });

  it("says it has nothing rather than showing zeros, when nothing was measured", () => {
    renderAt("/", { performance: unmeasured });

    expect(screen.getByText(/nothing has been measured on this load/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /time to appeal ·/i })).not.toBeInTheDocument();
    // A `0` here would be a claim about the court that nobody measured.
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});

describe("the matrix view's reads", () => {
  it("discloses a fallback to the roster when ENS could not be reached", () => {
    renderAt("/", { roster: unresolvedRoster });

    expect(screen.getAllByText(/ENS could not be reached/i).length).toBeGreaterThan(0);
  });

  it("does not announce an ENS failure while the lookup is still out", () => {
    renderAt("/", { roster: resolvingRoster });

    expect(screen.queryByText(/ENS could not be reached/i)).not.toBeInTheDocument();
  });

  it("says so when the draws are a staler read than the disputes above them", () => {
    // The failure the matrix cannot show by itself: react-query kept the draws it already held
    // while the dispute list was re-read successfully. A dispute newer than that draw read then
    // has no cells — and a cell with no draw is drawn as not drawn, which is a claim about the
    // court rather than about the read.
    renderAt("/", {
      performance: {
        ...measured,
        error: new Error("Core subgraph returned HTTP 503 Service Unavailable"),
      },
    });

    expect(screen.getByRole("heading", { name: /the matrix/i })).toBeInTheDocument();
    expect(screen.getByText(/this matrix may be incomplete or out of date/i)).toBeInTheDocument();
  });

  it("does not become a third place a failed read is announced", () => {
    renderAt("/", { performance: unmeasured });

    // Ticket 13 fixes the announcement at two: where the figure would have been, and once in
    // a banner.
    expect(screen.getAllByText(/could not be built/i)).toHaveLength(1);
  });

  it("never says commit latency has not been read at all, on any load", () => {
    // The sentence ticket 15 left behind. It was true when it was written and is false now, in
    // both directions: the commitments are either in, or in flight.
    for (const performance of [measured, arbitrumPending]) {
      const { unmount } = renderAt("/", { performance });

      expect(
        screen.queryByText(/commit latency.*have not been read at all/i),
      ).not.toBeInTheDocument();
      unmount();
    }
  });

  describe("the court's period durations", () => {
    it("no longer claims the period durations are unread, now that they are read", () => {
      renderAt("/");

      expect(
        screen.queryByText(/historical period durations have not been read/i),
      ).not.toBeInTheDocument();
    });

    it("says the read failed once it has failed, rather than that it is still going", () => {
      // The trap `CLAUDE.md` records against `RosterView`, in its second home: `read` is false
      // in both states, and a caveat that announces "still being read" about a read that gave
      // up minutes ago is a caveat a reader learns to ignore.
      //
      // A read that failed is a failure and belongs to the banner, which names the endpoint.
      // (The in-flight half was a footer line, removed with the footer on 2026-09-24.)
      renderAt("/", { performance: arbitrumFailed });

      expect(screen.queryByText(/period durations are still being read/i)).not.toBeInTheDocument();
      // Asked of `arbitrumSource()` rather than of the literal `arb1.arbitrum.io`, because the
      // banner names the endpoint *in use* and these tests run in whatever environment builds
      // them. `yarn build:ci` runs this suite on Netlify with the deploy's own
      // VITE_ARBITRUM_RPC_URL set, where the literal is the wrong answer — it failed there and
      // passed on every developer machine. What the default derives to is pinned once, in
      // `performance/arbitrum.test.ts`, which is where that belongs.
      expect(
        within(screen.getByRole("alert")).getByText(arbitrumSource().name),
      ).toBeInTheDocument();
    });

    it("names the payouts in the banner, and says so once rather than beside the disputes", () => {
      // Ticket 10's read comes from the *core* subgraph, unlike the two Arbitrum ones, so it
      // shares an endpoint with the disputes and the draws. That makes it the fourth read
      // `coreFailureOf` has to collapse into one line: a Goldsky outage raises all four, and a
      // banner listing one deployment four times reads as four things having gone wrong.
      renderAt("/", { performance: rewardsFailed });

      const banner = screen.getByRole("alert");
      expect(
        within(banner).getByText(/the court's payouts could not be read/i),
      ).toBeInTheDocument();
      expect(within(banner).getAllByText(SOURCES.core.name)).toHaveLength(1);
    });

    it("keeps the payout failure below every failure that costs more than it does", () => {
      // Precedence, and the reason it is worst-first: a failed dispute read leaves the whole
      // page stale, where a failed payout read costs two of the six figures in each column
      // header. A reader counting sources in a banner is working out how bad it is.
      renderAt("/", {
        performance: { ...rewardsFailed, error: new Error("The core subgraph returned HTTP 503") },
      });

      expect(screen.queryByText(/the court's payouts could not be read/i)).not.toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("still names the payout failure when a stale read would otherwise take the banner", () => {
      // Found by review, and the reason the payout branch outranks the stale read rather than
      // sitting below it. Both are `SOURCES.core`, so only one line is printed — and ranked the
      // other way this page said nothing about the payouts anywhere at all: the banner was
      // occupied, and both column slots fall back to the same pending dash a never-drawn column
      // shows. "A read that fails is said exactly twice" came out as zero.
      //
      // The stale read can afford to yield because it has two voices of its own: every affected
      // row carries a `?` flag and draws its cells as Unknown.
      renderAt("/", {
        disputes: disputesWithNewcomer,
        performance: { ...staleDraws, error: null, rewardsError: new Error("HTTP 502") },
      });

      expect(screen.getByText(/the court's payouts could not be read/i)).toBeInTheDocument();
      // And the row still says what it says, so nothing was traded away for it.
      expect(screen.getAllByText(/not read/i).length).toBeGreaterThan(0);
    });

    it("calls a payout read that came back short a short read, not an empty court", () => {
      // No error anywhere: a reindexing Goldsky answers HTTP 200 with `[]`. Without this the
      // page would render six columns of `0.0000` — a statement that six named agent jurors
      // have earned nothing — with nothing on the page to qualify it.
      renderAt("/", { performance: rewardsShort });

      expect(screen.getByText(/the court's payouts came back short/i)).toBeInTheDocument();
    });

    it("does not label the tiles partial over a read none of them depends on", () => {
      // Found by review. `affects` is per *source*, and ticket 10 added the first core-subgraph
      // failure that leaves the figures above the matrix whole: nothing on the tiles or the
      // strip reads a payout. Marking them "Partial" would be ticket 13's own first-cut mistake
      // at a finer grain — the one its comment records as "labelled every stat tile partial over
      // a missing dispute title, contradicting a notice a few hundred pixels below it".
      renderAt("/", { performance: rewardsFailed });

      // The banner still says it, so nothing was traded away for the correction.
      expect(screen.getByText(/the court's payouts could not be read/i)).toBeInTheDocument();
      expect(screen.queryByText(/^Partial/i)).not.toBeInTheDocument();
    });

    it("still labels them partial when the failure is one they do depend on", () => {
      // The other direction, so the narrowing above cannot silently swallow a real caveat.
      renderAt("/", { performance: staleDraws });

      expect(screen.getAllByText(/partial/i).length).toBeGreaterThan(0);
    });

    it("names the window history in the banner when it is the only Arbitrum read that failed", () => {
      // One source gets one line: `arbitrumFailed` carries both Arbitrum errors, because one
      // endpoint serving both reads is one outage, and a banner listing it twice reads as two
      // faults. So the parameter history's own sentence is the one that shows when the commit
      // scan is fine — which also pins the precedence, since the commit failure outranks it.
      renderAt("/", {
        performance: { ...arbitrumPending, parametersError: new Error("UnknownRpcError") },
      });

      expect(
        screen.getByText(/the court's period durations could not be read/i),
      ).toBeInTheDocument();
      expect(screen.queryByText(/period durations are still being read/i)).not.toBeInTheDocument();
    });

    it("names a failed commitment read in the banner", () => {
      renderAt("/", { performance: arbitrumFailed });
      expect(screen.getByText(/the commitments could not be read/i)).toBeInTheDocument();
    });
  });
});

describe("the failure banner", () => {
  /**
   * Ticket 13's channel: a failure that changes a number is loud and blocking, a failure that
   * changes only a label is quiet and local, and ENS is the one documented exception.
   *
   * Every fixture these lean on is hand-built, for the reason `CLAUDE.md` gives — every captured
   * payload in this repository is a read that worked, so none can hand you one that did not, and
   * a suite built only from fixtures would pass while proving nothing about failure.
   */

  it("says nothing at all when every read succeeded", () => {
    renderAt("/");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/do not cite these figures/i)).not.toBeInTheDocument();
  });

  it("names the source, the status and how long ago the last complete read was", () => {
    renderAt("/", { performance: staleDraws });

    const banner = screen.getByRole("alert");

    expect(within(banner).getByText(/do not cite these figures/i)).toBeInTheDocument();
    expect(within(banner).getByText("Incomplete")).toBeInTheDocument();
    expect(within(banner).getByText("kleros-v2-coreneo")).toBeInTheDocument();
    expect(within(banner).getByText("HTTP 502")).toBeInTheDocument();
    expect(within(banner).getByText(/ago$/)).toBeInTheDocument();
  });

  it("dates the page by the staler of its two reads, not the fresher one", () => {
    // The page is built from two queries that succeed at different moments, and the case this
    // banner exists for is the one where they differ. Dating an incomplete page by the read that
    // *did* work would hand a citing reader exactly the reassurance the banner is withholding.
    renderAt("/", { performance: staleDraws });

    const banner = screen.getByRole("alert");
    const disputeRead = disputes.readAt;
    const drawRead = staleDraws.readAt;
    if (disputeRead === null || drawRead === null) throw new Error("both fixtures carry a moment");

    expect(drawRead).toBeLessThan(disputeRead);
    expect(within(banner).getByText(formatAgo(drawRead, Date.now()))).toBeInTheDocument();
  });

  it("says the page was never complete when one of its two reads never landed", () => {
    renderAt("/", { performance: unmeasured });

    expect(within(screen.getByRole("alert")).getByText("Never")).toBeInTheDocument();
  });

  it("offers a retry that re-reads rather than reloading the page", () => {
    // Recovery needs no full page reload: the banner is computed from the queries' own state, so
    // a refetch that succeeds clears it and there is no separate thing to dismiss.
    const retry = vi.fn();
    renderAt("/", { performance: { ...staleDraws, retry } });

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(retry).toHaveBeenCalledOnce();
  });

  it("sends a reader who has never seen a partial page somewhere that explains one", () => {
    renderAt("/", { performance: staleDraws });

    expect(screen.getByRole("link", { name: /what this means/i })).toHaveAttribute(
      "href",
      "/method#partial",
    );
  });

  it("raises no banner when only ENS failed, because no figure depends on it", () => {
    // The one documented exception, and the criterion most easily got wrong: a rose banner over
    // a complete set of figures because some avatars are missing would teach a reader that the
    // banner does not mean what it says.
    renderAt("/", { roster: unresolvedRoster });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText(/names are falling back to the roster/i)).toBeInTheDocument();
  });

  it("says nothing while the ENS lookup is merely still out", () => {
    renderAt("/", { roster: resolvingRoster });

    expect(screen.queryByText(/names are falling back to the roster/i)).not.toBeInTheDocument();
  });

  it("announces a paused read, which never arrives as an error at all", () => {
    // react-query's default networkMode pauses rather than fails when the browser reports no
    // connection: nothing is thrown, `isPending` stays true, and every notice in this repository
    // keys on the error channel. Without this the offline visitor reads "Reading the court…"
    // indefinitely — the one failure that looks exactly like a slow success.
    renderAt("/", { disputes: pausedDisputes, performance: pausedPerformance });

    expect(screen.getByRole("alert")).toHaveTextContent(/reports no network connection/i);
  });

  it("never invents a status for a failure that arrived without one", () => {
    renderAt("/", {
      performance: {
        ...measured,
        commitError: new Error("Cannot read properties of undefined (reading 'error')"),
      },
    });

    const banner = screen.getByRole("alert");

    // The endpoint in use, not the default one — as above.
    expect(within(banner).getByText(arbitrumSource().name)).toBeInTheDocument();
    expect(within(banner).getByText("No response")).toBeInTheDocument();
    expect(within(banner).queryByText(/HTTP 0/)).not.toBeInTheDocument();
  });

  it("tells a payload the seam refused from an endpoint that never answered", () => {
    // Not an outage: every endpoint replied and what came back was something this dashboard
    // could not believe. Wording it as an outage would send a reader to check a service that is
    // up. The code and the offending draw are the whole content of that distinction, and
    // `useCourtPerformance` used to flatten both into one sentence.
    renderAt("/", { performance: refused });

    const banner = screen.getByRole("alert");

    expect(within(banner).getByText("MALFORMED_COURT_DATA")).toBeInTheDocument();
    expect(within(banner).getByText(/unreadable id/i)).toBeInTheDocument();
    expect(within(banner).getByText(/every endpoint answered/i)).toBeInTheDocument();
  });

  it("names one fault once, however many channels carry it", () => {
    // A refused payload arrives as both `failure` and a flattened `error`, and a failed dispute
    // read propagates into `performance.error` too. Each would otherwise be listed twice, and
    // two entries read as two things having gone wrong.
    renderAt("/", { performance: refused });

    expect(within(screen.getByRole("alert")).getAllByText("kleros-v2-coreneo")).toHaveLength(1);
  });

  it("raises the banner when two reads that both succeeded landed at different moments", () => {
    // The case with no error anywhere. react-query holds the draws for a minute, so a dispute
    // created between the two reads joins a fresh list to draws that could not have mentioned it.
    // Nothing failed and part of the page still could not be read — and without this the rows go
    // Unknown and the tiles say "Partial" while the top of the page stays silent.
    renderAt("/", {
      disputes: disputesWithNewcomer,
      performance: { ...staleDraws, error: null },
    });

    const banner = screen.getByRole("alert");

    expect(within(banner).getByText("Stale read")).toBeInTheDocument();
    expect(
      within(banner).getByText(/created after the draws on this page were last read/i),
    ).toBeInTheDocument();
  });

  it("says the same failure twice: at the top of the page, and where the figures are", () => {
    // The criterion, and the reason the banner is not enough by itself — a reader who has
    // scrolled to the matrix has left it behind.
    renderAt("/", { performance: staleDraws });

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/this matrix may be incomplete or out of date/i)).toBeInTheDocument();
  });

  it("labels the aggregates partial rather than letting the numerals speak for a short read", () => {
    renderAt("/", { disputes: disputesWithNewcomer, performance: staleDraws });

    expect(screen.getByText(/^Partial\./)).toBeInTheDocument();
    expect(screen.getByText(/never as zero/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /time to appeal · .* · partial/i }),
    ).toBeInTheDocument();
  });

  it("does not call the totals partial over a source none of them reads", () => {
    // The four tiles and the strip are read entirely from the core subgraph. A dispute whose
    // template simply does not come back is normal and not an error, so labelling every figure
    // partial over it would be a caveat that is plainly false — and a reader who checks one and
    // finds it baseless stops checking the ones that are not. The banner still names the
    // shortfall; the figures it does not touch stay unqualified.
    renderAt("/", {
      disputes: {
        ...disputes,
        titles: { expected: 16, resolved: 13, isLoading: false, readAt: READ_AT },
      },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(/dispute subjects could not be read/i);
    expect(screen.queryByText(/^Partial\./)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /· partial/i })).not.toBeInTheDocument();
  });

  it("does not call a commit column measured a minute ago unmeasured", () => {
    // react-query keeps the commitments it holds when a refetch fails, so an Arbitrum outage
    // usually arrives over a full column of real figures — and CLAUDE.md says arb1 rate-limits
    // and surfaces it as exactly this kind of opaque error. Saying "no commit latency below is a
    // measurement" there is false about every one of them.
    renderAt("/", {
      performance: { ...measured, commitError: new Error("UnknownRpcError") },
    });

    const banner = screen.getByRole("alert");

    expect(within(banner).getByText(/could not be re-read from arbitrum/i)).toBeInTheDocument();
    expect(
      within(banner).queryByText(/no commit latency below is a measurement/i),
    ).not.toBeInTheDocument();
  });

  it("still says nothing is a measurement when the commit scan never landed", () => {
    renderAt("/", {
      performance: { ...arbitrumPending, commitError: new Error("UnknownRpcError") },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      /no commit latency below is a measurement/i,
    );
  });

  it("keeps the banner off the views that carry no figure of their own", () => {
    // The 404 in particular must never look like a failure state: Netlify answers every unknown
    // path with the app shell at HTTP 200, so this view is the only thing that can tell a
    // visitor the address is wrong — and it says outright that nothing failed to load.
    const notFound = renderAt("/nope", { performance: staleDraws });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    notFound.unmount();

    renderAt("/method", { performance: staleDraws });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the banner off the agent-juror index, which reads nothing but ENS", () => {
    renderAt("/agent-jurors", { roster: unresolvedRoster, performance: staleDraws });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says one failure in one voice", () => {
    // A reader who meets the same sentence twice stops reading either.
    renderAt("/", { performance: staleDraws });

    expect(screen.getAllByText(/do not cite these figures/i)).toHaveLength(1);
  });
});

/**
 * The same view below the breakpoint.
 *
 * jsdom implements no `matchMedia` at all, so every test above renders the desktop form without
 * asking for it — which is the same guard that keeps `useIsNarrow` from throwing in a browser
 * that lacks it. These say so explicitly.
 */
describe("the matrix view on a phone", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("replaces the matrix with one card per dispute rather than shrinking it", () => {
    stubViewportWidth(PHONE_WIDTH);
    renderAt("/");

    // Not rendered, not hidden. A display:none table is still built, still 96 cells of DOM on
    // the device least able to afford them, and still in the page a reader saves or prints.
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /^Dispute 163\b/ })).toBeInTheDocument();
  });

  it("carries the sparsity note once, at the head of the cards", () => {
    // Ticket 16 put it there deliberately: it prevents a misreading rather than answering a
    // question, and a reader who does not know they have been misled never scrolls to the foot
    // of the page to find out.
    stubViewportWidth(PHONE_WIDTH);
    renderAt("/");

    expect(screen.getAllByText(/sparsity is the normal state of this record/i)).toHaveLength(1);
    // The phone's noun.
    expect(screen.getByText(/slots here are blank/i)).toBeInTheDocument();
  });

  it("keeps the matrix above the breakpoint", () => {
    stubViewportWidth(1280);
    renderAt("/");

    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("drops the deck and the latency strip, and loses no measured figure with them", () => {
    stubViewportWidth(PHONE_WIDTH);
    renderAt("/");

    // The deck goes, and its read-only clause with it on a phone: the footer that repeated it
    // was removed on 2026-09-24 by the maintainer's ruling. /method states the invariant.
    expect(screen.queryByText(/it never votes, stakes, or holds a key/i)).not.toBeInTheDocument();

    // The strip goes; its headline figure is the median time to appeal, which the tiles lead
    // with, and its comparison band is drawn at every width on the agent juror view.
    expect(screen.queryByRole("heading", { name: /time to appeal ·/i })).not.toBeInTheDocument();

    // The figure did not leave the page with the strip: it is the tile that leads it.
    const median = formatMinutes(measured.performance?.totals.timeToAppeal.summary?.median ?? 0);
    expect(screen.getAllByText(median).length).toBeGreaterThan(0);
    expect(screen.getByText(/^Median to appeal/)).toBeInTheDocument();
  });

  it("shows three tiles, with the median time to appeal leading and the drawn count gone", () => {
    stubViewportWidth(PHONE_WIDTH);
    renderAt("/");

    const labels = screen
      .getAllByText(/^(Disputes read|Draws.*|Agent jurors drawn|Median to appeal.*)$/)
      .map((node) => node.textContent);

    // `Mobile.dc.html:47-51`: the headline median, draws, disputes. The roster's drawn count is a fact
    // about the roster rather than about the record, and `/agent-jurors` carries it in more
    // detail than a tile can.
    expect(labels).toHaveLength(3);
    expect(labels[0]).toMatch(/^Median to appeal/);
    expect(labels[1]).toBe("Draws");
    expect(labels[2]).toBe("Disputes read");
  });

  it("keeps the eyebrow's chain and drops the court's name", () => {
    stubViewportWidth(PHONE_WIDTH);
    renderAt("/");

    // The chain is what the eyebrow still locates the data by; the court's name is the one
    // segment a reader can lose without losing the scope.
    const eyebrow = screen.getByText(/^Arbitrum One$/);
    expect(eyebrow).not.toHaveTextContent("Agentic Commerce Court");
  });

  it("keeps the headline the same sentence, never a shorter or a different one", () => {
    stubViewportWidth(PHONE_WIDTH);
    renderAt("/");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /^Kleros AI Agent Jurors Dashboard$/,
    );
  });

  it("folds the nav onto one line without dropping a destination", () => {
    stubViewportWidth(PHONE_WIDTH);
    renderAt("/");

    // The four destinations are behind one affordance rather than gone: a route a phone visitor
    // could not reach is the failure ticket 15 refused when it ruled that a nav entry needs an
    // index or does not appear.
    const menu = screen.getByRole("button", { name: /open the menu/i });
    expect(menu).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Method" })).not.toBeInTheDocument();

    fireEvent.click(menu);

    expect(menu).toHaveAttribute("aria-expanded", "true");
    for (const label of ["Disputes", "Agent jurors", "Method"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
    // The matrix is the page being looked at, so it is marked rather than linked — the same rule
    // the wide bar follows.
    expect(screen.getByText("Matrix")).toHaveAttribute("aria-current", "page");
  });

  it("keeps the folded menu shut when the visitor comes back to where they opened it", () => {
    stubViewportWidth(PHONE_WIDTH);
    renderAt("/");

    fireEvent.click(screen.getByRole("button", { name: /open the menu/i }));
    fireEvent.click(screen.getByRole("link", { name: "Method" }));
    fireEvent.click(screen.getByRole("link", { name: /Kleros ×AI/ }));

    // Found by review, and invisible to the forward-navigation test above: the state was keyed on
    // the path the menu was open *for*, which the path never stopped matching once you returned
    // to it. Arriving Home found the panel open over the page just asked for — and Back did the
    // same. What has to be watched is the path changing, not the path matching.
    expect(screen.getByRole("button", { name: /open the menu/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByRole("link", { name: "Disputes" })).not.toBeInTheDocument();
  });

  it("names no column header in a payout failure banner", () => {
    stubViewportWidth(PHONE_WIDTH);
    renderAt("/", { performance: rewardsFailed });

    // The banner survives the fold — the read did fail — but it may not name furniture this
    // layout has none of. Ticket 16's own review caught this exact fault in the commit-shortfall
    // notice: a reader sent hunting for a string that is not on the page.
    const banner = screen.getByText(/payouts could not be read/i);
    expect(banner).not.toHaveTextContent(/column header/i);
  });

  it("closes the folded menu on the way to the page it opened", () => {
    stubViewportWidth(PHONE_WIDTH);
    renderAt("/");

    fireEvent.click(screen.getByRole("button", { name: /open the menu/i }));
    fireEvent.click(screen.getByRole("link", { name: "Method" }));

    // react-router does not unmount the nav between routes, so a menu left open would cover the
    // page the visitor just asked for.
    expect(screen.getByRole("button", { name: /open the menu/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByRole("link", { name: "Disputes" })).not.toBeInTheDocument();
  });
});

/**
 * Ticket 23: the comparison band is a reading now, so it can be in flight, fail, or come back
 * short. Each of those is said, and none is drawn as a band at a default.
 */
describe("the comparison band's read", () => {
  it("draws the band's place as being read while the read is out, and raises no alarm", () => {
    renderAt("/", { performance: referencePending });

    expect(screen.getByText("being read")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("names a failed read once in the banner, and says so where the band would be", () => {
    renderAt("/", { performance: referenceFailed });

    const banner = screen.getByRole("alert");
    expect(
      within(banner).getByText(/the comparison court's disputes could not be read/i),
    ).toBeInTheDocument();
    expect(within(banner).getAllByText(SOURCES.core.name)).toHaveLength(1);
    expect(screen.getByText("not read")).toBeInTheDocument();
  });

  it("reports a short read as the two counts, with no error anywhere", () => {
    renderAt("/", { performance: referenceShort });

    const banner = screen.getByRole("alert");
    expect(within(banner).getByText(/came back short, 47 of the 87 it holds/i)).toBeInTheDocument();
    expect(screen.getByText("not read")).toBeInTheDocument();
  });

  it("keeps drawing an earlier reading when a re-read fails, and says it is earlier", () => {
    renderAt("/", { performance: referenceStale });

    expect(screen.getByText(/comes from an earlier read/i)).toBeInTheDocument();
  });

  it("ranks below every other core-subgraph failure, which costs more than the band does", () => {
    renderAt("/", { performance: { ...referenceFailed, rewardsError: new Error("HTTP 502") } });

    expect(screen.getByText(/the court's payouts could not be read/i)).toBeInTheDocument();
    expect(screen.queryByText(/comparison court's disputes/i)).not.toBeInTheDocument();
  });

  it("does not label the tiles partial over a read none of them depends on", () => {
    renderAt("/", { performance: referenceFailed });

    const heading = screen.getByRole("heading", { name: /time to appeal ·/i });
    expect(heading).not.toHaveTextContent(/partial/i);
  });
});
