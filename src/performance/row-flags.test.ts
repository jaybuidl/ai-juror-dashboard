import { describe, expect, it } from "vitest";
import type { Dispute } from "../disputes/disputes";
import { ROSTER } from "../roster/agent-jurors";
import type { MatrixRow } from "./performance";
import { ROW_FLAGS, rowFlagOf } from "./row-flags";
import type { PeriodWindows } from "./windows";

/**
 * The precedence, checked rather than looked at.
 *
 * It was private to `Matrix.tsx` until ticket 16 gave the same disputes a second rendering, and
 * the reason it moved is exactly what this file pins: a phone card and a matrix row must mark
 * one dispute the same way. A test that rendered a matrix could only prove it for the matrix.
 */

const CURRENT: PeriodWindows = {
  evidenceSeconds: 2700,
  commitSeconds: 2700,
  voteSeconds: 1800,
  appealSeconds: 129_600,
};

/** The windows dispute 151 ran under: 8h commit, 8h vote. */
const EARLIER: PeriodWindows = {
  evidenceSeconds: 43_200,
  commitSeconds: 28_800,
  voteSeconds: 28_800,
  appealSeconds: 129_600,
};

const NOW = 1_787_604_932_000;

function dispute(over: Partial<Dispute> = {}): Dispute {
  return {
    id: 151,
    period: "execution",
    ruling: { state: "ruled", choice: 1 },
    createdAt: NOW / 1000 - 86_400,
    // The moment the current period opened, which is what the live pill counts from — not the
    // round timeline. A `0` here is the subgraph's "has not happened", and `periodOpenSeconds`
    // returns null for it rather than a latency of fifty-six years.
    lastPeriodChange: NOW / 1000 - 192,
    templateId: 161,
    rounds: [],
    ...over,
  };
}

function row(over: Partial<MatrixRow> = {}): MatrixRow {
  return {
    dispute: dispute(),
    panelSize: 4,
    // Declared rather than left to follow `panelSize`, and the two are deliberately not tied: a
    // fixture whose panel of four had no cells would carry four off-roster draws by arithmetic,
    // and every case in this file that is about some other flag would meet the new one first.
    offRosterDraws: 0,
    cells: ROSTER.map(() => null),
    windows: CURRENT,
    underEarlierWindows: false,
    read: true,
    ...over,
  };
}

const context = { current: CURRENT, now: NOW };

describe("rowFlagOf", () => {
  it("flags nothing on a finalised dispute with a full panel and current windows", () => {
    expect(rowFlagOf(row(), context)).toBeUndefined();
  });

  it("puts an unread row above every other flag", () => {
    // A row nobody asked about has nothing true to flag, and the window flag below reads the
    // *dispute*, which was read — so without this entry a row about to be drawn as entirely
    // unknown would wear "8h window" over six positions reading "not read".
    const flag = rowFlagOf(
      row({ read: false, underEarlierWindows: true, windows: EARLIER, panelSize: 1 }),
      context,
    );

    expect(flag?.key).toBe("not-read");
    expect(flag?.label(row({ read: false }), context)).toBe("Not read");
  });

  it("puts a changed window above a lone panel", () => {
    // The window is what makes a dispute's figures incomparable with the ones around it; a lone
    // panel only makes one of them uninformative, and carries its own amber on the panel pill.
    const flag = rowFlagOf(
      row({ underEarlierWindows: true, windows: EARLIER, panelSize: 1 }),
      context,
    );

    expect(flag?.key).toBe("window");
  });

  it("names the window that actually differs", () => {
    const marked = row({ underEarlierWindows: true, windows: EARLIER });

    // Court 34 changed both, so the commit window is named. A court that changed only its vote
    // window would otherwise be labelled with a duration identical to the one it holds now.
    expect(rowFlagOf(marked, context)?.label(marked, context)).toBe("8h window");

    const voteOnly = row({
      underEarlierWindows: true,
      windows: { ...EARLIER, commitSeconds: CURRENT.commitSeconds },
    });
    expect(rowFlagOf(voteOnly, context)?.label(voteOnly, context)).toBe("8h vote window");
  });

  describe("the off-roster flag, which ranks third", () => {
    it("sits below a changed window", () => {
      // A mis-dated latency is worse than an unattributed panel member: the window makes every
      // figure on the row incomparable with the rows around it, where this says one is short.
      const both = row({ underEarlierWindows: true, windows: EARLIER, offRosterDraws: 2 });

      expect(rowFlagOf(both, context)?.key).toBe("window");
    });

    it("sits above a lone panel and above live", () => {
      // Both of those describe the court's own shape. This one says something is missing from
      // what the grid shows, and a reader needs that before being told the panel was one.
      const lone = row({ offRosterDraws: 1, panelSize: 1 });
      const live = row({
        offRosterDraws: 1,
        dispute: dispute({ period: "commit", ruling: { state: "pending" } }),
      });

      expect(rowFlagOf(lone, context)?.key).toBe("off-roster");
      expect(rowFlagOf(live, context)?.key).toBe("off-roster");
    });

    it("stays below an unread row, which has nothing true to flag at all", () => {
      const unread = row({ read: false, offRosterDraws: 3 });

      expect(rowFlagOf(unread, context)?.key).toBe("not-read");
    });

    it("says the count and, at the compact density, gives up only the noun", () => {
      const one = row({ offRosterDraws: 1 });
      const several = row({ offRosterDraws: 4 });

      expect(rowFlagOf(one, context)?.label(one, context)).toBe("1 off-roster draw");
      expect(rowFlagOf(one, context)?.shortLabel(one, context)).toBe("1 off-roster");
      expect(rowFlagOf(several, context)?.label(several, context)).toBe("4 off-roster draws");
      expect(rowFlagOf(several, context)?.shortLabel(several, context)).toBe("4 off-roster");
    });

    it("cannot fork: the short form is a prefix of the long one at every count", () => {
      // Both forms are composed from one reduction rather than one being cut out of the other,
      // which is the rule `markedWindow` established — an abbreviation built by trimming a
      // finished string is free to name something the long form does not.
      for (const count of [1, 2, 9, 17]) {
        const marked = row({ offRosterDraws: count });
        const flag = rowFlagOf(marked, context);

        expect(flag?.label(marked, context).startsWith(flag.shortLabel(marked, context))).toBe(
          true,
        );
        expect(flag?.shortLabel(marked, context)).toContain(String(count));
      }
    });

    it("does not fire where every draw has a column, which is this court today", () => {
      expect(rowFlagOf(row({ offRosterDraws: 0 }), context)).toBeUndefined();
    });
  });

  it("puts a lone panel above live", () => {
    const flag = rowFlagOf(
      row({ panelSize: 1, dispute: dispute({ period: "vote", ruling: { state: "pending" } }) }),
      context,
    );

    expect(flag?.key).toBe("lone-panel");
    expect(flag?.tone).toBe("work");
  });

  it("names the open period and how long it has been open on a live dispute", () => {
    // The commit period opened 3m 12s before `NOW`, as the artboard's live card reads.
    const live = row({ dispute: dispute({ period: "commit", ruling: { state: "pending" } }) });

    const flag = rowFlagOf(live, context);
    expect(flag?.key).toBe("live");
    expect(flag?.tone).toBe("live");
    expect(flag?.label(live, context)).toBe("Live · commit 3m 12s");
  });

  describe("the abbreviated labels the compact density uses", () => {
    /**
     * `MatrixDense.dc.html:213` against `Main.dc.html:302`, which is the one place the two
     * artboards deliberately word one thing twice. What has to hold is that the flag is still
     * named: a compact row 441px wide has an id, a title, a panel and a figure on it too, and
     * the live pill's 175px were coming out of the title.
     */
    it("keeps saying which flag it is, without the qualifier after it", () => {
      const marked = row({ underEarlierWindows: true, windows: EARLIER });
      const lone = row({ panelSize: 1 });
      const live = row({ dispute: dispute({ period: "commit", ruling: { state: "pending" } }) });

      expect(rowFlagOf(marked, context)?.shortLabel(marked, context)).toBe("8h");
      expect(rowFlagOf(lone, context)?.shortLabel(lone, context)).toBe("Lone");
      expect(rowFlagOf(live, context)?.shortLabel(live, context)).toBe("Live");
    });

    it("says a read that failed in full at either density", () => {
      // The one flag that does not abbreviate. It is two words, neither of them a qualifier,
      // and it is the one a reader most needs to not misread as a fact about the court.
      const unread = row({ read: false });

      expect(rowFlagOf(unread, context)?.shortLabel(unread, context)).toBe("Not read");
    });

    it("abbreviates whichever window the marker is actually about", () => {
      // The same comparison the full label makes: a court that changed only its vote window
      // would otherwise be marked with a duration identical to the one it holds now.
      const voteOnly = row({
        underEarlierWindows: true,
        windows: { ...EARLIER, commitSeconds: CURRENT.commitSeconds },
      });

      expect(rowFlagOf(voteOnly, context)?.label(voteOnly, context)).toBe("8h vote window");
      expect(rowFlagOf(voteOnly, context)?.shortLabel(voteOnly, context)).toBe("8h");
    });

    it("never abbreviates a duration into one the court never had", () => {
      // `formatWindowSeconds` returns two words whenever the minutes do not divide by 60, so an
      // abbreviation cut at the first space would turn a 90-minute window into "1h" — on the
      // marker whose whole job is to name the window that differs. Court 34's 8h, 45m and 30m
      // are all one token, which is what hid this until review.
      const ninety = row({
        underEarlierWindows: true,
        windows: { ...EARLIER, commitSeconds: 5400 },
      });

      expect(rowFlagOf(ninety, context)?.label(ninety, context)).toBe("1h 30m window");
      expect(rowFlagOf(ninety, context)?.shortLabel(ninety, context)).toBe("1h 30m");
    });

    it("says a row the history cannot place is from an earlier window, either way", () => {
      const unplaced = row({ underEarlierWindows: true, windows: null });

      expect(rowFlagOf(unplaced, context)?.label(unplaced, context)).toBe("Earlier window");
      expect(rowFlagOf(unplaced, context)?.shortLabel(unplaced, context)).toBe("Earlier");
    });

    it("gives every flag both labels, so neither density can meet one that has none", () => {
      for (const flag of ROW_FLAGS) {
        expect(typeof flag.shortLabel).toBe("function");
        expect(flag.shortLabel(row(), context).length).toBeGreaterThan(0);
      }
    });
  });

  it("still says a dispute is live when its period cannot be dated", () => {
    // `Round.timeline` writes 0 for a period that has not opened, which the edge parses to
    // null. The dispute is still live and still says so; only the elapsed half is dropped.
    const live = row({
      dispute: dispute({ period: "evidence", ruling: { state: "pending" }, lastPeriodChange: 0 }),
    });

    expect(rowFlagOf(live, context)?.label(live, context)).toBe("Live · evidence");
  });
});
