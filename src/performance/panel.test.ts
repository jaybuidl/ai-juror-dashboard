import { describe, expect, it } from "vitest";
import type { Dispute } from "../disputes/disputes";
import { ROSTER } from "../roster/agent-jurors";
import { panelPillOf } from "./panel";
import type { MatrixRow } from "./performance";

/**
 * What the panel slot says, checked rather than looked at.
 *
 * The captured court holds no dispute with an empty panel — every fixture here stops at 166, and
 * 167 to 169 arrived in their evidence period afterwards — so the state this file is mostly
 * about has to be built by hand, exactly as `CLAUDE.md` says every failure shape here does.
 */

function dispute(over: Partial<Dispute> = {}): Dispute {
  return {
    id: 167,
    period: "evidence",
    ruling: { state: "pending" },
    createdAt: 1_787_604_932,
    lastPeriodChange: 1_787_604_932,
    templateId: null,
    rounds: [],
    ...over,
  };
}

function row(over: Partial<MatrixRow> = {}): MatrixRow {
  return {
    dispute: dispute(),
    panelSize: 4,
    // Every panel member has a column unless a case says otherwise: a fixture that left this to
    // follow `panelSize` would put an off-roster flag on rows that are about something else.
    offRosterDraws: 0,
    cells: ROSTER.map(() => null),
    windows: null,
    underEarlierWindows: false,
    read: true,
    ...over,
  };
}

describe("panelPillOf", () => {
  // The size is gone from both layouts, and asserting its absence is the point. A row draws six
  // cells and a card six slots, each a draw or a blank, so the number counted what the reader is
  // already looking at — checked against the live court, where all 31 rows had a panel size equal
  // to their own drawn-cell count. A panel of one loses nothing either: it kept saying `Panel 1`
  // beside a ‡ Lone panel flag that says the same thing and says why it matters.
  it("says nothing where the panel is one the reader can count", () => {
    for (const panelSize of [1, 2, 4, 7]) {
      expect(panelPillOf(row({ panelSize }))).toBeNull();
    }
  });

  // The defect this module was made for. Disputes 167, 168 and 169 sat in `evidence` with nobody
  // drawn, and both layouts printed `Panel 0` over them — a claim that the court drew a panel of
  // nobody, where the truth is that the draw has not happened yet.
  it("never prints a panel of nobody for a dispute the court has not drawn for yet", () => {
    const pill = panelPillOf(row({ panelSize: 0 }));

    expect(pill).not.toBeNull();
    expect(pill?.text).toBe("No panel yet");
    expect(pill?.text).not.toContain("0");
  });

  // Ticket 13's instruction, and it is about which of two things a reader concludes: a court
  // that has not drawn yet is not a read that failed.
  it("keeps a panel that has not been drawn out of the failure colours", () => {
    expect(panelPillOf(row({ panelSize: 0 }))?.tone).toBeUndefined();
    expect(panelPillOf(row({ read: false }))?.tone).toBe("fail");
  });

  it("says a row whose draws were never read is unread, not that it has no panel", () => {
    // `panelSize` is 0 on an unread row too, because nobody asked. Order matters: read first.
    expect(panelPillOf(row({ read: false, panelSize: 0 }))).toEqual({
      text: "Draws not read",
      tone: "fail",
    });
  });
});
