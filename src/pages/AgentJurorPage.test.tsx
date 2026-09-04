import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ORDINARY_COURT_PROSE, STRIP_RANGE_LABEL } from "../performance/strip";
import type { CourtPerformanceView } from "../performance/useCourtPerformance";
import { ROSTER } from "../roster/agent-jurors";
import { rosterIdentity } from "../roster/ens";
import type { RosterView } from "../roster/useRoster";
import {
  disputes,
  measured,
  renderAt,
  resolvedRoster,
  resolvingRoster,
  rewardsFailed,
  rewardsPending,
  rewardsShort,
  unmeasured,
  unresolvedRoster,
  waitingCourt,
} from "../test/court";
import { PHONE_WIDTH, stubViewportWidth } from "../test/viewport";

/**
 * One agent juror on its own.
 *
 * Three agent jurors in the captured court carry the states worth testing and each is used for
 * the one it carries: `columbo` is the only column with both markers on it — a † on each median
 * from dispute 151's superseded windows and a ‡ on its coherence from dispute 155's panel of one
 * — `blaise` has a description and no marker at all, and `baskerville` has never been drawn,
 * which is the whole of `canvas/JurorEmpty.dc.html`.
 */

/** ENS answering with a display name that is not the roster's, which is `blaise` in real life. */
const renamedRoster: RosterView = {
  entries: ROSTER.map((agentJuror) => ({
    agentJuror,
    identity: {
      ...rosterIdentity(agentJuror),
      nickname: agentJuror.nickname === "blaise" ? "Blaise" : agentJuror.nickname,
      resolvedFromEns: true,
    },
  })),
  isResolving: false,
  isResolvedFromEns: true,
};

describe("one agent juror's own view", () => {
  it("resolves an agent juror's own URL to that agent juror, and not to the 404", () => {
    // Asserted against something only this view says. The chrome tests in `routes.test.tsx` run
    // over the same path and would pass with the 404 behind them.
    renderAt("/agent-jurors/columbo");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("columbo");
    expect(screen.queryByText(/nothing at this address/i)).not.toBeInTheDocument();
  });

  it("names the stack, the ENS name, the address and the chain it votes on", () => {
    renderAt("/agent-jurors/columbo");

    expect(screen.getByText("claude -p")).toBeInTheDocument();
    expect(screen.getByText("columbo.agents.kleroslabs.eth")).toBeInTheDocument();
    // Truncated on the page and whole in the link, which is the only place it has to be exact.
    expect(screen.getByText("0x7023…bF4C")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /arbiscan/i })).toHaveAttribute(
      "href",
      // By nickname and not by index. This read ROSTER[3] while the page above it is rendered at
      // /agent-jurors/columbo — a named lookup and a positional one pointing at one agent juror,
      // which held only while columbo happened to be fourth. It stopped being fourth, and this
      // was the assertion that said so.
      `https://arbiscan.io/address/${ROSTER.find((a) => a.nickname === "columbo")?.address}`,
    );
  });

  it("carries the one-line description where the roster has one", () => {
    renderAt("/agent-jurors/columbo");

    expect(
      screen.getByText("No agent framework: the Claude Code CLI driven directly."),
    ).toBeInTheDocument();
  });

  it("keys the breadcrumb on the roster nickname and not on the one ENS resolves", () => {
    // `blaise` carries a `name` text record reading "Blaise". The heading shows what ENS said —
    // the matrix's column header does the same — and the trail names what the route is keyed on,
    // because a URL built from a display name is a URL an operator can change from a wallet.
    renderAt("/agent-jurors/blaise", { roster: renamedRoster });

    const trail = screen.getByRole("navigation", { name: /breadcrumb/i });
    expect(within(trail).getByText("blaise")).toBeInTheDocument();
    expect(within(trail).getByRole("link", { name: "Agent jurors" })).toHaveAttribute(
      "href",
      "/agent-jurors",
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Blaise");
  });

  it("summarises the six figures the matrix's column header prints, at length", () => {
    renderAt("/agent-jurors/columbo");
    const card = screen.getByRole("region", { name: /what columbo has done/i });

    // The same six values `Marginals` prints in 148px, read by the same module — three medians
    // and a count, then the draw count and the two sums the court has paid.
    expect(within(card).getByText("117s")).toBeInTheDocument();
    expect(within(card).getByText("8m 52s")).toBeInTheDocument();
    expect(within(card).getByText("9/9")).toBeInTheDocument();
    expect(within(card).getByText("12 · 15v")).toBeInTheDocument();
    expect(within(card).getByText("0.0035")).toBeInTheDocument();
    expect(within(card).getByText("+171.42")).toBeInTheDocument();
  });

  it("puts the vote count beside the draw count, because one draw may hold several", () => {
    renderAt("/agent-jurors/columbo");

    // 61 votes were 44 draws across the first thirteen disputes: the fee is paid per vote ID and
    // the unit here is the draw, so a page printing one of them alone is missing the other.
    expect(screen.getByText("12 · 15v")).toBeInTheDocument();
    expect(screen.getByText(/^Draws · votes$/)).toBeInTheDocument();
  });

  it("carries the sign of a net PNK loss in the value itself, not only in its colour", () => {
    renderAt("/agent-jurors/007");

    // ADR-0006: two of the five drawn agent jurors are net down, so a losing figure is the
    // ordinary case. Amber is the second signal and the character is the first.
    expect(screen.getByText("-93.50")).toBeInTheDocument();
  });

  it("marks each median with the window that governs it, and says how many draws", () => {
    renderAt("/agent-jurors/columbo");
    const card = screen.getByRole("region", { name: /what columbo has done/i });

    expect(
      within(card).getByRole("link", { name: /why columbo's median reveal is marked/i }),
    ).toHaveAttribute("href", "/method#window");
    expect(
      within(card).getByRole("link", { name: /why columbo's median commit is marked/i }),
    ).toBeInTheDocument();
    // The marker's own line quotes the denominator the figure was taken over.
    expect(within(card).getByText(/1 of 12 draws ran under a vote window of 8h/)).toBeVisible();
    expect(within(card).getByText(/1 of 12 draws ran under a commit window of 8h/)).toBeVisible();
  });

  it("says on the aggregate coherence figure that a panel of one is behind it", () => {
    renderAt("/agent-jurors/columbo");
    const card = screen.getByRole("region", { name: /what columbo has done/i });

    // A count that includes a tautological draw must not read as if it did not.
    expect(
      within(card).getByRole("link", { name: /why columbo's coherence count is marked/i }),
    ).toHaveAttribute("href", "/method#caveats");
    expect(
      within(card).getByText(/1 of 9 draws sat on a panel of one, where coherence is tautological/),
    ).toBeVisible();
  });

  it("says the opposite in as many words where no panel of one is behind the count", () => {
    renderAt("/agent-jurors/blaise");

    // The artboard's own sentence, and a claim — so it is made only where it is true. Where a
    // lone panel *is* behind the figure the ‡ line above says so, and this stays silent rather
    // than becoming a second voice for one caveat.
    expect(
      screen.getByText(/every panel blaise sat on held two or more agent jurors/i),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: /why blaise's coherence count is marked/i }),
    ).not.toBeInTheDocument();
  });
});

describe("the latency profile", () => {
  it("plots this agent juror's reveals against the whole court's", () => {
    renderAt("/agent-jurors/columbo");
    const plot = screen.getByRole("region", { name: /12 reveals against the whole court/i });

    // The plot is decoration over figures printed in full: this is the reading beside it, which
    // is what a reader who cannot see the marks is given instead of a description of a picture.
    expect(
      within(plot).getByText(/its median is 117s against a court median of 68s across 56 reveals/i),
    ).toBeVisible();
  });

  it("excludes commit latency and does not give the artboard's false reason for it", () => {
    renderAt("/agent-jurors/columbo");
    const plot = screen.getByRole("region", { name: /reveals against the whole court/i });

    // ADR-0005: excluded rather than normalised into the comparison. The reason is that the two
    // are measured from different periods — and emphatically NOT "the window change touches
    // commit alone", which `Juror.dc.html:108` gives and which is false: court 34 moved its vote
    // window from 8h to 30m in the same `CourtModified` that moved commit from 8h to 45m.
    expect(within(plot).getByText(/commit latency is not plotted here/i)).toBeVisible();
    expect(
      within(plot).getByText(/measured from the commit period rather than the vote period/i),
    ).toBeVisible();
    expect(within(plot).queryByText(/not comparable across dispute 151/i)).not.toBeInTheDocument();
  });

  it("marks the plot where the vote window behind some of its marks has since changed", () => {
    renderAt("/agent-jurors/columbo");
    const plot = screen.getByRole("region", { name: /reveals against the whole court/i });

    expect(
      within(plot).getByText(/1 of the 12 reveals plotted here ran under a vote window of 8h/i),
    ).toBeVisible();
  });

  it("leaves the plot unmarked for a column never drawn under the earlier windows", () => {
    renderAt("/agent-jurors/blaise");
    const plot = screen.getByRole("region", { name: /reveals against the whole court/i });

    // The marker is a claim about the draws behind *this* figure. blaise was never drawn in
    // dispute 151, so the court's own change says nothing about its median.
    expect(within(plot).queryByText(/ran under a vote window/i)).not.toBeInTheDocument();
  });

  it("names the axis's real range rather than a range it used to have", () => {
    // This is the sentence ticket 22 was written around: the plot printed "1s to 1d" as a
    // literal, so widening the shared axis to hold a five-day band would have left one line of
    // text contradicting the picture immediately beneath it. Pinned against the scale rather
    // than against the words, which is the only version of this test that cannot rot the same
    // way — `Juror.dc.html:89` still says "1s to 1h" and has been superseded since ticket 11.
    renderAt("/agent-jurors/columbo");
    const plot = screen.getByRole("region", { name: /reveals against the whole court/i });

    expect(within(plot).getByText(`Log scale · ${STRIP_RANGE_LABEL}`)).toBeVisible();
  });

  it("says the comparison band on it is illustrative, on the page and not only in the source", () => {
    // The band is on this plot as well as the matrix's, deliberately — the two share one axis
    // and the court's own distribution is drawn on both, so a scale of this page's own would
    // draw one set of numbers two shapes. What comes with it is the disclosure, said in this
    // page's own footer exactly as the matrix view says it in its own.
    renderAt("/agent-jurors/columbo");

    const footer = screen.getByRole("contentinfo");
    const caveat = within(footer).getByText(
      /the comparison band on the latency plot is illustrative/i,
    );

    expect(caveat).toHaveTextContent(/measures no court/i);
    expect(caveat).toHaveTextContent(ORDINARY_COURT_PROSE);
    expect(caveat).toHaveTextContent(/at minimum/i);
    expect(caveat).toHaveTextContent(/single-round/i);
    expect(caveat).toHaveTextContent(/appeal/i);
  });

  it("does not name a band on a page whose plot is a sentence instead of a picture", () => {
    // The other direction, and the one this repo keeps relearning: a caveat is gated on the
    // figure being on the reader's screen, not on the reader having got this far. An agent
    // juror drawn but with nothing revealed yet gets `AgentJurorLatency`'s empty state — words
    // where the plot would be — and a footer naming a band there sends a reader looking for one
    // that was never drawn.
    const built = measured.performance;
    if (built === null) throw new Error("no fixture");
    const unrevealed: CourtPerformanceView = {
      ...measured,
      performance: {
        ...built,
        marginals: built.marginals.map((marginals) => ({ ...marginals, revealLatency: null })),
      },
    };

    renderAt("/agent-jurors/columbo", { performance: unrevealed });

    expect(screen.getByText(/no draw of this agent juror's has revealed/i)).toBeVisible();
    expect(screen.queryByText(/comparison band on the latency plot/i)).not.toBeInTheDocument();
  });

  it("names no band on a page with no plot at all", () => {
    // baskerville has never been drawn, so there is no plot and nothing to disclose about one.
    renderAt("/agent-jurors/baskerville");

    expect(screen.queryByText(/comparison band/i)).not.toBeInTheDocument();
  });
});

describe("the disputes it was drawn in", () => {
  it("lists them newest first, each linking to that dispute's own view", () => {
    renderAt("/agent-jurors/columbo");
    const table = screen.getByRole("table");
    const ids = within(table)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
      .filter((href) => href?.startsWith("/disputes/"));

    expect(ids.slice(0, 3)).toEqual(["/disputes/166", "/disputes/165", "/disputes/164"]);
    expect(ids).toHaveLength(12);
  });

  it("carries the legend that decodes the state words in the list", () => {
    // Ticket 16's rule: any view that shows a draw's state owes its reader the legend, and it is
    // the shared one so the two layouts cannot teach two vocabularies. `Unknown` is absent
    // because it cannot occur here — an unread row has no cell for anybody, so it contributes no
    // line at all — and naming a state the record does not contain teaches a reader to look for
    // a failure that is not there.
    renderAt("/agent-jurors/columbo");

    for (const word of ["Coherent", "Diverged", "No vote", "Acting", "Not drawn"]) {
      expect(screen.getAllByText(word).length, word).toBeGreaterThan(0);
    }
    expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
  });

  it("gives every coherence mark its panel size without naming a position", () => {
    renderAt("/agent-jurors/columbo");

    // "Beside" would be a claim about which layout the reader is looking at: in the table the
    // panel is the third column and the coherence the seventh, and on a card the state sits
    // above the figures rather than next to one.
    expect(
      screen.getByText(/every coherence mark here is given with the panel size/i),
    ).toBeVisible();
    expect(screen.queryByText(/panel size sits beside/i)).not.toBeInTheDocument();
  });

  it("carries a panel column beside the coherence column", () => {
    renderAt("/agent-jurors/columbo");
    const table = screen.getByRole("table");

    // The standing requirement: coherence in a panel of one is tautological, so no coherence
    // mark on this page appears without the panel size of the dispute it came from.
    expect(within(table).getByRole("columnheader", { name: "Panel" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Coherence" })).toBeInTheDocument();
  });

  it("marks the coherence of the draw that sat on a panel of one", () => {
    renderAt("/agent-jurors/columbo");

    expect(
      screen.getByRole("link", { name: /why columbo's draw in dispute 155 is marked/i }),
    ).toHaveAttribute("href", "/method#caveats");
  });

  it("counts what it lists, so the heading cannot outrun the record", () => {
    renderAt("/agent-jurors/columbo");

    expect(screen.getByRole("heading", { name: "Drawn in 12 disputes." })).toBeInTheDocument();
  });

  it("reads each latency with the same functions the matrix reads its cells with", () => {
    renderAt("/agent-jurors/columbo");
    const table = screen.getByRole("table");

    // One row of the fixture, spot-checked end to end: a duration in each latency column and a
    // state word from `presentationOf`. What is being pinned is that this view reads the draw
    // rather than deriving a second account of it.
    const row = within(table).getByRole("row", { name: /^155 / });
    expect(within(row).getByText("1")).toBeInTheDocument();
    expect(within(row).getByText(/coherent/i)).toBeInTheDocument();
  });
});

describe("the agent juror the court has never drawn", () => {
  it("says nothing has gone wrong, and why there is nothing to measure", () => {
    renderAt("/agent-jurors/baskerville");

    expect(
      screen.getByRole("heading", { name: /never drawn\. nothing has gone wrong\./i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/kleros draws jurors at random, weighted by stake/i)).toBeVisible();
    // "the court has drawn a panel for" and not "whose draws have been read": ticket 17 split
    // the two, and the second set is larger than the first the moment a dispute is sitting in
    // its evidence period.
    expect(
      screen.getByText(/across the 16 disputes the court has drawn a panel for/i),
    ).toBeVisible();
    // The other direction of the gate below: a court whose every read dispute has a panel says
    // nothing about undrawn ones, or the caveat would be permanent furniture.
    expect(screen.queryByText(/no panel yet/i)).not.toBeInTheDocument();
  });

  /**
   * The claim above is over disputes the court has actually drawn for, and it has to be.
   *
   * Ticket 17 held the undrawn rows out of `Sparsity.emptyColumns` because a dispute with no
   * panel has no draw in *any* column — so counting it reports an agent juror as passed over on
   * the strength of a selection that has not happened. This page states that same figure in
   * words, on the one view whose entire subject is a column being empty, and the two branches
   * were written on different branches: ticket 11 wrote the sentence and ticket 17 split the
   * two kinds of blank underneath it.
   */
  it("does not count a dispute with no panel as one it was passed over in", () => {
    renderAt("/agent-jurors/baskerville", { performance: waitingCourt });

    // 17 read, one of them still in its evidence period: the claim is over the other 16.
    expect(
      screen.getByText(/across the 16 disputes the court has drawn a panel for/i),
    ).toBeVisible();
    expect(screen.queryByText(/across the 17 disputes/i)).not.toBeInTheDocument();
  });

  it("names the dispute it is not claiming anything about, rather than describing it", () => {
    renderAt("/agent-jurors/baskerville", { performance: waitingCourt });

    // By id, for the reason the sparsity note gives them by id: "some of these are different"
    // is a caveat a reader cannot act on.
    expect(screen.getByText(/dispute 167 was read but has no panel yet/i)).toBeVisible();
    expect(screen.getByText(/the court has drawn nobody there/i)).toBeVisible();
  });

  it("never reads as a failed read, which is loud and looks nothing like this", () => {
    renderAt("/agent-jurors/baskerville");

    expect(screen.queryByText(/could not be read/i)).not.toBeInTheDocument();
    // Ticket 13's Unknown, which is the rose figure a *short* read leaves behind. The exact
    // string, because the card's own sentence contains the words "could not read" in the course
    // of saying that this is not what has happened.
    expect(screen.queryByText(/^Not read$/)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("draws every unmeasurable figure as a dash, and says what a dash means", () => {
    renderAt("/agent-jurors/baskerville");

    // Three medians and the two sums: five dashes, and not one zero among them.
    expect(screen.getAllByText("—")).toHaveLength(5);
    expect(screen.getByText(/a dash means .no draws to measure./i)).toBeVisible();
    expect(
      screen.getByText(/it never means zero, and it never means the query failed/i),
    ).toBeVisible();
  });

  it("keeps the draw and vote counts as real zeros, because zero draws is a measurement", () => {
    renderAt("/agent-jurors/baskerville");

    expect(screen.getByText("0 · 0v")).toBeInTheDocument();
  });

  it("names what will appear on its first draw", () => {
    renderAt("/agent-jurors/baskerville");
    const coming = screen.getByRole("region", { name: /what appears here on its first draw/i });

    expect(within(coming).getByText(/commit and reveal latency/i)).toBeVisible();
    expect(within(coming).getByText(/coherence, once ruled/i)).toBeVisible();
    expect(
      within(coming).getByText(/undefined until the appeal period closes and a ruling exists/i),
    ).toBeVisible();
    expect(within(coming).getByText(/its published reasoning/i)).toBeVisible();
  });

  it("is not what a roster the seam does not share renders as", () => {
    // `reading === null` over a court that *was* measured means the seam's own roster does not
    // hold this nickname — two lists of six disagreeing, not a fact about the court's random
    // selection. Drawing it as "never drawn" would state a defect in this dashboard as a
    // finding about an agent juror, which is the distinction this whole view turns on.
    const built = measured.performance;
    if (built === null) throw new Error("no fixture");
    const strangers: CourtPerformanceView = {
      ...measured,
      performance: { ...built, agentJurors: [], marginals: [] },
    };

    renderAt("/agent-jurors/baskerville", { performance: strangers });

    expect(screen.queryByText(/never drawn\. nothing has gone wrong\./i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/the court's record could not be built from what was read/i),
    ).toBeVisible();
  });

  it("plots nothing and lists nothing, rather than an empty axis and an empty table", () => {
    renderAt("/agent-jurors/baskerville");

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: /against the whole court/i }),
    ).not.toBeInTheDocument();
  });

  it("says nothing on the page is a measurement of it, and what is", () => {
    renderAt("/agent-jurors/baskerville");

    expect(
      screen.getByText(/that it has not been drawn is the measured record/i),
    ).toBeInTheDocument();
  });
});

describe("an address that names nothing", () => {
  it("says so itself rather than 404ing or reporting a failed read", () => {
    // Every path answers HTTP 200 through the SPA fallback and the route table matched this one,
    // so this is neither a wrong address nor a read that failed. The roster is local, so unlike
    // ticket 09's equivalent it is decidable with no read at all.
    renderAt("/agent-jurors/nope");

    expect(
      screen.getByRole("heading", { level: 1, name: /that is not an agent juror/i }),
    ).toBeInTheDocument();
    // Two of them: the breadcrumb's parent and the way out in the body. The nav's third is text
    // rather than a link, because `isCurrent` keeps the index marked while you are beneath it.
    expect(screen.getAllByRole("link", { name: "Agent jurors" })).toHaveLength(2);
    expect(screen.queryByText(/nothing at this address/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/could not be read/i)).not.toBeInTheDocument();
  });

  it("marks the way out as a link without relying on its colour", () => {
    // The second of this app's two hand-written prose links, and the one axe cannot speak for:
    // on this route it reports `link-in-text-block` as *incomplete* rather than as a violation,
    // unable to resolve the background behind the paragraph. So a default audit reads this page
    // as zero violations whether or not the underline is here, and the tool is not the guard —
    // this is. Ticket 28; `Matrix.test.tsx` holds the same assertion over `Footnotes.tsx`.
    renderAt("/agent-jurors/nope");

    // Scoped to the paragraph rather than taken by index: the breadcrumb carries a link of the
    // same name, and only this one sits inside a sentence. Reaching it through the prose is also
    // what makes the assertion mean "the link in the text block".
    const prose = screen.getByText(/does not name one of the six agent jurors/i);
    const inProse = within(prose).getByRole("link", { name: "Agent jurors" });
    // `text-underline-offset`, because the underline itself is not observable here: jsdom's UA
    // sheet underlines anchors and the vendored base.css that unsets it is not in this cascade,
    // so an assertion on `textDecoration` passes with the declaration deleted. See
    // `docs/knowledge/testing.md`.
    expect(getComputedStyle(inProse).textUnderlineOffset).toBe("2px");
  });

  it("raises no banner over it, whatever else failed", () => {
    // A page showing no figure cannot have lost one. Worse than merely redundant here: every
    // sentence `failuresOf` writes names the agent juror the address failed to name, so an
    // unguarded banner tells a reader of `/agent-jurors/nope` that "nothing on this page is a
    // measurement of nope's" — a statement about something that does not exist. Found by
    // review; the footer half of the same defect was found by opening the page.
    renderAt("/agent-jurors/nope", { performance: unmeasured, roster: unresolvedRoster });

    expect(screen.queryByText(/could not be read/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/is a measurement of nope/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/names are falling back to the roster/i)).not.toBeInTheDocument();
    // And the view still says its own piece, which does not depend on any read.
    expect(
      screen.getByRole("heading", { level: 1, name: /that is not an agent juror/i }),
    ).toBeInTheDocument();
  });

  it("claims nothing was measured, and does not call it an agent juror never drawn", () => {
    renderAt("/agent-jurors/nope");

    // The two empty states are not one claim. An agent juror the court has never drawn has a
    // measured record — its absence from every panel — and an address naming nobody has none.
    // Found by opening the page: this footer read "the court has drawn it in none of the
    // disputes read", which is a reading of the court about something it has never heard of.
    expect(screen.getByText(/this address does not name an agent juror/i)).toBeInTheDocument();
    expect(screen.queryByText(/the court has drawn it in none of/i)).not.toBeInTheDocument();
    // And no dispute range under a page carrying no figure from one.
    expect(screen.getByText(/nothing on this view rests on a read/i)).toBeInTheDocument();
  });
});

describe("what the page says before, and instead of, a read", () => {
  it("does not call an agent juror never drawn when the draws were never read", () => {
    // The trap in its fifth face. A column with no draws is "never drawn" only once there has
    // been a read to have come up empty — otherwise the page states the court's random selection
    // as a permanent fact about a read that never happened.
    renderAt("/agent-jurors/baskerville", { performance: unmeasured });

    expect(screen.queryByText(/never drawn\. nothing has gone wrong\./i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/the court's record could not be built from what was read/i),
    ).toBeVisible();
  });

  it("still names the agent juror, because the roster is not a read", () => {
    renderAt("/agent-jurors/baskerville", { performance: unmeasured });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("baskerville");
    expect(screen.getByText("Hermes")).toBeInTheDocument();
  });

  it("shows a dash rather than a zero for each sum while the payouts are still being read", () => {
    renderAt("/agent-jurors/columbo", { performance: rewardsPending });
    const card = screen.getByRole("region", { name: /what columbo has done/i });

    // A sum's natural degradation is `0.0000`, in the ink of a measurement. Both must be dashes
    // until the read is in — and the four figures beside them are unaffected.
    expect(within(card).getAllByText("—")).toHaveLength(2);
    expect(within(card).getByText("117s")).toBeInTheDocument();
  });

  it("reads a payout that came back short as unknown, not as a zero", () => {
    renderAt("/agent-jurors/columbo", { performance: rewardsShort });
    const card = screen.getByRole("region", { name: /what columbo has done/i });

    expect(within(card).getAllByText("Not read")).toHaveLength(2);
  });

  it("says the payouts failed once at the top, and not again in the footer", () => {
    renderAt("/agent-jurors/columbo", { performance: rewardsFailed });

    expect(
      screen.getByText(/neither the cumulative eth nor the net pnk figure is a measurement/i),
    ).toBeVisible();
    // One failed source gets one banner line, and the footer never carries the failed half.
    expect(screen.queryByText(/the court's payouts are still being read/i)).not.toBeInTheDocument();
  });
});

describe("what the footer says this view rests on", () => {
  it("states which disputes the figures were read from", () => {
    renderAt("/agent-jurors/columbo");

    // The disputes this agent juror was drawn in, and not the whole court's range: the figures
    // above are measured from its own twelve draws and from nothing else.
    expect(screen.getByText(/12 disputes, 151 to 166/i)).toBeInTheDocument();
  });

  it("states how an agent juror is identified, on a page that names one", () => {
    renderAt("/agent-jurors/columbo");

    expect(screen.getByText(/never by the person or team\s+who built them/i)).toBeInTheDocument();
  });

  it("says what the two sums are summed over, in this column's own numbers", () => {
    renderAt("/agent-jurors/columbo");

    expect(
      screen.getByText(/summed over the 9 of this agent juror's 12 draws the court has executed/i),
    ).toBeVisible();
  });

  it("carries no caveat about a latency for an agent juror that has none", () => {
    renderAt("/agent-jurors/baskerville");

    // A caveat about a median that does not exist reads as a caveat about the whole page, which
    // is exactly what this state must not look like.
    expect(screen.queryByText(/which the court has since changed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/summed over/i)).not.toBeInTheDocument();
  });

  it("says ENS fell back once it has answered for nobody, and marks the name it affects", () => {
    renderAt("/agent-jurors/columbo", { roster: unresolvedRoster });

    expect(screen.getByText(/names are falling back to the roster/i)).toBeVisible();
    // The panel says ENS is unreachable once; this says which element is the consequence, so a
    // reader looking at the heading does not have to carry the panel in their head.
    expect(screen.getByText(/^From roster$/)).toBeVisible();
  });

  it("says nothing about ENS while the lookup is still out", () => {
    // Both halves, always. `isResolvedFromEns` is false while mainnet is being asked *and* after
    // it fails, so a caveat keyed on it alone announces a failure for the length of every cold
    // load and then retracts it — and a caveat that comes and goes teaches a reader to ignore
    // caveats. A separate test rather than a second render, because the first one stays mounted.
    renderAt("/agent-jurors/columbo", { roster: resolvingRoster });

    expect(screen.queryByText(/names are falling back to the roster/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^From roster$/)).not.toBeInTheDocument();
  });

  it("shows the avatar ENS resolved where there is one", () => {
    renderAt("/agent-jurors/columbo", { roster: resolvedRoster });

    expect(document.querySelector("img")).toHaveAttribute(
      "src",
      "https://euc.li/columbo.agents.kleroslabs.eth",
    );
  });
});

/**
 * The same view below the breakpoint.
 *
 * This is where ticket 16's open question is answered. The matrix's card layout drops the column
 * headers whole, so cumulative ETH and net PNK are legible on a phone here and nowhere else —
 * which is why this view has no reduced form for the stat card, and why the reduction happens in
 * the one place seven columns genuinely cannot fit.
 */
describe("one agent juror's own view on a phone", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps every one of the six figures, including the two the matrix's phone form drops", () => {
    stubViewportWidth(PHONE_WIDTH);
    renderAt("/agent-jurors/columbo");
    const card = screen.getByRole("region", { name: /what columbo has done/i });

    expect(within(card).getByText("0.0035")).toBeInTheDocument();
    expect(within(card).getByText("+171.42")).toBeInTheDocument();
    expect(within(card).getByText("117s")).toBeInTheDocument();
    expect(within(card).getByText("9/9")).toBeInTheDocument();
  });

  it("replaces the seven-column table with one block per dispute rather than shrinking it", () => {
    stubViewportWidth(PHONE_WIDTH);
    renderAt("/agent-jurors/columbo");

    // Not rendered, not hidden: seven columns at 390pt push the page sideways, which is the one
    // thing a layout here must never do.
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    // Scoped to the section: the folded nav is a list too, and an unscoped count would pass on
    // whatever the chrome happened to render.
    const drawn = screen.getByRole("region", { name: /drawn in 12 disputes/i });
    expect(within(drawn).getAllByRole("listitem")).toHaveLength(12);
    expect(within(drawn).getByRole("link", { name: "155" })).toHaveAttribute(
      "href",
      "/disputes/155",
    );
  });

  it("keeps the table above the breakpoint", () => {
    stubViewportWidth(1280);
    renderAt("/agent-jurors/columbo");

    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("loses no figure with the table: panel, choice and both latencies stay on each block", () => {
    stubViewportWidth(PHONE_WIDTH);
    renderAt("/agent-jurors/columbo");

    const labels = screen.getAllByText(/^(Panel|Choice|Reveal|Commit)$/).map((n) => n.textContent);
    expect(new Set(labels)).toEqual(new Set(["Panel", "Choice", "Reveal", "Commit"]));
  });

  it("still says why so much of the record is the way it is", () => {
    stubViewportWidth(PHONE_WIDTH);
    renderAt("/agent-jurors/columbo");

    // Every sentence on this view names something both layouts have — there is no element here
    // that the phone drops and the desktop keeps, which is why nothing in `provenanceOf` is
    // gated on the width. This pins that the caveats survive the reduction.
    expect(
      screen.getByText(/summed over the 9 of this agent juror's 12 draws the court has executed/i),
    ).toBeVisible();
    expect(screen.getByText(/decided by a panel of one/i)).toBeVisible();
  });
});

describe("the whole court's own reads, seen from here", () => {
  it("dates the page by the read behind it, so a citing reader has a moment", () => {
    renderAt("/agent-jurors/columbo", { disputes });

    expect(screen.getByText(/2026-08-25 05:12 UTC/)).toBeInTheDocument();
  });

  it("keeps the matrix's own figures untouched: this view derives none of them", () => {
    // The court median the plot compares against is `totals.revealLatency`, computed by the seam
    // over every row — the same number the matrix's own strip plots. A second reduction here
    // would be two accounts of one court on two pages.
    renderAt("/agent-jurors/columbo", { performance: measured });

    expect(screen.getByText(/court median of 68s across 56 reveals/i)).toBeVisible();
  });
});
