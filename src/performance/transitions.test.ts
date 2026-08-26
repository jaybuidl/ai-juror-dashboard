import { describe, expect, it } from "vitest";
import { snapshotOf, transitionsBetween } from "./transitions";

/**
 * Ticket 18. Ticket 12 made the court move: every five seconds, for as long as anything in it
 * is unruled, the disputes and the draws are re-read and the page redraws. A reader watching it
 * sees a cell change. A reader hearing it is told nothing at all — and the fix cannot be to put
 * the matrix in a live region, because that announces a hundred and sixty-eight cells every
 * five seconds. What is wanted is the difference, in words, and nothing else.
 *
 * So this is a diff, which makes it a derivation, which puts it below the seam with every other
 * one. It reads no clock, touches no network and holds no React.
 */

const snapshot = (entries: ReadonlyArray<[number, boolean, ReadonlyArray<[string, string]>]>) =>
  snapshotOf({
    rows: entries.map(([id, ruled, cells]) => ({
      dispute: { id, ruling: ruled ? { state: "ruled", choice: 1 } : { state: "pending" } },
      read: true,
      cells: cells.map(([nickname, stage]) => ({
        agentJuror: { nickname },
        state:
          stage === "coherent" || stage === "diverged" || stage === "no-vote"
            ? { kind: stage }
            : { kind: "live", stage },
      })),
    })),
    // biome-ignore lint/suspicious/noExplicitAny: a hand-built stand-in for the model's shape
  } as any);

describe("transitionsBetween", () => {
  it("says nothing at all on a first read", () => {
    // There is no previous state to have moved from, and a page that announces its own arrival
    // as news is the `role="status"`-on-furniture mistake in another form.
    const now = snapshot([[166, false, [["007", "awaiting"]]]]);

    expect(transitionsBetween(null, now)).toEqual([]);
  });

  it("says nothing when nothing moved", () => {
    // The ordinary case: the poll fires every five seconds and almost always finds the court
    // exactly as it left it. Anything other than silence here is a reader taught to ignore this.
    const before = snapshot([[166, false, [["007", "awaiting"]]]]);
    const after = snapshot([[166, false, [["007", "awaiting"]]]]);

    expect(transitionsBetween(before, after)).toEqual([]);
  });

  it("names a draw that committed, and one that revealed", () => {
    const before = snapshot([
      [
        166,
        false,
        [
          ["007", "awaiting"],
          ["aletheia", "committed"],
        ],
      ],
    ]);
    const after = snapshot([
      [
        166,
        false,
        [
          ["007", "committed"],
          ["aletheia", "revealed"],
        ],
      ],
    ]);

    expect(transitionsBetween(before, after)).toEqual([
      "007 committed in dispute 166.",
      "aletheia revealed in dispute 166.",
    ]);
  });

  it("names a dispute that was ruled, and says so before the draws under it", () => {
    // The ruling is the event; the coherence marks are its consequence. A reader hearing six
    // "voted with the ruling" lines before being told there is a ruling has to hold them all.
    const before = snapshot([[166, false, [["007", "revealed"]]]]);
    const after = snapshot([[166, true, [["007", "coherent"]]]]);

    expect(transitionsBetween(before, after)[0]).toBe("Dispute 166 has been ruled.");
  });

  it("does not announce a draw that only changed because its dispute was ruled", () => {
    // Every revealed draw resolves to coherent or diverged the moment the ruling lands. Saying
    // so per draw turns one event into seven, and the matrix is right there.
    const before = snapshot([
      [
        166,
        false,
        [
          ["007", "revealed"],
          ["aletheia", "revealed"],
        ],
      ],
    ]);
    const after = snapshot([
      [
        166,
        true,
        [
          ["007", "coherent"],
          ["aletheia", "diverged"],
        ],
      ],
    ]);

    expect(transitionsBetween(before, after)).toEqual(["Dispute 166 has been ruled."]);
  });

  it("collapses a burst into a count rather than reading a list", () => {
    // A screen reader interrupts itself on each polite update, so a dozen sentences arriving at
    // once is a dozen fragments. Past a handful the honest thing is the number.
    const nicknames = ["007", "aletheia", "blaise", "columbo", "daemonhill", "baskerville"];
    const before = snapshot([
      [166, false, nicknames.map((n) => [n, "awaiting"] as [string, string])],
      [167, false, nicknames.map((n) => [n, "awaiting"] as [string, string])],
    ]);
    const after = snapshot([
      [166, false, nicknames.map((n) => [n, "committed"] as [string, string])],
      [167, false, nicknames.map((n) => [n, "committed"] as [string, string])],
    ]);

    expect(transitionsBetween(before, after)).toEqual(["12 draws advanced across 2 disputes."]);
  });

  it("says nothing about a dispute that arrived, or one whose draws were not read", () => {
    // A new dispute is not a transition — nothing moved, the court grew — and an unread row is
    // an absence rather than an event. Both would otherwise read as activity.
    const before = snapshot([[166, false, [["007", "awaiting"]]]]);
    const after = snapshot([
      [167, false, [["007", "awaiting"]]],
      [166, false, [["007", "awaiting"]]],
    ]);

    expect(transitionsBetween(before, after)).toEqual([]);
  });
});
