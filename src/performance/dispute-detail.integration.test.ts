import { beforeAll, describe, expect, it } from "vitest";
import {
  COURT_ID,
  DEFAULT_CORE_SUBGRAPH_URL,
  fetchCourtDisputes,
} from "../disputes/court-subgraph";
import { postSubgraphDocument } from "../disputes/subgraph";
import { SOURCES } from "../read-failure";
import { namesADispute, type RawDisputeDetail, toDisputeDetail } from "./dispute-detail";
import { fetchDisputeDetail } from "./dispute-detail-subgraph";

/**
 * Live against Goldsky, held out of `yarn test` — run with `yarn test:integration`.
 *
 * The fixture in `dispute-detail.test.ts` is one dispute captured on one day and cannot notice
 * a renamed field or an entity that stops existing. What this suite is really for is the
 * **evidence-count join**, which is the one thing on the per-dispute view that rests on an
 * assumption rather than on a schema: the deployed core subgraph carries no link from a
 * dispute to its evidence, so the count is read from the `ClassicEvidenceGroup` sharing the
 * dispute's id. A fixture can never test that, because a fixture is what the assumption
 * produced.
 *
 * One read of the court in `beforeAll`, shared. Court 34 is on the same Goldsky host as every
 * other subgraph read here and is not the rate-limited endpoint — but the discipline is the
 * one `CLAUDE.md` records for Arbitrum, and a suite that read the court once per test would be
 * the first place to forget it.
 */

let disputeIds: number[] = [];

beforeAll(async () => {
  const disputes = await fetchCourtDisputes();
  disputeIds = disputes.map((dispute) => Number(dispute.disputeID)).sort((a, b) => a - b);
}, 30_000);

describe("fetchDisputeDetail", () => {
  it("reads one dispute's ballot, evidence and prose from the keyless default endpoint", async () => {
    const raw = await fetchDisputeDetail({ disputeId: 156, url: DEFAULT_CORE_SUBGRAPH_URL });
    const detail = toDisputeDetail(raw);

    expect(namesADispute(raw)).toBe(true);
    // Dispute 156 is finalised: its ballot, its evidence and its prose are fixed for ever.
    expect(detail.ballot).toEqual([
      { choice: 0, votes: 1 },
      { choice: 1, votes: 0 },
      { choice: 2, votes: 4 },
    ]);
    expect(detail.justifications).toHaveLength(4);
  }, 30_000);

  it("still carries the prose on the justification's reference field", async () => {
    // The only place a justification's text exists. `ClassicVote` carries a choice and a
    // boolean and no prose at all.
    const raw = await fetchDisputeDetail({ disputeId: 156 });
    const references = (raw.draws ?? []).map((draw) => draw.vote?.justification?.reference);

    expect(references.filter((reference) => typeof reference === "string").length).toBe(5);
  }, 30_000);

  it("finds the justification dispute 156 published empty, which is not a missing one", async () => {
    const detail = toDisputeDetail(await fetchDisputeDetail({ disputeId: 156 }));
    const empty = detail.justifications.filter((published) => published.justification.length === 0);

    expect(empty).toHaveLength(1);
  }, 30_000);

  it("answers with no dispute rather than an error for an id the court does not hold", async () => {
    // `/disputes/9999` must be a real route saying its id names nothing, not a banner about
    // an endpoint that is perfectly healthy.
    const raw = await fetchDisputeDetail({ disputeId: 999_999 });

    expect(namesADispute(raw)).toBe(false);
  }, 30_000);

  it("stays far below the draw ceiling the query asks for", async () => {
    // The read takes the largest panel in one page rather than paging. That is safe because a
    // round is small, and it is a bound rather than a promise: a payload reaching it would
    // silently drop draws. The largest panel in this court is five.
    const raw = await fetchDisputeDetail({ disputeId: 156 });

    expect((raw.draws ?? []).length).toBeLessThan(50);
  }, 30_000);
});

describe("the evidence count", () => {
  /**
   * The assumption, stated as a query.
   *
   * `nextEvidenceIndex` is a counter the mapping increments after each submission, and
   * `evidenceIndex` on the entities is one-based, so the two coincide — but only that is what
   * makes a single number safe to read in place of a list that could come back short. If the
   * mapping ever changes, this is where it surfaces, rather than in a figure on a public page.
   */
  it("counts the same submissions the evidence entities do", async () => {
    const data = await postSubgraphDocument({
      url: DEFAULT_CORE_SUBGRAPH_URL,
      query: `
        query($ids: [ID!]!) {
          groups: classicEvidenceGroups(first: 200, where: { id_in: $ids }) {
            id
            nextEvidenceIndex
          }
          evidences: classicEvidences(first: 500, where: { evidenceGroup_in: $ids }) {
            id
            evidenceGroup { id }
          }
        }
      `,
      variables: { ids: disputeIds.map(String) },
      source: SOURCES.core,
    });

    const groups = data.groups as { id: string; nextEvidenceIndex: string }[];
    const evidences = data.evidences as { evidenceGroup: { id: string } }[];

    // Every dispute the court holds has a group under its own id. The moment one does not,
    // the view's evidence slot starts reading "Submissions not read" — which is correct, and
    // this is where the reason for it would be found.
    expect(groups).toHaveLength(disputeIds.length);

    const counted = new Map<string, number>();
    for (const evidence of evidences) {
      const id = evidence.evidenceGroup.id;
      counted.set(id, (counted.get(id) ?? 0) + 1);
    }

    for (const group of groups) {
      expect(Number(group.nextEvidenceIndex)).toBe(counted.get(group.id) ?? 0);
    }
  }, 30_000);

  it("belongs to the dispute it is read under, checked against that dispute's own periods", async () => {
    // The join has no schema behind it, so this is the check that it is not simply a
    // coincidence of ids: every submission in the group has to fall inside the evidence
    // period of the dispute whose number it shares. Evidence arriving before the dispute
    // exists or after its panel voted would mean the group belongs to something else.
    const data = await postSubgraphDocument({
      url: DEFAULT_CORE_SUBGRAPH_URL,
      query: `
        query($court: String!, $ids: [ID!]!) {
          disputes(first: 200, where: { court: $court }) {
            disputeID
            externalDisputeId
            createdAt
            rounds { timeline }
          }
          evidences: classicEvidences(first: 500, where: { evidenceGroup_in: $ids }) {
            timestamp
            evidenceGroup { id }
          }
        }
      `,
      variables: { court: COURT_ID, ids: disputeIds.map(String) },
      source: SOURCES.core,
    });

    const disputes = data.disputes as {
      disputeID: string;
      externalDisputeId: string;
      createdAt: string;
      rounds: { timeline: string[] }[];
    }[];
    const evidences = data.evidences as { timestamp: string; evidenceGroup: { id: string } }[];

    const byId = new Map(disputes.map((dispute) => [dispute.disputeID, dispute]));

    // The guard the model applies before believing any count. It has held for every dispute
    // this court has ever produced; the day it stops, the count goes unread rather than wrong.
    for (const dispute of disputes) {
      expect(dispute.externalDisputeId).toBe(dispute.disputeID);
    }

    expect(evidences.length).toBeGreaterThan(0);
    for (const evidence of evidences) {
      const dispute = byId.get(evidence.evidenceGroup.id);
      expect(dispute, `evidence group ${evidence.evidenceGroup.id} has no dispute`).toBeDefined();
      if (dispute === undefined) continue;

      const at = Number(evidence.timestamp);
      const createdAt = Number(dispute.createdAt);
      const commitOpenedAt = Number(dispute.rounds[0]?.timeline[0] ?? 0);

      // An hour either side, because a submission can land in the same block window as the
      // dispute's creation and a dispute can sit in `evidence` for as long as nobody passes
      // the period. What this rules out is a group belonging to a different dispute entirely.
      expect(at).toBeGreaterThan(createdAt - 3600);
      if (commitOpenedAt > 0) expect(at).toBeLessThan(commitOpenedAt + 3600);
    }
  }, 30_000);
});

describe("the per-dispute read against every dispute the court holds", () => {
  it("models the newest dispute without throwing, whatever period it is in", async () => {
    // The trap `CLAUDE.md` records in its general form: any assertion quantified over "every
    // dispute the court holds" expires the moment a dispute arrives in a state nobody had
    // seen. Disputes 167 to 169 landed in `evidence` with no panel and an all-zero timeline.
    const newest = disputeIds[disputeIds.length - 1];
    expect(newest).toBeDefined();

    const raw: RawDisputeDetail = await fetchDisputeDetail({ disputeId: newest as number });
    const detail = toDisputeDetail(raw);

    expect(namesADispute(raw)).toBe(true);
    // No assertion on what is in it: a dispute still in its evidence period has no panel, no
    // ballot to speak of and no prose, and every one of those is a fact rather than a gap.
    expect(Array.isArray(detail.ballot)).toBe(true);
    expect(Array.isArray(detail.justifications)).toBe(true);
  }, 30_000);
});
