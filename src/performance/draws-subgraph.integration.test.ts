import { describe, expect, it } from "vitest";
import {
  COURT_ID,
  DEFAULT_CORE_SUBGRAPH_URL,
  fetchCourtDisputes,
} from "../disputes/court-subgraph";
import { ROSTER } from "../roster/agent-jurors";
import { fetchCommitCasts } from "./commit-logs";
import { fetchCourtDraws } from "./draws-subgraph";
import { buildCourtPerformance } from "./performance";

/**
 * Live against Goldsky, held out of `yarn test` — run with `yarn test:integration`.
 *
 * The fixture in `performance.test.ts` is a snapshot and cannot notice a renamed field, a
 * changed interface or a dispute kit that stops being classic. This asserts that what the
 * endpoint returns today still builds a model, and nothing here is stubbed.
 *
 * It asserts no draw count and no upper dispute ID: draws accumulate continually, and a test
 * pinned to "76 vote IDs" would fail for being right.
 */
describe("fetchCourtDraws", () => {
  it("reads the court's drawn vote IDs from the keyless default endpoint", async () => {
    const draws = await fetchCourtDraws({ url: DEFAULT_CORE_SUBGRAPH_URL, courtId: COURT_ID });

    expect(draws.length).toBeGreaterThanOrEqual(76);
  }, 30_000);

  it("returns rows carrying the fields every measurement depends on", async () => {
    const draws = await fetchCourtDraws();

    for (const draw of draws) {
      expect(draw.id).toMatch(/^\d+-\d+-\d+$/);
      expect(draw.juror.id).toMatch(/^0x[0-9a-f]{40}$/);
      expect(draw.round.id).toMatch(/^\d+-\d+$/);
    }
  }, 30_000);

  it("still reports the reveal moment on the justification and not on the vote", async () => {
    // ADR-0004: `ClassicVote.commited` is a boolean, and the only timestamp the subgraph
    // carries for a draw is the one on its justification. If that ever changed, every
    // reveal latency on the page would silently become null.
    const revealed = (await fetchCourtDraws()).filter((draw) => draw.vote?.voted === true);

    expect(revealed.length).toBeGreaterThan(0);
    for (const draw of revealed) {
      expect(draw.vote?.justification?.timestamp).toMatch(/^\d+$/);
    }
  }, 30_000);

  it("builds a model out of what the three live reads return together", async () => {
    const [disputes, draws, commits] = await Promise.all([
      fetchCourtDisputes(),
      fetchCourtDraws(),
      fetchCommitCasts(),
    ]);
    // `parameters: null` and not a fourth read. The whole live run shares one endpoint that
    // rate-limits per RPC *call*, and adding the parameter scan here returned HTTP 429 —
    // surfaced by viem as `UnknownRpcError: Cannot read properties of undefined`, the exact
    // shape `docs/knowledge/chain-and-subgraph.md` records. `court-parameters.integration.test.ts` builds the model
    // with a live history; nothing this suite asserts is about a window.
    const result = buildCourtPerformance({
      disputes,
      draws,
      commits,
      parameters: null,
      // And the payouts are not read either: `rewards-subgraph.integration.test.ts` reads them
      // live, and nothing this suite asserts is about what an agent juror earned.
      rewards: null,
      roster: ROSTER,
      drawsReadAt: null,
    });

    if (!result.success) throw new Error(`${result.code}: ${result.message}`);

    // Dispute 155's panel of one and dispute 151's two-agent panel are quoted throughout the
    // docs and the canvas. Their disappearance would mean the court, the subgraph or the
    // deployment had changed under us.
    const rowFor = (id: number) => result.data.rows.find((row) => row.dispute.id === id);

    expect(rowFor(155)?.panelSize).toBe(1);
    expect(rowFor(151)?.panelSize).toBe(2);
  }, 60_000);
});
