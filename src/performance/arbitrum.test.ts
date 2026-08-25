import { describe, expect, it } from "vitest";
import { arbitrumSource, DEFAULT_ARBITRUM_RPC_URL } from "./arbitrum";

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
