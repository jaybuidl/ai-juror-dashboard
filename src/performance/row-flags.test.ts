import { describe, expect, it } from "vitest";
import type { Dispute } from "../disputes/disputes";
import { ROSTER } from "../roster/agent-jurors";
import type { MatrixRow } from "./performance";
import { ROW_FLAGS, rowFlagOf } from "./row-flags";

/**
 * The precedence, checked rather than looked at.
 *
 * It was private to `Matrix.tsx` until ticket 16 gave the same disputes a second rendering, and
 * the reason it moved is exactly what this file pins: a phone card and a matrix row must mark
 * one dispute the same way. A test that rendered a matrix could only prove it for the matrix.
 */

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
    windows: null,
    underEarlierWindows: false,
    read: true,
    ...over,
  };
}

const context = { now: NOW };

describe("rowFlagOf", () => {
  it("flags nothing on a finalised dispute with a full panel", () => {
    expect(rowFlagOf(row(), context)).toBeUndefined();
  });

  it("no longer flags a changed window, an off-roster draw or a lone panel", () => {
    // Removed from the UI on 2026-09-24 (maintainer's ruling); /method keeps the prose.
    expect(rowFlagOf(row({ underEarlierWindows: true }), context)).toBeUndefined();
    expect(rowFlagOf(row({ offRosterDraws: 2 }), context)).toBeUndefined();
    expect(rowFlagOf(row({ panelSize: 1 }), context)).toBeUndefined();
  });

  it("puts an unread row above every other flag", () => {
    const unread = row({
      read: false,
      dispute: dispute({ period: "commit", ruling: { state: "pending" } }),
    });
    const flag = rowFlagOf(unread, context);

    expect(flag?.key).toBe("not-read");
    expect(flag?.label(unread, context)).toBe("Not read");
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
      const live = row({ dispute: dispute({ period: "commit", ruling: { state: "pending" } }) });

      expect(rowFlagOf(live, context)?.shortLabel(live, context)).toBe("Live");
    });

    it("says a read that failed in full at either density", () => {
      // The one flag that does not abbreviate. It is two words, neither of them a qualifier,
      // and it is the one a reader most needs to not misread as a fact about the court.
      const unread = row({ read: false });

      expect(rowFlagOf(unread, context)?.shortLabel(unread, context)).toBe("Not read");
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
