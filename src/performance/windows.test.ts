import { describe, expect, it } from "vitest";
import type { Dispute, DisputeRound } from "../disputes/disputes";
import fixture from "./court-34-parameters.fixture.json" with { type: "json" };
import {
  type PeriodWindows,
  type RawCourtParameters,
  sameMeasuredWindows,
  toRegimes,
  windowsAt,
  windowsFor,
} from "./windows";

/**
 * The court's parameter history, and what a dispute ran under.
 *
 * The one thing this module exists to prevent is the trap `CLAUDE.md` names first: reading the
 * court's *current* `timesPerPeriod` as though it had always held. Court 34's measured windows
 * changed between dispute 151 and dispute 152, so most of what follows is about which side of
 * that line a moment falls on.
 *
 * The third configuration is here for the opposite reason. It moved the evidence period and
 * nothing else, so it changes no answer this module gives about a commit or a vote — and it is
 * the one the court holds *now*, which is what makes it worth asserting over rather than
 * leaving to the two that came before it.
 */

/** The three configurations court 34 has had, as the chain reports them. */
const CREATED = "1786444490";
const MODIFIED = "1787230320";
const TRIMMED = "1787750041";

const OLD: PeriodWindows = {
  evidenceSeconds: 43_200,
  commitSeconds: 28_800,
  voteSeconds: 28_800,
  appealSeconds: 129_600,
};

const NEW: PeriodWindows = {
  evidenceSeconds: 2_700,
  commitSeconds: 2_700,
  voteSeconds: 1_800,
  appealSeconds: 129_600,
};

/**
 * The third, which is `NEW` with a ten-minute evidence period — a live demo not spending three
 * quarters of an hour waiting for a panel.
 *
 * Spelled out rather than spread from `NEW`, so that a fourth configuration touching a commit
 * or a vote window cannot land here as a one-word edit that reads as though nothing moved.
 */
const CURRENT: PeriodWindows = {
  evidenceSeconds: 600,
  commitSeconds: 2_700,
  voteSeconds: 1_800,
  appealSeconds: 129_600,
};

const HISTORY = fixture as RawCourtParameters[];

function round(overrides: Partial<DisputeRound> = {}): DisputeRound {
  return {
    index: 0,
    commitOpenedAt: null,
    voteOpenedAt: null,
    appealOpenedAt: null,
    executionOpenedAt: null,
    ...overrides,
  };
}

function dispute(overrides: Partial<Dispute> = {}): Dispute {
  return {
    id: 151,
    period: "execution",
    ruling: { state: "ruled", choice: 1 },
    createdAt: 1_787_144_365,
    lastPeriodChange: 1_787_257_250,
    templateId: 161,
    rounds: [round()],
    ...overrides,
  };
}

describe("toRegimes", () => {
  it("reads the three configurations court 34 has had", () => {
    const regimes = toRegimes(HISTORY);

    expect(regimes).toEqual([
      { from: Number(CREATED), windows: OLD },
      { from: Number(MODIFIED), windows: NEW },
      { from: Number(TRIMMED), windows: CURRENT },
    ]);
  });

  it("reads a change that moved the evidence window alone as a configuration like any other", () => {
    // The court reads `timesPerPeriod` whole, so a change touching one period is still a full
    // configuration and every window in it has to arrive intact. Reducing it to "what moved"
    // anywhere below the seam would leave the three windows that did not with nothing to say.
    const [, second, third] = toRegimes(HISTORY);

    expect(third?.windows).toEqual({ ...second?.windows, evidenceSeconds: 600 });
    expect(
      sameMeasuredWindows(second?.windows as PeriodWindows, third?.windows as PeriodWindows),
    ).toBe(true);
  });

  it("orders them by the moment they took effect, whatever order they arrived in", () => {
    // The reader sorts by block and log index; this is the model refusing to depend on that.
    // A history read out of order would put the newest configuration in the middle and hand
    // dispute 151 the wrong window without failing anywhere.
    const regimes = toRegimes([...HISTORY].reverse());

    expect(regimes.map((regime) => regime.from)).toEqual([
      Number(CREATED),
      Number(MODIFIED),
      Number(TRIMMED),
    ]);
  });

  it("refuses a duration it cannot read rather than turning it into a number", () => {
    // `Number("")` is 0 and `Number("1e3")` is 1000. A window of zero seconds would make every
    // dispute look like it ran under different rules from every other.
    expect(() =>
      toRegimes([{ at: CREATED, timesPerPeriod: ["43200", "", "28800", "129600"] }]),
    ).toThrow(/commit window/i);

    expect(() => toRegimes([{ at: "", timesPerPeriod: ["1", "2", "3", "4"] }])).toThrow(
      /took effect/i,
    );
  });
});

describe("windowsAt", () => {
  const regimes = toRegimes(HISTORY);

  it("has nothing to say about a moment before the court existed", () => {
    // Not the earliest configuration by default: the court did not hold it then, and a window
    // returned here would be an invention rather than a reading.
    expect(windowsAt(regimes, Number(CREATED) - 1)).toBeNull();
  });

  it("holds a configuration from the block it was mined in", () => {
    expect(windowsAt(regimes, Number(CREATED))).toEqual(OLD);
    expect(windowsAt(regimes, Number(MODIFIED) - 1)).toEqual(OLD);
    expect(windowsAt(regimes, Number(MODIFIED))).toEqual(NEW);
    expect(windowsAt(regimes, Number(TRIMMED) - 1)).toEqual(NEW);
    expect(windowsAt(regimes, Number(TRIMMED))).toEqual(CURRENT);
  });

  it("reads a period that has not opened against the configuration in force now", () => {
    // A period yet to open will run under whatever the court holds when it does, and the best
    // available reading of that is the latest configuration. Dating it from the dispute's
    // creation instead would quote a window the court may already have replaced — which is
    // what the third configuration makes concrete: `NEW` is what the court held for six days
    // and is no longer what an unopened period will run under.
    expect(windowsAt(regimes, null)).toEqual(CURRENT);
  });

  it("has nothing to say at all until the history has been read", () => {
    expect(windowsAt([], 1_787_188_106)).toBeNull();
    expect(windowsAt([], null)).toBeNull();
  });
});

describe("windowsFor", () => {
  const regimes = toRegimes(HISTORY);

  it("gives dispute 151 the eight-hour commit window it actually ran under", () => {
    // The live moments, from the captured payload: commit opened 2026-08-20 01:08 UTC, nine
    // hours before the court was reconfigured.
    const windows = windowsFor(
      regimes,
      dispute({
        rounds: [
          round({
            commitOpenedAt: 1_787_188_106,
            voteOpenedAt: 1_787_191_796,
            appealOpenedAt: 1_787_192_415,
            executionOpenedAt: 1_787_257_250,
          }),
        ],
      }),
    );

    expect(windows).toEqual(OLD);
  });

  it("gives dispute 152 the forty-five-minute one", () => {
    const windows = windowsFor(
      regimes,
      dispute({
        id: 152,
        createdAt: 1_787_233_192,
        rounds: [
          round({
            commitOpenedAt: 1_787_236_153,
            voteOpenedAt: 1_787_238_467,
            appealOpenedAt: 1_787_239_232,
            executionOpenedAt: 1_787_304_291,
          }),
        ],
      }),
    );

    expect(windows).toEqual(NEW);
  });

  it("resolves each period against the moment that period opened, not the dispute's", () => {
    // The case a per-dispute lookup gets wrong: created under one configuration, its commit
    // period opened under the next. The court reads `timesPerPeriod` when it passes a period,
    // so the window that governed this commit is the new one even though the dispute is older.
    const windows = windowsFor(
      regimes,
      dispute({
        createdAt: Number(MODIFIED) - 3_600,
        rounds: [round({ commitOpenedAt: Number(MODIFIED) + 60 })],
      }),
    );

    expect(windows?.evidenceSeconds).toBe(OLD.evidenceSeconds);
    expect(windows?.commitSeconds).toBe(NEW.commitSeconds);
  });

  it("reads the round the matrix measures, which is the latest one", () => {
    // Round ids sort lexicographically and rounds arrive in no order worth trusting, so this
    // is read from the index. An appealed dispute's cells are its current round's.
    const windows = windowsFor(
      regimes,
      dispute({
        createdAt: Number(CREATED) + 60,
        rounds: [
          round({ index: 1, commitOpenedAt: Number(MODIFIED) + 60 }),
          round({ index: 0, commitOpenedAt: Number(CREATED) + 120 }),
        ],
      }),
    );

    expect(windows?.commitSeconds).toBe(NEW.commitSeconds);
  });

  it("says nothing about a dispute older than every configuration it has", () => {
    expect(windowsFor(regimes, dispute({ createdAt: Number(CREATED) - 60 }))).toBeNull();
    expect(windowsFor([], dispute())).toBeNull();
  });
});

describe("sameMeasuredWindows", () => {
  it("compares the two windows the figures on this page are measured in", () => {
    expect(sameMeasuredWindows(OLD, NEW)).toBe(false);
    expect(sameMeasuredWindows(NEW, { ...NEW })).toBe(true);
  });

  it("ignores the evidence and appeal windows, which touch no latency here", () => {
    // Nothing on this dashboard is measured from the evidence or appeal periods, so a court
    // that changed only those would mark every older dispute for a difference the reader
    // cannot see in any figure. A marker that appears without a visible cause is noise.
    expect(sameMeasuredWindows(NEW, { ...NEW, evidenceSeconds: 1, appealSeconds: 2 })).toBe(true);
  });
});
