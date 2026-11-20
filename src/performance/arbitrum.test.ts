import { describe, expect, it } from "vitest";
import { arbitrumSource, blockRanges, DEFAULT_ARBITRUM_RPC_URL, LOG_RANGE_LIMIT } from "./arbitrum";

/**
 * What the failure banner is allowed to say about this endpoint.
 *
 * Every case passes the URL rather than setting an environment variable, which is what the
 * parameter on `arbitrumSource` is for: `import.meta.env` is inlined at build time, so a test
 * that stubbed it would be testing the stub.
 */
describe("arbitrumSource", () => {
  it("names the stock endpoint by host", () => {
    expect(arbitrumSource(DEFAULT_ARBITRUM_RPC_URL).name).toBe("arb1.arbitrum.io");
    expect(arbitrumSource(DEFAULT_ARBITRUM_RPC_URL).label).toBe("The Arbitrum endpoint");
  });

  it("names an overridden endpoint by the host actually configured", () => {
    // The defect this function exists for: a constant said `arb1.arbitrum.io` here, so the
    // banner reported an outage at an endpoint the page had never contacted.
    expect(arbitrumSource("https://arb-mainnet.g.alchemy.com/v2/abc123").name).toBe(
      "arb-mainnet.g.alchemy.com",
    );
  });

  it("never renders the key an override carries in its path", () => {
    const key = "sekrit-api-key";
    const source = arbitrumSource(`https://arb-mainnet.g.alchemy.com/v2/${key}`);

    // The load-bearing assertion. This string is printed into a public page under SOURCE, and
    // a reader may screenshot it. The host is the half that is safe to show.
    expect(source.name).not.toContain(key);
    expect(source.name).not.toContain("/");
  });

  it("keeps a port, which is part of the host a reader would check", () => {
    expect(arbitrumSource("http://localhost:8545").name).toBe("localhost:8545");
  });

  it("says it cannot read the host rather than naming a different one", () => {
    // Not `arb1.arbitrum.io` — falling back to the default is this bug again, at the moment it
    // misleads most. Not the raw string either: that is where the key is.
    const source = arbitrumSource("not a url/with-a-key");

    expect(source.name).toBe("Not a host this page can read");
    expect(source.name).not.toContain("with-a-key");
  });
});

/**
 * The windows a scan is cut into. arb1 refuses one `eth_getLogs` spanning more than
 * `LOG_RANGE_LIMIT` blocks (#25), so a window one block too wide is a scan that reads nothing.
 */
describe("blockRanges", () => {
  it("is one window when the range fits", () => {
    expect(blockRanges(100n, 250n)).toEqual([{ fromBlock: 100n, toBlock: 250n }]);
  });

  it("cuts a wide range into contiguous windows of at most the limit, both ends inclusive", () => {
    expect(blockRanges(0n, 24n, 10n)).toEqual([
      { fromBlock: 0n, toBlock: 9n },
      { fromBlock: 10n, toBlock: 19n },
      { fromBlock: 20n, toBlock: 24n },
    ]);
  });

  it("spans exactly the limit at the boundary, which the endpoint accepts", () => {
    const [only, ...rest] = blockRanges(1n, LOG_RANGE_LIMIT);

    expect(rest).toEqual([]);
    expect((only?.toBlock ?? 0n) - (only?.fromBlock ?? 0n) + 1n).toBe(LOG_RANGE_LIMIT);
  });

  it("is a single block when the range is one block", () => {
    expect(blockRanges(7n, 7n)).toEqual([{ fromBlock: 7n, toBlock: 7n }]);
  });

  it("is nothing to read when the start is past the end", () => {
    // A node a few blocks behind the subgraph reports a head below the block a dispute was
    // drawn in. That is a scan with nothing in it yet, not an error and not a window of
    // negative width.
    expect(blockRanges(10n, 9n)).toEqual([]);
  });
});
