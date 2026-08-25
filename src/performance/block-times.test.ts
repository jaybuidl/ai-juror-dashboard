import { describe, expect, it } from "vitest";
import { BLOCK_TIMES_KEY, createBlockTimes, MAX_REMEMBERED_BLOCKS } from "./block-times";

/** A `Storage` that lives in a variable, so one test can hand its contents to the next. */
function fakeStorage(seed: Record<string, string> = {}) {
  const held = new Map(Object.entries(seed));

  return {
    getItem: (key: string) => held.get(key) ?? null,
    setItem: (key: string, value: string) => {
      held.set(key, value);
    },
    removeItem: (key: string) => {
      held.delete(key);
    },
    held,
  } as unknown as Storage & { held: Map<string, string> };
}

/** A browser that refuses to store anything: private mode, or a full quota. */
function hostileStorage() {
  return {
    getItem: () => {
      throw new Error("SecurityError: access is denied for this document");
    },
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
    removeItem: () => {},
  } as unknown as Storage;
}

describe("createBlockTimes", () => {
  it("knows nothing about a block it has not been told about", () => {
    expect(createBlockTimes(fakeStorage()).get(496_351_385n)).toBeUndefined();
  });

  it("remembers a block's moment within one read", () => {
    const times = createBlockTimes(fakeStorage());
    times.set(496_351_385n, 1_787_188_232n);

    expect(times.get(496_351_385n)).toBe(1_787_188_232n);
  });

  it("carries what it learned across a reload", () => {
    // The whole point: a mined block's timestamp cannot change, so the one read of it is the
    // only one anybody ever needs to pay for.
    const storage = fakeStorage();
    const first = createBlockTimes(storage);
    first.set(496_351_385n, 1_787_188_232n);
    first.flush();

    expect(createBlockTimes(storage).get(496_351_385n)).toBe(1_787_188_232n);
  });

  it("keeps nothing it was not asked to keep until it is flushed", () => {
    const storage = fakeStorage();
    createBlockTimes(storage).set(1n, 2n);

    expect(storage.held.get(BLOCK_TIMES_KEY)).toBeUndefined();
  });

  it("reads a court it can no longer parse as a court it has not read", () => {
    // A half-written entry, or one from before this key's shape settled. Discarding it costs
    // one round of block reads; trusting it would put a wrong moment on a latency.
    const storage = fakeStorage({ [BLOCK_TIMES_KEY]: "{not json" });

    expect(createBlockTimes(storage).get(496_351_385n)).toBeUndefined();
  });

  it("ignores an entry whose numbers are not numbers", () => {
    const storage = fakeStorage({
      [BLOCK_TIMES_KEY]: JSON.stringify({ "496351385": "later", nonsense: "12" }),
    });
    const times = createBlockTimes(storage);

    expect(times.get(496_351_385n)).toBeUndefined();
  });

  it("works in a browser that refuses to store anything at all", () => {
    // Private mode throws on access rather than returning null, and a dashboard that fell over
    // there would fail for a reason that has nothing to do with the court.
    const times = createBlockTimes(hostileStorage());
    times.set(1n, 2n);
    times.flush();

    expect(times.get(1n)).toBe(2n);
  });

  it("works with no storage at all", () => {
    const times = createBlockTimes(null);
    times.set(1n, 2n);
    times.flush();

    expect(times.get(1n)).toBe(2n);
  });

  it("forgets the oldest blocks rather than growing without a bound", () => {
    // One entry per commitment, for as long as the court runs. The oldest go first because
    // the newest are the ones a live dispute is about to ask for again.
    const storage = fakeStorage();
    const times = createBlockTimes(storage);
    for (let block = 0; block <= MAX_REMEMBERED_BLOCKS; block += 1) {
      times.set(BigInt(block), BigInt(block * 2));
    }
    times.flush();

    const reloaded = createBlockTimes(storage);

    expect(reloaded.get(0n)).toBeUndefined();
    expect(reloaded.get(BigInt(MAX_REMEMBERED_BLOCKS))).toBe(BigInt(MAX_REMEMBERED_BLOCKS * 2));
  });
});
