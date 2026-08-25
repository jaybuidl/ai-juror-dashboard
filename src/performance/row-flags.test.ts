import { describe, expect, it } from "vitest";
import type { Dispute } from "../disputes/disputes";
import { ROSTER } from "../roster/agent-jurors";
import type { MatrixRow } from "./performance";
import { rowFlagOf } from "./row-flags";
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

  it("still says a dispute is live when its period cannot be dated", () => {
    // `Round.timeline` writes 0 for a period that has not opened, which the edge parses to
    // null. The dispute is still live and still says so; only the elapsed half is dropped.
    const live = row({
      dispute: dispute({ period: "evidence", ruling: { state: "pending" }, lastPeriodChange: 0 }),
    });

    expect(rowFlagOf(live, context)?.label(live, context)).toBe("Live · evidence");
  });
});
