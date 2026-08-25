import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ThemeProvider } from "styled-components";
import { describe, expect, it } from "vitest";
import { fetchCourtDisputes } from "../disputes/court-subgraph";
import { isFinalised } from "../disputes/liveness";
import { ROSTER } from "../roster/agent-jurors";
import { rosterIdentity } from "../roster/ens";
import type { RosterView } from "../roster/useRoster";
import { theme } from "../styles/theme";
import { fetchCourtDraws } from "./draws-subgraph";
import { Matrix } from "./Matrix";
import { buildCourtPerformance } from "./performance";

/**
 * Live against Goldsky and Arbitrum, held out of `yarn test`.
 *
 * What it is for: every fixture in this repository is one capture of one court, and ticket 12's
 * whole subject is a court that is still moving. The live states have no example in the
 * historical record — the canvas says so of its own illustrative row — so a fixture cannot
 * prove that the treatment reaches the disputes it is for.
 *
 * It asserts a **correspondence**, never a count. "There is at least one live dispute" would be
 * a true assertion today and a failing one the week the court finishes everything it holds,
 * which is the shape `CLAUDE.md` warns expires: anything quantified over what the court happens
 * to contain. What is asserted instead holds at every court state including an empty one — that
 * the rows the model calls unfinalised are exactly the rows wearing the flag.
 */

const roster: RosterView = {
  entries: ROSTER.map((agentJuror) => ({ agentJuror, identity: rosterIdentity(agentJuror) })),
  isResolving: false,
  isResolvedFromEns: false,
};

/** A fixed present, so an elapsed figure cannot change between the render and the assertion. */
const NOW = Date.UTC(2026, 7, 25, 12, 0, 0);

describe("the live treatment, against the court as it stands", () => {
  it("flags exactly the disputes the court has not ruled on", async () => {
    const [disputes, draws] = await Promise.all([fetchCourtDisputes(), fetchCourtDraws()]);
    // No commit scan. Liveness is read from the dispute's ruling and the round's timeline, so
    // the commitments change nothing here — and a third cold scan of every commitment in the
    // court, running beside the two this suite already does, is what puts the whole suite over
    // the endpoint's per-call rate limit. It surfaces as `UnknownRpcError`, not as a 429, which
    // is the trap `CLAUDE.md` records; it cost this test one run to rediscover.
    // `parameters: null` for the same reason, and it is the choice ticket 08 made in
    // `draws-subgraph.integration.test.ts`: the history is two more chain reads, liveness does
    // not depend on which windows a dispute ran under, and `court-parameters.integration.test.ts`
    // exercises the real history on its own. The footnote then words itself as unread, which is
    // what an unread parameter history is.
    const built = buildCourtPerformance({
      disputes,
      draws,
      commits: null,
      parameters: null,
      // Nor the payouts: liveness is about a dispute still being decided, and a dispute still
      // being decided has not been executed and so has no payout to read.
      rewards: null,
      // `drawsReadAt: null` — one live payload is one moment, so every row counts as read.
      roster: ROSTER,
      drawsReadAt: null,
    });
    if (!built.success) throw new Error(`${built.code}: ${built.message}`);

    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <Matrix performance={built.data} roster={roster} now={NOW} />
        </MemoryRouter>
      </ThemeProvider>,
    );

    for (const row of built.data.rows) {
      const header = screen.getByRole("rowheader", {
        name: new RegExp(`^${row.dispute.id}\\b`),
      });
      const flagged = within(header).queryByText(/^Live · /) !== null;

      // The correspondence, both ways. A live dispute with no flag is a court moving with
      // nothing on the page to say so; a finalised one wearing the flag is the page claiming
      // a settled dispute is still being decided.
      expect({ id: row.dispute.id, flagged }).toEqual({
        id: row.dispute.id,
        // A lone panel outranks the live flag for the pill, so the correspondence is only
        // exact where no higher-precedence flag applies. That precedence is the design's,
        // and the row still carries the rail and the tint underneath it.
        flagged: !isFinalised(row.dispute) && row.panelSize !== 1,
      });
    }
  }, 60_000);

  it("names the open period and dates it, for whichever disputes are live now", async () => {
    const disputes = await fetchCourtDisputes();
    const live = disputes.filter((dispute) => !dispute.ruled);
    // Not an assertion that any exist: a court that has finished everything is a real state,
    // and this says nothing about it rather than failing.
    for (const dispute of live) {
      expect(dispute.period).not.toBe("");
      // The moment the flag dates itself from. `0` here would render as a period open since
      // 1970, which is why `periodOpenSeconds` guards it rather than trusting the field.
      expect(Number(dispute.lastPeriodChange)).toBeGreaterThan(0);
    }
  }, 30_000);
});
