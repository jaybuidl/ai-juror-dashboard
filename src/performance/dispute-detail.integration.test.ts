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

/**
 * Every entity a `where` selects, paged on `id`.
 *
 * The first version of this suite asked for `first: 200` groups and `first: 200` disputes, and
 * the court passed 200 disputes in November 2026: the four newest fell off the dispute list, and
 * the first submission to one of them read as evidence belonging to no dispute. A capped read
 * that comes back full throws nothing, so these checks page rather than guess a ceiling.
 */
async function readAll<T extends { id: string }>(
  entity: string,
  where: { declare: string; filter: string },
  selection: string,
  variables: Record<string, unknown>,
): Promise<T[]> {
  const all: T[] = [];
  let cursor = "";
  for (;;) {
    const data = await postSubgraphDocument({
      url: DEFAULT_CORE_SUBGRAPH_URL,
      query: `
        query($first: Int!, $idGt: ID!, ${where.declare}) {
          page: ${entity}(first: $first, where: { ${where.filter}, id_gt: $idGt }, orderBy: id) {
            id
            ${selection}
          }
        }
      `,
      variables: { first: 1000, idGt: cursor, ...variables },
      source: SOURCES.core,
    });
    const page = data.page as T[];
    all.push(...page);
    const last = page[page.length - 1];
    if (page.length < 1000 || last === undefined) return all;
    cursor = last.id;
  }
}

const BY_IDS = (field: string) => ({ declare: "$ids: [ID!]!", filter: `${field}: $ids` });

describe("the evidence count", () => {
  type Group = { id: string; nextEvidenceIndex: string };
  type Evidence = { id: string; timestamp: string; evidenceGroup: { id: string } };

  let groups: Group[] = [];
  let evidences: Evidence[] = [];

  beforeAll(async () => {
    const ids = disputeIds.map(String);
    [groups, evidences] = await Promise.all([
      readAll<Group>("classicEvidenceGroups", BY_IDS("id_in"), "nextEvidenceIndex", { ids }),
      readAll<Evidence>(
        "classicEvidences",
        BY_IDS("evidenceGroup_in"),
        "timestamp evidenceGroup { id }",
        { ids },
      ),
    ]);
  }, 30_000);

  /**
   * The assumption, stated as a query.
   *
   * `nextEvidenceIndex` is a counter the mapping increments after each submission, and
   * `evidenceIndex` on the entities is one-based, so the two coincide — but only that is what
   * makes a single number safe to read in place of a list that could come back short. If the
   * mapping ever changes, this is where it surfaces, rather than in a figure on a public page.
   */
  it("counts the same submissions the evidence entities do", () => {
    const counted = new Map<string, number>();
    for (const evidence of evidences) {
      const id = evidence.evidenceGroup.id;
      counted.set(id, (counted.get(id) ?? 0) + 1);
    }

    expect(groups.length).toBeGreaterThan(0);
    for (const group of groups) {
      expect(Number(group.nextEvidenceIndex), `group ${group.id}`).toBe(counted.get(group.id) ?? 0);
    }
  });

  it("has a group only where something was submitted, so a missing group is a count of zero", () => {
    // The mapping creates a `ClassicEvidenceGroup` in its `Evidence` handler and nowhere else
    // (`ensureClassicEvidenceGroup`), so a dispute nobody submitted to has no group at all rather
    // than an empty one. That is what lets `evidenceCountOf` read an absent group as zero. Twelve
    // of the court's disputes had none on 2026-11-21, and the view said "Submissions not read" on
    // every one of them. The day an empty group appears, the mapping has changed, and an absent
    // group may no longer mean nobody submitted anything.
    for (const group of groups) {
      expect(Number(group.nextEvidenceIndex), `group ${group.id}`).toBeGreaterThan(0);
    }

    const grouped = new Set(groups.map((group) => group.id));
    for (const evidence of evidences) {
      expect(grouped, `evidence ${evidence.id}`).toContain(evidence.evidenceGroup.id);
    }
  });

  it("belongs to the dispute it is read under, checked against that dispute's own periods", async () => {
    // The join has no schema behind it, so this is the check that it is not simply a
    // coincidence of ids: every submission in the group has to fall inside the evidence
    // period of the dispute whose number it shares. Evidence arriving before the dispute
    // exists or after its panel voted would mean the group belongs to something else.
    const disputes = await readAll<{
      id: string;
      disputeID: string;
      externalDisputeId: string;
      createdAt: string;
      rounds: { timeline: string[] }[];
    }>(
      "disputes",
      { declare: "$court: String!", filter: "court: $court" },
      "disputeID externalDisputeId createdAt rounds { timeline }",
      { court: COURT_ID },
    );

    // The same court, read the same way the page reads it. A shortfall here is this read's.
    expect(disputes).toHaveLength(disputeIds.length);

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
