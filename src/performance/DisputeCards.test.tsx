import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ThemeProvider } from "styled-components";
import { describe, expect, it } from "vitest";
import disputeFixture from "../disputes/court-34.fixture.json" with { type: "json" };
import type { DisputeRowSlots } from "../disputes/DisputeList";
import type { Dispute, RawDispute } from "../disputes/disputes";
import { ROSTER } from "../roster/agent-jurors";
import { rosterIdentity } from "../roster/ens";
import type { RosterView } from "../roster/useRoster";
import { theme } from "../styles/theme";
import { OFF_ROSTER_DISPUTE, offRosterDraw } from "../test/court";
import commitFixture from "./court-34-commits.fixture.json" with { type: "json" };
import drawFixture from "./court-34-draws.fixture.json" with { type: "json" };
import parameterFixture from "./court-34-parameters.fixture.json" with { type: "json" };
import rewardFixture from "./court-34-rewards.fixture.json" with { type: "json" };
import { DisputeCards, SLOTS_PER_LINE } from "./DisputeCards";
import { formatLatencySeconds } from "./latency";
import {
  buildCourtPerformance,
  type CourtPerformance,
  type Draw,
  type DrawState,
  type MatrixRow,
  type RawCommitCast,
  type RawCourtData,
  type RawDraw,
  type RawRewardShift,
} from "./performance";
import type { RawCourtParameters } from "./windows";

/**
 * The phone layout, checked against what makes it the *same* record rather than a smaller one.
 *
 * Every assertion here is about a property the fold had to preserve. The one that matters most
 * is positional: the nth slot is the same agent juror on every card, which is what lets one
 * agent juror be scanned down a page of cards the way a column is scanned across a grid. A
 * layout that sorted, compacted or omitted a slot would look tidier and would have thrown the
 * matrix away.
 */

const roster: RosterView = {
  entries: ROSTER.map((agentJuror) => ({ agentJuror, identity: rosterIdentity(agentJuror) })),
  isResolving: false,
  isResolvedFromEns: false,
};

function build(raw: Partial<RawCourtData> = {}): CourtPerformance {
  const result = buildCourtPerformance({
    disputes: disputeFixture as RawDispute[],
    draws: drawFixture as RawDraw[],
    commits: commitFixture as RawCommitCast[],
    parameters: parameterFixture as RawCourtParameters[],
    // The same payouts `Matrix.test.tsx` builds, though no card renders one: the two layouts are
    // twins over one court, and a phone suite running against a court whose payouts were never
    // read would differ from the desktop suite in a way nothing here explains.
    rewards: rewardFixture as RawRewardShift[],
    roster: ROSTER,
    drawsReadAt: null,
    ...raw,
  });
  if (!result.success) throw new Error(`${result.code}: ${result.message}`);
  return result.data;
}

/**
 * The same court `Matrix.test.tsx` builds for the off-roster flag, on the layout that has no grid.
 *
 * `row-flags.ts` is shared for exactly this: a badge is a string that names a row, so it reaches
 * the card as surely as the row, and this repo's history is five sentences that were true on the
 * desktop and false on the phone. The draw itself comes from `test/court.tsx`, so the two suites
 * and the page suite build one shape rather than three.
 */
function offRosterCourt(): CourtPerformance {
  return build({ draws: [...(drawFixture as RawDraw[]), offRosterDraw()] });
}

/** The same fixed present `Matrix.test.tsx` uses: dispute 166's period opened 3m 12s ago. */
const NOW = (1787604932 + 192) * 1000;

function renderCards(
  performance: CourtPerformance = build(),
  slotsFor?: (dispute: Dispute) => DisputeRowSlots,
  now: number = NOW,
) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <DisputeCards performance={performance} roster={roster} slotsFor={slotsFor} now={now} />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

/** One dispute's card, found the way a reader finds it: by the link that opens it. */
function card(id: number): HTMLElement {
  const link = screen.getByRole("link", { name: new RegExp(`^Dispute ${id}\\b`) });
  const found = link.closest("li");
  if (found === null) throw new Error(`no card for dispute ${id}`);
  return found;
}

/**
 * What `transparent` computes to.
 *
 * jsdom resolves the keyword to its rgba form, and the design tokens are CSS custom properties
 * it cannot resolve at all — so an assertion here can say that a slot carries *no* fill and
 * cannot say which colour a filled one is. The colours are `theme.test.ts`'s business.
 */
const TRANSPARENT = "rgba(0, 0, 0, 0)";

/** The six slots of one card, in the order they are rendered. */
function slotsOf(id: number): HTMLElement[] {
  const strip = card(id).lastElementChild;
  if (strip === null) throw new Error(`no strip on the card for dispute ${id}`);
  return [...strip.children] as HTMLElement[];
}

describe("DisputeCards", () => {
  it("renders one card per dispute and no grid at all", () => {
    renderCards();

    expect(screen.getAllByRole("listitem")).toHaveLength(16);
    // Not a narrower matrix: below the breakpoint the table is not scaled, not scrolled
    // sideways and not transposed into fewer columns. It is not rendered.
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("columnheader")).toHaveLength(0);
  });

  it("gives every card one slot per agent juror, in roster order, whatever the panel was", () => {
    renderCards();

    // 155 is in this list because it was decided by a panel of one: the strip is the roster, not
    // the panel, so it carries a slot per agent juror like every other card. That claim used to
    // be a second assertion below this loop, restating the loop's own `ROSTER.length` check
    // against a literal six — the literal was the only thing it added, and it was wrong.
    for (const id of [151, 155, 163, 166]) {
      const slots = slotsOf(id);
      expect(slots).toHaveLength(ROSTER.length);

      // The nth slot is the nth agent juror, on every card. Nothing sorts, compacts or omits.
      ROSTER.forEach((agentJuror, index) => {
        expect(slots[index]).toHaveTextContent(new RegExp(agentJuror.nickname, "i"));
      });
    }
  });

  it("holds the slots at a fixed width so they align from card to card", () => {
    renderCards();

    // Fixed slots with elastic gaps, and not the other way round. Six *equal* grid tracks would
    // put the third agent juror at a different x on a phone than on a tablet, and the one
    // property this layout exists to preserve would hold at exactly one width. Six tracks each
    // fixed at the slot width, spread by `justify-content`, is the construction that holds.
    //
    // 52px because jsdom's window is 1024px wide, where the floor under the width — the second
    // term of the min(), which only engages below about 354px of viewport — resolves to 163px
    // and loses. Which is the point: from the artboard's 390pt upward this is a flat 52px.
    for (const id of [163, 166]) {
      for (const slot of slotsOf(id)) {
        expect(getComputedStyle(slot).width).toBe("52px");
      }
    }

    const strip = getComputedStyle(card(163).lastElementChild as HTMLElement);
    expect(strip.display).toBe("grid");
    expect(strip.justifyContent).toBe("space-between");
  });

  /**
   * The roster is longer than one line of the strip, and not one slot may go missing for it.
   *
   * This has its own test because the failure it guards is silent in every way this repo can be
   * silent. The strip was `flex-wrap: nowrap` and sized against a hard-coded six; a seventh
   * agent juror in it did not wrap, did not scroll and did not warn — the card clips its own
   * overflow to keep its corners, so the slot was simply gone. Nothing threw, nothing logged,
   * and the page went on reporting six of seven agent jurors as though that were the court.
   *
   * jsdom cannot see a clip: it lays nothing out, so every assertion here is about what the
   * strip *declares*, and the browser half is ticket 24's own check at 390pt and down to 300pt.
   * What is worth declaring is exactly what makes the clip impossible rather than unlikely:
   *
   * - **a track template, not a flex line.** Wrapping flex with `space-between` puts an eighth
   *   slot flush right — position 5 on a line where it belongs at position 1. A grid's short
   *   last row fills columns 1..n of the same template, so slot *k* is at position *k* mod six
   *   at every roster size.
   * - **exactly `SLOTS_PER_LINE` tracks**, never `ROSTER.length` of them. Tracks that tracked
   *   the roster would re-space every card each time an agent juror joined, and would put the
   *   whole roster back on one line — which is the overflow this test exists for.
   * - **a slot width divided by `SLOTS_PER_LINE`**, for the same reason: dividing by the roster
   *   narrows every slot on every phone to fit a line that was never going to be one line.
   */
  it("drops no slot when the roster is longer than a line of the strip", () => {
    renderCards();

    const strip = card(163).lastElementChild as HTMLElement;
    const declared = getComputedStyle(strip);

    expect(strip.children).toHaveLength(ROSTER.length);
    expect(declared.display).toBe("grid");

    // One track per position on a line, whatever the roster's length — and asserted on the
    // *declared* template, because jsdom does not expand `repeat()` and reporting what was asked
    // for is the most it can honestly do. That the six tracks are really six boxes at 21, 80,
    // 139, 199, 258 and 317 with the seventh slot back at 21 on a second line was read in Chrome
    // at 390pt, and again at every width down to 300, where nothing is clipped and every slot
    // keeps a box. No assertion in jsdom can stand in for that.
    const template = declared.gridTemplateColumns;
    expect(template.startsWith(`repeat(${SLOTS_PER_LINE},`)).toBe(true);

    // And the width each track holds divides by the line, not by the roster. The two were the
    // same number until the court drew a seventh agent juror, which is how a literal six
    // survived four tickets in a file whose whole subject is that width.
    //
    // Only the positive half is assertable, and deliberately so. A matching `not.toContain` on
    // `ROSTER.length` reads well and is a trap: the two constants are equal again the moment an
    // agent juror leaves, and the assertion would then fail on correct code — in the one
    // scenario `agent-jurors.test.ts` is written to make loud, which is the worst possible time
    // for a second unrelated failure. CSS cannot distinguish `/ 6)` meant as the line from
    // `/ 6)` meant as the roster anyway; what stops the roster being used here is the constant
    // in `DisputeCards.tsx` and the comment above it.
    expect(template).toContain(`/ ${SLOTS_PER_LINE})`);
  });

  it("draws an agent juror that was not drawn as a single dot and nothing else", () => {
    renderCards();

    // Baskerville is undrawn in this fixture, which predates the court's first draw of it. Its
    // position is kept and carries no avatar, no glyph, no figure, no fill and no border —
    // nothing that could be read as a failure to act.
    const baskerville = ROSTER.findIndex(({ nickname }) => nickname === "Baskerville");
    const slot = slotsOf(163)[baskerville] as HTMLElement;

    expect(slot).toHaveTextContent("Baskerville: Not drawn");
    expect(within(slot).queryByRole("img")).not.toBeInTheDocument();
    expect(slot.textContent).not.toMatch(/[✓✕∅⋯?]/);
    expect(getComputedStyle(slot).backgroundColor).toBe(TRANSPARENT);
    expect(getComputedStyle(slot).boxShadow).toBe("none");
  });

  it("carries the state's word in the slot's accessible name rather than on its face", () => {
    renderCards();

    // The word does not fit under a 36pt avatar, and a state carried by hue alone would fail
    // ADR-0006. The glyph meets the greyscale test on screen; the word stays reachable here.
    const slots = slotsOf(163);
    expect(slots[0]).toHaveTextContent(/^007: Coherent,/);
  });

  it("shows one figure per slot, and it is the reveal on a finalised card", () => {
    const built = build();
    const row = built.rows.find((entry) => entry.dispute.id === 163) as MatrixRow;
    const column = row.cells.findIndex(
      (cell) => cell?.revealLatencySeconds != null && cell.commitLatencySeconds != null,
    );
    const drawn = row.cells[column] as Draw;
    renderCards(built);

    const slot = slotsOf(163)[column] as HTMLElement;

    // The reveal, read from the model rather than transcribed. Commit latency is off the face of
    // a finalised card entirely — it is behind the tap target, on the dispute's own view, along
    // with the vote-ID count and the two logarithmic rails.
    expect(slot).toHaveTextContent(formatLatencySeconds(drawn.revealLatencySeconds as number));
    expect(slot).not.toHaveTextContent(formatLatencySeconds(drawn.commitLatencySeconds as number));
    expect(slot.textContent).not.toMatch(/×\d/);
  });

  it("shows the commit on a live card, where no reveal exists yet", () => {
    // Every draw in disputes 164–166 has revealed, so the live-but-unrevealed case has to be
    // built: it is the only state in which a commit latency reaches a slot at all.
    const built = build();
    const live = built.rows.find((row) => row.dispute.id === 166) as MatrixRow;
    const committed: Draw = {
      ...(live.cells.find((cell) => cell !== null) as Draw),
      state: { kind: "live", stage: "committed" },
      revealLatencySeconds: null,
      commitLatencySeconds: 41,
      committed: true,
    };
    renderCards(withRow(built, 166, { cells: [committed, ...live.cells.slice(1)] }));

    expect(slotsOf(166)[0]).toHaveTextContent("41s");
  });

  it("renders every state, including the two with no example in this court", () => {
    // NO VOTE has never happened here and neither has a draw awaiting its commit. Both are
    // built rather than deferred to the day they occur.
    const states: { state: DrawState; glyph: string; word: string; figure: string }[] = [
      { state: { kind: "coherent" }, glyph: "✓", word: "Coherent", figure: "46s" },
      { state: { kind: "diverged" }, glyph: "✕", word: "Diverged", figure: "46s" },
      { state: { kind: "no-vote" }, glyph: "∅", word: "No vote", figure: "Missed" },
      { state: { kind: "live", stage: "awaiting" }, glyph: "⋯", word: "Awaiting", figure: "—" },
      { state: { kind: "live", stage: "revealed" }, glyph: "⋯", word: "Revealed", figure: "46s" },
    ];

    for (const { state, glyph, word, figure } of states) {
      const built = build();
      const row = built.rows.find((entry) => entry.dispute.id === 163) as MatrixRow;
      const first = row.cells.find((cell) => cell !== null) as Draw;
      const cell: Draw = {
        ...first,
        state,
        revealLatencySeconds: state.kind === "no-vote" ? null : 46,
        commitLatencySeconds: state.kind === "live" && state.stage === "awaiting" ? null : 41,
        committed: !(state.kind === "live" && state.stage === "awaiting"),
      };
      const { unmount } = renderCards(
        withRow(built, 163, { cells: [cell, ...row.cells.slice(1)] }),
      );

      const slot = slotsOf(163)[0] as HTMLElement;
      expect(slot).toHaveTextContent(word);
      expect(slot.textContent).toContain(glyph);
      expect(slot).toHaveTextContent(figure);
      unmount();
    }
  });

  it("keeps NO VOTE and not drawn as far apart as the desktop cell does", () => {
    const built = build();
    const row = built.rows.find((entry) => entry.dispute.id === 163) as MatrixRow;
    const first = row.cells.find((cell) => cell !== null) as Draw;
    renderCards(
      withRow(built, 163, {
        cells: [
          { ...first, state: { kind: "no-vote" }, revealLatencySeconds: null },
          ...row.cells.slice(1),
        ],
      }),
    );

    const slots = slotsOf(163);
    const missed = slots[0] as HTMLElement;
    const notDrawn = slots[ROSTER.findIndex((a) => a.nickname === "Baskerville")] as HTMLElement;

    // The loudest slot on the card against a bare dot: no shared glyph, no shared avatar, no
    // shared fill and no shared border. This is the distinction ticket 05 exists to protect.
    expect(missed).toHaveTextContent("Missed");
    expect(missed.textContent).toContain("∅");
    expect(getComputedStyle(missed).backgroundColor).not.toBe(TRANSPARENT);
    expect(getComputedStyle(missed).boxShadow).not.toBe("none");
    expect(getComputedStyle(notDrawn).backgroundColor).toBe(TRANSPARENT);
    expect(getComputedStyle(notDrawn).boxShadow).toBe("none");
    expect(notDrawn.textContent).not.toContain("∅");
  });

  it("makes the card the tap target and opens that dispute's own view", () => {
    renderCards(build(), (dispute) => (dispute.id === 163 ? { title: "A print-ready file" } : {}));

    // One link per card, named so a screen-reader user can tell them apart. Not an anchor
    // around the whole card: that would take every agent juror's state as its name.
    const link = screen.getByRole("link", { name: "Dispute 163: A print-ready file" });
    expect(link).toHaveAttribute("href", "/disputes/163");
    expect(within(card(163)).getAllByRole("link")).toHaveLength(1);
  });

  it("still opens a dispute whose subject never resolved", () => {
    renderCards(build(), () => ({}));

    // Ticket 04's rule survives the fold: every dispute has an ID and not every dispute has a
    // title, so a card whose template did not resolve is not the one card nobody can open.
    expect(screen.getByRole("link", { name: "Dispute 152" })).toHaveAttribute(
      "href",
      "/disputes/152",
    );
  });

  it("lets a title wrap rather than truncating it", () => {
    renderCards(build(), () => ({
      title: "Will Zelenskyy wear a suit before July? - Is a black tailored jacket a suit?",
    }));

    // A deliberate departure from ticket 04, whose truncation keeps every desktop row one
    // height so the list scans as a column. A card has no column to keep, and the title is
    // what tells a phone reader whether to open it.
    const title = getComputedStyle(within(card(163)).getByText(/zelenskyy/i));
    expect(title.whiteSpace).not.toBe("nowrap");
    expect(title.textOverflow).not.toBe("ellipsis");
  });

  it("keeps the panel size off every card, and still says what it knows on an unread one", () => {
    renderCards();

    // Six fixed slots along the card's foot, one per agent juror whether drawn or not, are the
    // count — the card's equivalent of the row's six cells, and the reason the pill went from
    // both layouts at once rather than from one of them.
    expect(within(card(163)).queryByText(/^Panel \d+$/)).not.toBeInTheDocument();
    expect(within(card(155)).queryByText(/^Panel \d+$/)).not.toBeInTheDocument();

    cleanup();

    // Not "Panel 0": an unread dispute's panel size is 0 because nobody asked, not because the
    // court drew nobody.
    renderCards(withRow(build(), 163, { read: false, cells: ROSTER.map(() => null) }));
    expect(within(card(163)).getByText("Draws not read")).toBeInTheDocument();
  });

  it("says a dispute the court has not drawn for has no panel yet, not a panel of nobody", () => {
    // The third state, worded by ticket 17 in `panelPillOf` and shared with the matrix row. It
    // is not rose and not Unknown: a court that has not drawn yet is not a read that failed, and
    // the draws for this dispute were read — there are simply none.
    renderCards(withRow(build(), 163, { panelSize: 0, cells: ROSTER.map(() => null) }));

    expect(within(card(163)).queryByText(/Panel 0/)).not.toBeInTheDocument();
    expect(within(card(163)).getByText("No panel yet")).toBeInTheDocument();
    expect(within(card(163)).queryByText("Draws not read")).not.toBeInTheDocument();
  });

  it("separates the two kinds of blank slot where the blanks are counted", () => {
    // The same sentence the matrix carries, over the same figures — one caveat, two layouts, and
    // the noun is the only thing that differs. Built from a raw dispute rather than by editing a
    // row, because the figures are the seam's: a row edited after the model was built would
    // leave the note counting the court the fixture holds.
    const waiting = {
      id: "167",
      disputeID: "167",
      period: "evidence",
      ruled: false,
      currentRuling: "0",
      createdAt: "1787620000",
      lastPeriodChange: "1787620000",
      currentRoundIndex: "0",
      rounds: [{ id: "167-0", timeline: ["0", "0", "0", "0"] }],
      templateId: null,
    } as RawDispute;

    renderCards(build({ disputes: [waiting, ...(disputeFixture as RawDispute[])] }));

    const note = screen.getByText(/sparsity is the normal state of this record/i);
    expect(note).toHaveTextContent(/blanks are a different absence/);
    expect(note).toHaveTextContent(/dispute 167 has no panel at all yet/);
    expect(note).toHaveTextContent(/A blank slot is drawn as nothing at all/);
  });

  it("marks a live card as a whole rather than marking each of its slots", () => {
    renderCards();

    const live = card(166);
    // The pill names the period and how long it has been open, per the artboard.
    expect(within(live).getByText(/Live · appeal 3m 12s/)).toBeInTheDocument();

    // The border and the tint are on the card. jsdom cannot resolve the tokens they are written
    // in, so what is checkable here is that the card itself is styled differently from a
    // finalised one — and the only thing liveness changes on this element is its border colour
    // and its background.
    expect(live.className).not.toBe(card(163).className);

    // The card carries the liveness; six mint-tinted slots inside a mint-tinted card would say
    // one thing six times over and leave nothing for the states to say.
    for (const slot of slotsOf(166)) {
      expect(getComputedStyle(slot).backgroundColor).toBe(TRANSPARENT);
    }
  });

  it("moves the metadata below the title wherever a pill took its place", () => {
    renderCards(build(), () => ({ title: "A dispute", category: "Licensing" }));

    // ID and pill, then title, then metadata — the artboard's live card, generalised to any
    // card carrying a flag. A finalised card with no flag keeps the metadata beside the ID.
    const live = [...card(166).children] as HTMLElement[];
    expect(live[0]).toHaveTextContent(/166.*Live · appeal/s);
    expect(live[1]).toHaveTextContent("A dispute");
    expect(live[2]).toHaveTextContent(/Licensing.*Pending/s);

    const finalised = [...card(163).children] as HTMLElement[];
    expect(finalised[0]).toHaveTextContent(/163.*Licensing.*Ruling/s);
  });

  it("reads pending where the ruling sits on a dispute with no ruling yet", () => {
    renderCards();

    // Never a blank: an empty slot where a ruling belongs is indistinguishable from one that
    // failed to load.
    expect(within(card(166)).getByText("Pending")).toBeInTheDocument();
  });

  it("carries at most one flag pill, with the precedence a matrix row uses", () => {
    renderCards();

    // Dispute 151 is both marked for its windows and still the oldest; the window flag outranks
    // everything below it. 155 is the lone panel. Neither card wears two.
    expect(within(card(151)).getByText(/8h window/)).toBeInTheDocument();
    expect(within(card(155)).getByText(/Lone panel/)).toBeInTheDocument();
    expect(within(card(155)).queryByText(/window/)).not.toBeInTheDocument();
  });

  it("carries the off-roster flag and its note, which no artboard draws for a phone", () => {
    // The badge and the footnote both, because they are two halves of one caveat and the phone is
    // where a caveat is most easily lost: `Footnotes.tsx` is shared for that reason.
    renderCards(offRosterCourt());

    expect(within(card(OFF_ROSTER_DISPUTE)).getByText(/1 off-roster draw/)).toBeInTheDocument();

    const note = screen.getByText(/roster does not hold/i);
    expect(note).toHaveTextContent(new RegExp(`One draw in dispute ${OFF_ROSTER_DISPUTE}`));
    // A count and nothing else. The address is in hand below the seam and must not reach a page.
    expect(screen.queryByText(/0x1111/i)).not.toBeInTheDocument();
  });

  it("says nothing about draws outside the roster where there are none", () => {
    // The state the court is in today, ticket 24 having added the agent juror that was in it.
    renderCards();

    expect(screen.queryByText(/roster does not hold/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/off-roster/i)).not.toBeInTheDocument();
  });

  it("puts the legend and the sparsity note where a phone reader will meet them", () => {
    renderCards();

    // Ticket 16's open question, closed: one mechanism for both, rendered inline and always
    // visible, at the head of the list rather than its foot. A reader scrolling a stack of
    // cards may never reach the foot, and the sparsity note is the one that prevents a
    // misreading rather than answering a question a reader knows they have.
    for (const word of ["Coherent", "Diverged", "No vote", "Acting", "Not drawn"]) {
      expect(screen.getAllByText(word).length).toBeGreaterThan(0);
    }
    expect(screen.getByText(/sparsity is the normal state of this record/i)).toBeInTheDocument();
    expect(screen.getByText(/slots here are blank/i)).toBeInTheDocument();

    // Neither is behind a control. `CLAUDE.md` requires caveats visible in the UI rather than
    // merely handled correctly in code.
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("reaches every caveat the desktop reader reaches", () => {
    renderCards();

    // The window caveat and the lone-panel caveat travel with the record rather than with the
    // grid — they are facts about the court, and a phone reader is as likely to cite them.
    expect(screen.getByText(/ran with a commit window of 8h/)).toBeInTheDocument();
    expect(screen.getByText(/decided by a panel of one/)).toBeInTheDocument();
    expect(screen.getByText(/never as a fraction of the window/)).toBeInTheDocument();
  });

  it("counts what it says off the model rather than out of the markup", () => {
    const built = build();
    renderCards(built);

    expect(
      screen.getByText(`${built.totals.finalised} finalised · ${built.totals.live} live`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`${built.totals.sparsity.blank} of the`)),
    ).toBeInTheDocument();
  });

  it("says what was read rather than counting to zero when the court comes back empty", () => {
    renderCards(build({ disputes: [], draws: [] }));

    expect(screen.getByText(/returned no disputes for court 34/i)).toBeInTheDocument();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});

/** The captured court with one of its rows replaced — for states this court has never held. */
function withRow(
  performance: CourtPerformance,
  id: number,
  over: Partial<MatrixRow>,
): CourtPerformance {
  return {
    ...performance,
    rows: performance.rows.map((row) => (row.dispute.id === id ? { ...row, ...over } : row)),
  };
}
