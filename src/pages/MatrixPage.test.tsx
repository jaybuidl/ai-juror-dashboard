import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { arbitrumSource } from "../performance/arbitrum";
import { formatLatencySeconds } from "../performance/latency";
import { ORDINARY_COURT_PROSE } from "../performance/strip";
import { formatAgo, SOURCES } from "../read-failure";
import { ROSTER } from "../roster/agent-jurors";
import {
  arbitrumFailed,
  arbitrumPending,
  denseCourt,
  denseUnpaidCourt,
  disputes,
  disputesWithNewcomer,
  measured,
  pausedDisputes,
  pausedPerformance,
  READ_AT,
  refused,
  renderAt,
  resolvingRoster,
  rewardsFailed,
  rewardsInFeeToken,
  rewardsPending,
  rewardsShort,
  roomyCourt,
  staleDraws,
  unmeasured,
  unresolvedRoster,
  waitingCourt,
} from "../test/court";
import { PHONE_WIDTH, stubViewportWidth } from "../test/viewport";

/**
 * The landing view: the hero, the totals, the strip and the matrix.
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
    // The matrix is the one view whose content has a measurement of its own — a 440px row
    // header and six 148px columns, 1328px — and the shared "wide" measure gives 1104px of
    // content on a 1440px screen. Under it the grid scrolled sideways in its own box on every
    // desktop, and it did something worse than scroll for three tickets: the table was laid out
    // auto, so it absorbed the 224px shortfall by crushing the dispute title to 180px.
    renderAt("/");

    const frame = screen.getByRole("main").parentElement as HTMLElement;
    expect(getComputedStyle(frame).maxWidth).toContain("1328px");
  });

  it("says what it measures and, in the same breath, that it does nothing else", () => {
    renderAt("/");

    expect(screen.getByText(/it never votes, stakes, or holds a key/i)).toBeInTheDocument();
  });

  it("says what it has measured and, in the same breath, what it has not", () => {
    renderAt("/");

    // No caveat card. It was titled "Three measures, and what is missing from them" and every
    // claim in it was the method page's said a second time — checked claim by claim, including
    // the appeal-period one, which /method puts better. What is asserted here is the half that
    // was never duplicated: the footer's account of what the reward figures are summed over.
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

    // What replaces it says what the two reward figures are *over*, which is the one thing a
    // reader cannot see from the figures themselves: a dispute the court has ruled but not yet
    // executed is in the coherence count and in neither of these.
    expect(
      screen.getByText(/summed over the 44 draws the court has executed and paid out/i),
    ).toBeInTheDocument();
  });

  it("claims no measurement it has not made", () => {
    // The page holds three figures, so the old blanket caveat would be false. What has to
    // survive is the half that still is true: everything it has not read, said outright.
    renderAt("/");

    // ADR-0005, in the footnote under the grid rather than in a caveat card above it. The card
    // said it a third time, after /method and after this note; what a reader meets three times
    // they stop reading once.
    expect(screen.queryByText(/nothing measured yet/i)).not.toBeInTheDocument();
    expect(screen.getByText(/never as a fraction of the window it ran in/i)).toBeInTheDocument();
  });

  /**
   * The sparsity note, which this page composes rather than the matrix.
   *
   * It was the third footnote below the grid until it moved into the provenance footer, above
   * the identity line. The move is the reason these live here: `Matrix` no longer renders it,
   * and a caveat is tested where it is composed. The words themselves are unchanged and still
   * come from the one `SparsityNote` the phone's card list reads from, which is what keeps the
   * two renderings from forking.
   */
  describe("the sparsity note", () => {
    it("says that a blank cell is the normal case", () => {
      renderAt("/");

      // Worded about the *record* rather than about the matrix since ticket 16, because the
      // phone says the same sentence over a layout with no grid and no columns in it. What
      // stays is the noun for the position itself: a cell here, a slot there, one figure behind
      // both.
      expect(screen.getByText(/sparsity is the normal state of this record/i)).toBeInTheDocument();
      expect(screen.getByText(/one agent juror is blank end to end/i)).toBeInTheDocument();
      expect(screen.getByText(/cells here are blank/i)).toBeInTheDocument();
    });

    it("sits in the footer, above the line naming how agent jurors are identified", () => {
      // The placement is the whole of this change and nothing else asserts it. Both are in the
      // footer's own element, and in this order: the note says what the record as a whole is
      // like, which is the same kind of claim as the lines around it, and the identity line
      // stays last of the prose as it was.
      renderAt("/");

      const footer = screen.getByRole("contentinfo");
      const note = within(footer).getByText(/sparsity is the normal state of this record/i);
      const identity = within(footer).getByText(/identified by nickname, avatar and stack/i);

      expect(note.compareDocumentPosition(identity)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it("is not also under the grid, where it used to be", () => {
      // The † and ‡ footnotes stay there — they decode marks the reader can see in the grid —
      // and this one no longer joins them. Said twice it would be the one caveat this dashboard
      // cannot afford to lose, halved in weight.
      renderAt("/");

      expect(screen.getAllByText(/sparsity is the normal state of this record/i)).toHaveLength(1);
      expect(screen.getByText(/never as a fraction of the window it ran in/i)).toBeInTheDocument();
    });

    it("keeps a dispute whose draws were never read out of the count", () => {
      // The note's claim — that every blank means an agent juror was not drawn — is true of the
      // rows that were read and false of the one that was not. Folding the unread row's six
      // nulls into that count would make the sentence false about six of them.
      renderAt("/", { disputes: disputesWithNewcomer, performance: staleDraws });

      expect(screen.getByText(/not counted here at all/i, { selector: "p" })).toBeInTheDocument();
    });

    it("separates the two kinds of blank where the blanks are counted", () => {
      // The sentence that was wrong about eighteen cells: the note goes on saying that a blank
      // means an agent juror was not drawn, and now says which of the blanks it is counting
      // mean something else, by dispute id and as a count.
      renderAt("/", { performance: waitingCourt });

      const note = screen.getByText(/sparsity is the normal state of this record/i);

      expect(note).toHaveTextContent(/6 of those blanks are a different absence/);
      expect(note).toHaveTextContent(/dispute 167 has no panel at all yet/);
      expect(note).toHaveTextContent(/the draw has not happened/);
    });

    it("goes on saying it at the compact density, where the grid drops most else", () => {
      renderAt("/", { performance: denseCourt });

      expect(screen.getByText(/sparsity is the normal state of this record/i)).toBeInTheDocument();
    });

    it("is absent with no matrix on screen, having no cells left to count", () => {
      // The dispute list replaces the grid there, and a note counting blank cells would be
      // counting a grid that is not on the page.
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

    for (const agentJuror of ROSTER) {
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
    expect(screen.getByText(`Draws · ${totals.votes} vote IDs`)).toBeInTheDocument();
  });

  it("reads the drawn count against the whole roster, so a never-drawn agent juror is legible", () => {
    renderAt("/");

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText(`/${ROSTER.length}`)).toBeInTheDocument();
  });

  it("plots one mark per revealed draw and says how many that is", () => {
    renderAt("/");

    const latency = measured.performance?.totals.revealLatency;
    if (latency == null) throw new Error("The captured court has revealed draws");

    expect(
      screen.getByRole("heading", { name: `Reveal latency · ${latency.seconds.length} draws` }),
    ).toBeInTheDocument();
  });

  it("quotes the median as one figure, wherever it appears", () => {
    renderAt("/");

    const latency = measured.performance?.totals.revealLatency;
    if (latency == null) throw new Error("The captured court has revealed draws");
    const median = formatLatencySeconds(latency.median);

    // The tile, the median line on the strip and the summary are three readings of one
    // number — read from the model here too, because a literal would only pin the fixture.
    expect(screen.getAllByText(median).length).toBeGreaterThan(1);
    expect(screen.getByText(`${median} median`)).toBeInTheDocument();
  });

  it("calls the comparison band illustrative on the page, not only in the source", () => {
    // It is said once, in the provenance footer. The strip carried a caption saying it a
    // second time and no longer does — but the claim itself must stay *on the page* rather
    // than only in the source, because `CLAUDE.md` requires a caveat to be visible in the UI
    // and this is the one figure on this view that never came from a read. So this test kept
    // its name and changed where it looks.
    renderAt("/");

    const footer = screen.getByRole("contentinfo");

    expect(
      within(footer).getByText(/the comparison band on the latency strip is illustrative/i),
    ).toBeInTheDocument();
    expect(within(footer).getByText(/measures no court/i)).toBeInTheDocument();
    // And not beside the strip, where it used to be.
    expect(screen.queryByText(/each mark is one draw/i)).not.toBeInTheDocument();
  });

  it("names no band on a load where the strip is a sentence rather than a plot", () => {
    // The other direction, and the gate this caveat was missing for a day. `LatencyStrip` draws
    // its "no distribution to plot" card wherever nothing has revealed — a cold load, or a
    // subgraph that is down — and a footer naming a band there sends a reader looking for one on
    // the very page where nothing above came from a read at all. `!narrow` answers a question
    // about the viewport, not about whether the thing being named is on the screen.
    renderAt("/", { performance: unmeasured });

    expect(screen.getByText(/no draw has revealed in what was read/i)).toBeVisible();
    expect(screen.queryByText(/comparison band on the latency strip/i)).not.toBeInTheDocument();
  });

  it("says what the band's boundary is, in the scale's own words rather than transcribed", () => {
    // Ticket 22 moved the boundary from an hour to five days, and the sentence has to carry the
    // number rather than the adjective it used to: "hours to days" was true of nothing and was
    // wrong by about two orders of magnitude. Read from `strip.ts` so that ticket 23, which may
    // measure this, moves the caveat with the band instead of leaving the footer behind.
    renderAt("/");

    const footer = screen.getByRole("contentinfo");
    const caveat = within(footer).getByText(
      /the comparison band on the latency strip is illustrative/i,
    );

    expect(caveat).toHaveTextContent(ORDINARY_COURT_PROSE);
    // Single-round, because court 34 is single-round throughout and the comparison is only
    // like-for-like if the reader knows it — and an appeal makes an ordinary court longer still.
    expect(caveat).toHaveTextContent(/at minimum/i);
    expect(caveat).toHaveTextContent(/single-round/i);
    expect(caveat).toHaveTextContent(/appeal/i);
  });

  it("says it has nothing rather than showing zeros, when nothing was measured", () => {
    renderAt("/", { performance: unmeasured });

    expect(screen.getByText(/nothing has been measured on this load/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /reveal latency ·/i })).not.toBeInTheDocument();
    // A `0` here would be a claim about the court that nobody measured.
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});

describe("the matrix view's footer", () => {
  it("names the range read and when it was read, without claiming it is the whole record", () => {
    renderAt("/");

    expect(screen.getByText(/16 disputes, 151 to 166/)).toBeInTheDocument();
    expect(screen.getByText(/2026-08-25 05:12 UTC/)).toBeInTheDocument();
    expect(screen.getByText(/never a claim that it is the whole record/i)).toBeInTheDocument();
  });

  it("says how agent jurors are identified, on a view that shows them", () => {
    renderAt("/");

    expect(screen.getByText(/never by the person or team who built them/i)).toBeInTheDocument();
  });

  it("names what on the page did not come from a read", () => {
    renderAt("/");

    expect(
      screen.getByText(/the only thing above that did not come from a read/i),
    ).toBeInTheDocument();
  });

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
    expect(screen.getByText(/the draws could not be re-read on this load/i)).toBeInTheDocument();
    expect(screen.getByText(/this matrix may be incomplete or out of date/i)).toBeInTheDocument();
  });

  it("says a stale court once, not twice, when the dispute read is the half that failed", () => {
    // `performance.error` chains the dispute error, so a naive pair of conditions would print
    // both sentences for one failure.
    renderAt("/", {
      disputes: { ...disputes, error: new Error("Core subgraph returned HTTP 503") },
      performance: { ...measured, error: new Error("Core subgraph returned HTTP 503") },
    });

    expect(screen.getByText(/the court could not be re-read on this load/i)).toBeInTheDocument();
    expect(screen.queryByText(/the draws could not be re-read/i)).not.toBeInTheDocument();
  });

  it("does not become a third place a failed read is announced", () => {
    renderAt("/", { performance: unmeasured });

    // Ticket 13 fixes the announcement at two: where the figure would have been, and once in
    // a banner. The footer states provenance — here, that the disputes below were read even
    // though nothing was measured from them.
    expect(screen.getAllByText(/could not be built/i)).toHaveLength(1);
    expect(screen.getByText(/16 disputes, 151 to 166/)).toBeInTheDocument();
  });

  /**
   * What tickets 07 and 15 only connect once they are on the same branch.
   *
   * Ticket 15 wrote this footer against a page that measured two things and said outright that
   * commit latency had not been read at all; ticket 07 read it. Neither branch could render the
   * other's half, so on both of them these three states looked identical and correct.
   */
  it("names commit latency as measured once the commitments are in", () => {
    renderAt("/");

    expect(
      screen.getByText(/commit latency, reveal latency and coherence are the measured record/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/commit latency, per-agent-juror summaries/i),
    ).not.toBeInTheDocument();
  });

  it("does not claim a third measure while the commitments are still being read", () => {
    // The commit read is a separate query the matrix does not wait on, so this is every cold
    // load — not an error, and it must not be worded as one. The footer would otherwise name a
    // measured record the reader is looking at a column of dashes for.
    renderAt("/", { performance: arbitrumPending });

    expect(
      screen.getByText(/reveal latency and coherence are the measured record/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/commit latency, reveal latency and coherence/i),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/the commitments are still being read/i)).toBeInTheDocument();
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

  it("links the window footnote at the section that answers it", () => {
    renderAt("/");

    expect(
      screen.getByRole("link", { name: /what that means for these figures/i }),
    ).toHaveAttribute("href", "/method#window");
  });

  describe("the court's period durations", () => {
    it("discloses the window change in the footer as well as on the row", () => {
      // The tiles and the latency strip are court-wide and have no row to carry a marker on,
      // so the footer is where a figure that counts dispute 151 admits what it counted.
      renderAt("/");

      expect(
        screen.getByText(
          /Dispute 151 ran under a commit window of 8h and a vote window of 8h, which the court has since changed/i,
        ),
      ).toBeInTheDocument();
    });

    it("puts the marker on the aggregate figure, not only on the row it came from", () => {
      // `canvas/Errors.dc.html:200-208`: a dagger on the number, the reason one line below it,
      // the full account one click away. The median reveal pools draws measured against two
      // different vote windows, so it is the one tile of the four that takes one.
      renderAt("/");

      // Above the matrix specifically. The matrix's own column headers carry the same sentence
      // over each column's draws since ticket 06, and this is the court-wide one — pooled over
      // every reveal in the read, which is what makes it the tile's figure and not a column's.
      // On the mark rather than under the figure: four tiles stand in a row and only this one is
      // ever marked, so a paragraph beneath it left the row without a common baseline and put
      // prose above the first figure anyone came for.
      const mark = screen.getByRole("link", { name: /the court's median reveal is marked/i });

      expect(mark).toHaveAccessibleName(/2 of \d+ draws ran under a vote window of 8h/i);
      expect(mark).toHaveAttribute("href", "/method#window");
    });

    it("leaves the counting tiles unmarked, because a window changes no count", () => {
      renderAt("/");

      // One dagger above the matrix and no more: a window changes what a duration means and
      // changes nothing about how many disputes or draws there were.
      expect(
        screen.getAllByRole("link", { name: /the court's median reveal is marked/i }),
      ).toHaveLength(1);
      expect(screen.queryByRole("link", { name: /disputes read is marked/i })).toBeNull();
    });

    it("marks no figure at all while the history is unread", () => {
      renderAt("/", { performance: arbitrumPending });

      expect(screen.queryByText(/ran under a vote window/i)).not.toBeInTheDocument();
    });

    it("no longer claims the period durations are unread, now that they are read", () => {
      renderAt("/");

      expect(
        screen.queryByText(/historical period durations have not been read/i),
      ).not.toBeInTheDocument();
    });

    it("says the history is still being read while it is still being read", () => {
      renderAt("/", { performance: arbitrumPending });

      expect(
        screen.getByText(/the court's period durations are still being read/i),
      ).toBeInTheDocument();
      expect(screen.queryByText(/period durations could not be read/i)).not.toBeInTheDocument();
    });

    it("says the read failed once it has failed, rather than that it is still going", () => {
      // The trap `CLAUDE.md` records against `RosterView`, in its second home: `read` is false
      // in both states, and a caveat that announces "still being read" about a read that gave
      // up minutes ago is a caveat a reader learns to ignore.
      //
      // Merging tickets 08 and 13 split the two halves rather than keeping both here. A read
      // still in flight is provenance for what is on screen and stays in the footer; a read
      // that failed is a failure and belongs to the banner. What has to keep holding either
      // way is that the page never says the first about the second — so the footer goes quiet
      // rather than going wrong, and the banner names the endpoint.
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
      // occupied, the footer's own sentence is suppressed the moment there is an error to
      // suppress it, and both column slots fall back to the same pending dash a never-drawn
      // column shows. "A read that fails is said exactly twice" came out as zero.
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
      // And the standing "summed over N draws" sentence goes quiet: a short read has no
      // business saying what it covers.
      expect(screen.queryByText(/summed over the .* draws the court has executed/i)).toBeNull();
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

    it("discloses a payout this page cannot express rather than letting it read as less", () => {
      // Dead today — court 34 has a WETH fee token registered and has never paid in it — and
      // written because a green suite here proves the healthy path and nothing else. An agent
      // juror paid in a fee token has earned something no ETH figure carries, and reading as
      // though it earned less is the failure a public page cannot afford.
      renderAt("/", { performance: rewardsInFeeToken });

      expect(
        screen.getByText(/2 draws were paid in a fee token rather than in ETH/i),
      ).toBeInTheDocument();
    });

    it("says the payouts are still being read only while they are", () => {
      // The two states again, and the fourth read to need them kept apart. `rewards.read` is
      // false while the subgraph is being asked *and* after it refused, so the footer's
      // "still being read" has to go quiet once there is an error — the banner owns the
      // failure, and one outage said twice is one voice too many.
      renderAt("/", { performance: rewardsPending });
      expect(screen.getByText(/payouts are still being read/i)).toBeInTheDocument();

      cleanup();

      renderAt("/", { performance: rewardsFailed });
      expect(screen.queryByText(/payouts are still being read/i)).not.toBeInTheDocument();
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

    it("calls a parameter read that came back empty a short read, not an unstarted one", () => {
      // The third state, and the one keying on `read` alone would silently swallow: the scan
      // happened and returned no configuration for a court that has certainly had two.
      const { performance } = arbitrumPending;
      if (performance === null) throw new Error("no model to build the empty read from");

      renderAt("/", {
        performance: {
          ...arbitrumPending,
          performance: {
            ...performance,
            parameters: { read: true, regimes: [], current: null },
          },
        },
      });

      expect(
        screen.getByText(/Arbitrum returned no parameter history for court 34/i),
      ).toBeInTheDocument();
    });

    it("tells the same two states apart for the commitments", () => {
      // The same defect, pre-dating this ticket by one: the commit caveat was worded for a
      // read in flight and shown for a read that had failed.
      const { unmount } = renderAt("/", { performance: arbitrumPending });
      expect(screen.getByText(/the commitments are still being read/i)).toBeInTheDocument();
      unmount();

      renderAt("/", { performance: arbitrumFailed });
      expect(screen.getByText(/the commitments could not be read/i)).toBeInTheDocument();
      expect(screen.queryByText(/commitments are still being read/i)).not.toBeInTheDocument();
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
      screen.getByRole("heading", { name: /reveal latency · .* · partial/i }),
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

  it("leaves the provenance footer out of it, so one failure has one voice", () => {
    // Ticket 15's rule, which this ticket had to be careful not to break: the footer states what
    // the figures rest on, the banner states what is missing from them, and a reader who meets
    // the same sentence twice stops reading either.
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

  it("carries the sparsity note once, at the head of the cards rather than in the footer", () => {
    // Ticket 16 put it there deliberately: it prevents a misreading rather than answering a
    // question, and a reader who does not know they have been misled never scrolls to the foot
    // of the page to find out. So the footer slot the desktop uses is gated on `!narrow`, and
    // the count is what proves the two did not both fire.
    stubViewportWidth(PHONE_WIDTH);
    renderAt("/");

    expect(screen.getAllByText(/sparsity is the normal state of this record/i)).toHaveLength(1);
    expect(
      within(screen.getByRole("contentinfo")).queryByText(/sparsity is the normal state/i),
    ).not.toBeInTheDocument();
    // The phone's noun, which is the one thing the two renderings differ in.
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

    // The deck goes; its read-only clause survives in the nav's own label, which is why that
    // label is not what gives way for width.
    expect(screen.queryByText(/it never votes, stakes, or holds a key/i)).not.toBeInTheDocument();
    expect(screen.getByText(/^Read only$/i)).toBeInTheDocument();

    // The strip goes; its headline figure is the median reveal, which the tiles now lead with,
    // and its comparison band was illustrative by its own caption.
    expect(screen.queryByText(/median reveal, fastest and slowest/i)).not.toBeInTheDocument();

    // `getAllByText`: the same duration is also one card's slot figure, which is the point —
    // the figure did not leave the page with the strip, it moved into the tile that leads it.
    const median = formatLatencySeconds(measured.performance?.totals.revealLatency?.median ?? 0);
    expect(screen.getAllByText(median).length).toBeGreaterThan(0);
    expect(screen.getByText(/^Median reveal/)).toBeInTheDocument();
  });

  it("shows three tiles, with the median reveal leading and the drawn count gone", () => {
    stubViewportWidth(PHONE_WIDTH);
    renderAt("/");

    const labels = screen
      .getAllByText(/^(Disputes read|Draws.*|Agent jurors drawn|Median reveal.*)$/)
      .map((node) => node.textContent);

    // `Mobile.dc.html:47-51`: median reveal, draws, disputes. The roster's drawn count is a fact
    // about the roster rather than about the record, and `/agent-jurors` carries it in more
    // detail than a tile can.
    expect(labels).toHaveLength(3);
    expect(labels[0]).toMatch(/^Median reveal/);
    expect(labels[1]).toBe("Draws");
    expect(labels[2]).toBe("Disputes read");
  });

  it("keeps the eyebrow's court number and chain and drops the court's name", () => {
    stubViewportWidth(PHONE_WIDTH);
    renderAt("/");

    // The number and the chain locate the data; the name is the one segment a reader can lose
    // without losing the scope.
    const eyebrow = screen.getByText(/^Court 34/);
    expect(eyebrow).toHaveTextContent("Arbitrum One");
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

  it("does not tell a phone reader about a latency strip that is not on the page", () => {
    stubViewportWidth(PHONE_WIDTH);
    renderAt("/");

    // The footer states what the figures above it rest on, and a provenance note about something
    // the reader cannot see sends them looking for it, on a page that may be cited. The band is
    // the only one of these the fold drops that was never a read; merging ticket 10 added three
    // more that were, and the test below covers those.
    expect(screen.queryByText(/comparison band on the latency strip/i)).not.toBeInTheDocument();
  });

  it("states no payout provenance on a layout that shows no payout figure", () => {
    stubViewportWidth(PHONE_WIDTH);
    renderAt("/");

    // Merging tickets 10 and 16 created this and neither branch could have caught it. Ticket 10
    // put cumulative ETH and net PNK in the matrix's column headers and gave the footer three
    // sentences about them; ticket 16 drops the column headers whole. All three then described
    // figures a phone reader cannot see — one of them promising a figure that is coming, when on
    // this layout none is.
    expect(
      screen.queryByText(/summed over the .* draws the court has executed/i),
    ).not.toBeInTheDocument();
  });

  it("promises a phone reader no payout figure while the payouts are being read", () => {
    stubViewportWidth(PHONE_WIDTH);
    renderAt("/", { performance: rewardsPending });

    // "…is shown yet" promises a figure that is coming. On a phone none is coming, because this
    // layout has nowhere to put one — so the promise is the misleading half rather than the wait.
    // The pending fixture is what makes this assertion load-bearing: with the default court the
    // sentence is absent for the ordinary reason that the payouts were read.
    expect(screen.queryByText(/payouts are still being read/i)).not.toBeInTheDocument();
  });

  it("still states payout provenance above the breakpoint", () => {
    // The other direction, so the gate above cannot silently swallow the desktop's own sentence.
    stubViewportWidth(1280);
    renderAt("/");

    expect(
      screen.getByText(/summed over the 44 draws the court has executed and paid out/i),
    ).toBeInTheDocument();
  });

  it("does not tell a phone reader that a fee-token payout is missing from a figure it lacks", () => {
    stubViewportWidth(PHONE_WIDTH);
    renderAt("/", { performance: rewardsInFeeToken });

    // The sentence says "the ETH shown for those agent jurors", and on a phone none is shown.
    // Dead today either way — court 34 has never paid in its registered WETH — which is exactly
    // why it is written rather than left for the day it is not.
    expect(screen.queryByText(/paid in a fee token rather than in ETH/i)).not.toBeInTheDocument();
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
 * What the page says once the court has outgrown the comfortable density.
 *
 * The same rule ticket 16 met one width down, and the reason it is tested here rather than only
 * in `Matrix.test.tsx`: past forty disputes the column header keeps three of its six figures, and
 * every sentence on this page that names one of the other three is then describing a figure the
 * reader cannot see. Both directions, because a caveat that is absent for the wrong reason tests
 * nothing — every case here renders the same court one dispute short of the threshold as well.
 */
describe("the matrix view past the density threshold", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  /**
   * The one thing the compact branch can say about the two figures it drops: where they are.
   *
   * A merge-created sentence, and the reason it exists is that neither branch could write it.
   * Ticket 17 dropped the reward figures from the compact header and could only say they were
   * gone; ticket 11 built the view that prints them at every width and pointed the *phone* at
   * it. Merged, the compact density is the phone's case a second time and takes the same
   * answer — otherwise a reader past forty disputes is told a figure vanished and not that it
   * moved.
   */

  it("states no payout provenance on a density that shows no payout figure", () => {
    renderAt("/", { performance: denseCourt });

    expect(
      screen.queryByText(/summed over the .* draws the court has executed/i),
    ).not.toBeInTheDocument();
  });

  it("still states payout provenance below the threshold", () => {
    // The other direction. Without this the gate above would pass just as well if the sentence
    // had been deleted outright.
    renderAt("/", { performance: roomyCourt });

    expect(
      screen.getByText(/summed over the 44 draws the court has executed and paid out/i),
    ).toBeInTheDocument();
  });

  it("promises no payout figure while the payouts are being read", () => {
    renderAt("/", { performance: denseUnpaidCourt });

    // "…is shown yet" promises a figure that is coming, and at this density none is coming: the
    // header has no row for it. The same sentence, the same reason, one width up from the phone.
    expect(screen.queryByText(/payouts are still being read/i)).not.toBeInTheDocument();
  });

  it("goes on saying everything that is not about a dropped figure", () => {
    // The gates are per figure and not per density: a caveat about the window change, the lone
    // panel or the ENS read is as true at one density as at the other, and losing one of those
    // to this reduction would be the reduction eating a caveat.
    renderAt("/", { performance: denseCourt });

    // The footnote beside the grid says the same fact in its own words, so both are on the page:
    // what this is about is that the *footer* still carries them.
    expect(screen.getAllByText(/decided by a panel of one/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/ran under a commit window of/i)).toBeInTheDocument();
    expect(screen.getByText(/comparison band on the latency strip/i)).toBeInTheDocument();
  });
});
