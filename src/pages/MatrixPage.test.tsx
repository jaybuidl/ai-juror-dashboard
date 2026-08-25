import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { formatLatencySeconds } from "../performance/latency";
import { formatAgo } from "../read-failure";
import { ROSTER } from "../roster/agent-jurors";
import {
  commitsPending,
  disputes,
  disputesWithNewcomer,
  measured,
  pausedDisputes,
  pausedPerformance,
  READ_AT,
  refused,
  renderAt,
  resolvingRoster,
  staleDraws,
  unmeasured,
  unresolvedRoster,
} from "../test/court";

/**
 * The landing view: the hero, the totals, the strip and the matrix.
 *
 * Most of this suite came from `Dashboard.test.tsx`, which ticket 15 replaced. What moved with
 * the roster to `/agent-jurors` is tested there; what is left here is what the matrix view
 * itself claims.
 */

describe("the matrix view", () => {
  it("states the finding rather than naming the product", () => {
    renderAt("/");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /agents do not wait for the deadline/i,
    );
  });

  it("says what it measures and, in the same breath, that it does nothing else", () => {
    renderAt("/");

    expect(screen.getByText(/it never votes, stakes, or holds a key/i)).toBeInTheDocument();
  });

  it("says what it has measured and, in the same breath, what it has not", () => {
    renderAt("/");

    expect(screen.getByText(/three measures, and what is missing from them/i)).toBeInTheDocument();
    expect(
      screen.getByText(/per-agent-juror summaries and rewards have not been read/i),
    ).toBeInTheDocument();
  });

  it("claims no measurement it has not made", () => {
    // The page holds three figures, so the old blanket caveat would be false. What has to
    // survive is the half that still is true: everything it has not read, said outright.
    renderAt("/");

    expect(screen.queryByText(/nothing measured yet/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/no figure here is a fraction of a period's window/i),
    ).toBeInTheDocument();
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
    renderAt("/");

    expect(screen.getByText(/the comparison band is illustrative/i)).toBeInTheDocument();
    expect(screen.getByText(/it measures no court/i)).toBeInTheDocument();
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
    renderAt("/", { performance: commitsPending });

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
    for (const performance of [measured, commitsPending]) {
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

    expect(within(banner).getByText("arb1.arbitrum.io")).toBeInTheDocument();
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
      performance: { ...commitsPending, commitError: new Error("UnknownRpcError") },
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
