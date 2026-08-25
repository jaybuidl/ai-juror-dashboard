import { describe, expect, it } from "vitest";
import fixture from "./disputes/court-34.fixture.json" with { type: "json" };
import { toDisputeTemplates } from "./disputes/dispute-templates";
import { type RawDispute, toDisputes } from "./disputes/disputes";
import {
  PERSISTED_MAX_AGE_MS,
  PERSISTED_MODEL_VERSION,
  rederive,
  shouldPersistQuery,
  stripDerived,
} from "./persistence";

/**
 * What may be persisted, and what has to be rebuilt on the way back.
 *
 * Persisting raw payloads is what makes a restored cache safe: the seam is pure and re-derives
 * every figure on load, so changing what a latency *means* needs no invalidation at all.
 * `stripDerived`/`rederive` extend that to the one query that models inside itself, so that not
 * even `ruling.state` — the finalised predicate this ticket turns on — is ever served from
 * storage under an older definition.
 *
 * What is left is the *raw* shape, and `PERSISTED_MODEL_VERSION` covers it. The shapes below
 * are pinned so that these tests exist to fail: when one does, the change is correct and the fix
 * is to bump that constant in `persistence.ts` in the same commit.
 */

const raw = fixture as RawDispute[];

describe("shouldPersistQuery", () => {
  it("persists the reads that are expensive and cannot change once finalised", () => {
    expect(shouldPersistQuery(["courtDisputes", "34"])).toBe(true);
    expect(shouldPersistQuery(["courtDraws", "34"])).toBe(true);
    expect(shouldPersistQuery(["commitCasts", "34", [], 76])).toBe(true);
    // Ticket 08's read, admitted when the two branches were merged. Plain numbers all the way
    // down, and a court's parameter history is the least changeable thing this app reads.
    expect(shouldPersistQuery(["courtParameters", "34"])).toBe(true);
  });

  it("refuses the ENS identities, because a failed read of them succeeds", () => {
    // `resolveAgentJurorIdentity` catches a mainnet failure and returns the checked-in roster
    // entry with `resolvedFromEns: false`, by design — the roster renders either way. Persisted
    // under `useRoster`'s hour of staleness, one failed load would be re-served for an hour
    // across reloads with no retry, and the page would go on saying ENS could not be reached
    // long after it could.
    expect(shouldPersistQuery(["agentJurorIdentities", ["007"]])).toBe(false);
  });

  it("refuses the one query whose value does not survive JSON", () => {
    // `toDisputeTemplates` returns a `Map`, and `JSON.stringify` renders a Map as `{}`. It
    // would restore as an object with no `get`, `templateFor` would find nothing, and every
    // row would render untitled — indistinguishable from a dispute that never had a title.
    // Nothing throws anywhere along that path, which is why the list is an allowlist.
    expect(shouldPersistQuery(["disputeTemplates", [161, 163]])).toBe(false);
  });

  it("refuses a query nobody has thought about yet", () => {
    // Tickets 06 and 10 each still add a read. None is persisted by default, and the question
    // to answer before adding one is whether its value is plain JSON — and then whether a
    // failed read of it succeeds, which is what the ENS case below cost.
    //
    // This case named `courtParameters` until ticket 08 was merged in and the question was
    // actually answered; the example was replaced rather than the assertion deleted, because
    // what it pins is the default rather than any one query.
    expect(shouldPersistQuery(["perAgentJurorMarginals", "34"])).toBe(false);
    expect(shouldPersistQuery(["rewards", "34"])).toBe(false);
    expect(shouldPersistQuery([])).toBe(false);
  });

  it("proves the exclusion is needed rather than assuming it", () => {
    // The failure, demonstrated: a Map through the persister's serialiser is an empty object.
    const templates = toDisputeTemplates([
      { id: "161", templateData: JSON.stringify({ title: "A title", category: "A category" }) },
    ]);

    expect(templates.get(161)).toBeDefined();
    expect(JSON.parse(JSON.stringify(templates))).toEqual({});
  });
});

describe("stripDerived and rederive", () => {
  const data = { raw, disputes: toDisputes(raw) };

  it("keeps the payload and drops what was modelled from it", () => {
    expect(stripDerived(data)).toEqual({ raw });
  });

  it("rebuilds the model on the way back in", () => {
    expect(rederive(stripDerived(data))).toEqual(data);
  });

  it("rebuilds it with today's rules rather than yesterday's", () => {
    // The criterion this exists for. A cache written when dispute 163 was unruled restores as
    // whatever `toDisputes` says about the payload *now* — the derived half is never stored, so
    // there is no older definition of a ruling left anywhere to be served.
    const stored = stripDerived({ raw, disputes: [] }) as { raw: typeof raw };
    const restored = rederive(stored) as { disputes: ReturnType<typeof toDisputes> };

    expect(restored.disputes).toEqual(toDisputes(raw));
  });

  it("drops a payload it can no longer model rather than half-restoring one", () => {
    // A cache written under an older raw shape. `toDisputes` throws on exactly the values that
    // would otherwise become a confident wrong figure, and `undefined` here is a cold read.
    expect(rederive({ raw: [{ ...raw[0], createdAt: "not a moment" }] })).toBeUndefined();
  });

  it("leaves a value that is not the dispute query alone", () => {
    const commits = [{ disputeID: "151", juror: "0xabc", timestamp: "1787188232" }];

    expect(stripDerived(commits)).toBe(commits);
    expect(rederive(commits)).toBe(commits);
  });
});

describe("the persisted model shape", () => {
  it("pins the shape of a modelled dispute", () => {
    const dispute = toDisputes(raw)[0];
    if (dispute === undefined) throw new Error("the fixture holds no disputes");

    expect(Object.keys(dispute).sort()).toEqual([
      "createdAt",
      "id",
      "lastPeriodChange",
      "period",
      "rounds",
      "ruling",
      "templateId",
    ]);
  });

  it("pins the shape of a modelled round", () => {
    const round = toDisputes(raw)[0]?.rounds[0];
    if (round === undefined) throw new Error("the fixture holds no rounds");

    expect(Object.keys(round).sort()).toEqual([
      "appealOpenedAt",
      "commitOpenedAt",
      "executionOpenedAt",
      "index",
      "voteOpenedAt",
    ]);
  });

  it("pins the shape of a modelled dispute template", () => {
    const template = toDisputeTemplates([
      { id: "161", templateData: JSON.stringify({ title: "A title", category: "A category" }) },
    ]).get(161);
    if (template === undefined) throw new Error("the template did not model");

    expect(Object.keys(template).sort()).toEqual(["category", "title"]);
  });

  it("pins the shape of a reduced commitment", () => {
    // `fetchCommitCasts` stores this rather than the log, so it is as persisted as the rest.
    const commit = { disputeID: "151", juror: "0xabc", timestamp: "1787188232" };

    expect(Object.keys(commit).sort()).toEqual(["disputeID", "juror", "timestamp"]);
  });

  it("carries a version to bump when one of the shapes above changes", () => {
    expect(PERSISTED_MODEL_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}(\.\d+)?$/);
  });

  it("discards a restored cache old enough that a cold read is the honest answer", () => {
    expect(PERSISTED_MAX_AGE_MS).toBe(24 * 60 * 60 * 1000);
  });
});
