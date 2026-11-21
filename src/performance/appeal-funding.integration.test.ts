import { parseAbi } from "viem";
import { describe, expect, it } from "vitest";
import { LOSER_STAKE_MULTIPLIER, WINNER_STAKE_MULTIPLIER } from "./appeal-funding";
import { createArbitrumClient, DEFAULT_ARBITRUM_RPC_URL } from "./arbitrum";
import { DISPUTE_KIT_CLASSIC } from "./commit-logs";

/**
 * Live against Arbitrum One, held out of `yarn test` — run with `yarn test:integration`.
 *
 * The appeal fee each side owes (#32) is worked out from two multipliers this repository holds as
 * constants. They are `constant` in the kit's implementation, but the kit is an upgradable proxy,
 * so an upgrade could change them with no event this dashboard reads, and every "0.0059 of 0.0089"
 * on the dispute page would then be wrong without failing anything. Red here means: read the new
 * implementation's `fundAppeal` before changing the numbers, since the rule may have moved too.
 *
 * Three calls, batched by nothing: the public endpoint counts each one.
 */
describe("DisputeKitClassic's appeal fee multipliers", () => {
  it("are the ones the dispute page prices each side with", async () => {
    const client = createArbitrumClient(DEFAULT_ARBITRUM_RPC_URL);
    const read = (
      functionName: "WINNER_STAKE_MULTIPLIER" | "LOSER_STAKE_MULTIPLIER" | "ONE_BASIS_POINT",
    ) =>
      client.readContract({
        address: DISPUTE_KIT_CLASSIC,
        abi: parseAbi([
          "function WINNER_STAKE_MULTIPLIER() view returns (uint256)",
          "function LOSER_STAKE_MULTIPLIER() view returns (uint256)",
          "function ONE_BASIS_POINT() view returns (uint256)",
        ]),
        functionName,
      });

    expect(await read("WINNER_STAKE_MULTIPLIER")).toBe(WINNER_STAKE_MULTIPLIER);
    expect(await read("LOSER_STAKE_MULTIPLIER")).toBe(LOSER_STAKE_MULTIPLIER);
    expect(await read("ONE_BASIS_POINT")).toBe(10_000n);
  }, 60_000);
});
