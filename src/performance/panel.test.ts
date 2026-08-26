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
    cells: ROSTER.map(() => null),
    windows: null,
    underEarlierWindows: false,
    read: true,
    ...over,
  };
}

describe("panelPillOf", () => {
  it("counts the panel of a dispute the court has drawn for", () => {
    expect(panelPillOf(row({ panelSize: 4 }))).toEqual({ text: "Panel 4", tone: undefined });
  });

  it("marks a panel of one amber, where being the majority took no agreement", () => {
    expect(panelPillOf(row({ panelSize: 1 }))).toEqual({ text: "Panel 1", tone: "work" });
  });

  // The defect this module was made for. Disputes 167, 168 and 169 sat in `evidence` with nobody
  // drawn, and both layouts printed `Panel 0` over them — a claim that the court drew a panel of
  // nobody, where the truth is that the draw has not happened yet.
  it("never prints a panel of nobody for a dispute the court has not drawn for yet", () => {
    const pill = panelPillOf(row({ panelSize: 0 }));

    expect(pill.text).not.toContain("0");
    expect(pill.text).toBe("No panel yet");
  });

  // Ticket 13's instruction, and it is about which of two things a reader concludes: a court
  // that has not drawn yet is not a read that failed.
  it("keeps a panel that has not been drawn out of the failure colours", () => {
    expect(panelPillOf(row({ panelSize: 0 })).tone).toBeUndefined();
    expect(panelPillOf(row({ read: false })).tone).toBe("fail");
  });

  it("says a row whose draws were never read is unread, not that it has no panel", () => {
    // `panelSize` is 0 on an unread row too, because nobody asked. Order matters: read first.
    expect(panelPillOf(row({ read: false, panelSize: 0 }))).toEqual({
      text: "Draws not read",
      tone: "fail",
    });
  });
});
