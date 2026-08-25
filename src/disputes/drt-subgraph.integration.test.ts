import { describe, expect, it } from "vitest";
import { fetchCourtDisputes } from "./court-subgraph";
import { templateFor, templateIdsOf, toDisputeTemplates } from "./dispute-templates";
import { toDisputes } from "./disputes";
import { DEFAULT_DRT_SUBGRAPH_URL, fetchDisputeTemplates } from "./drt-subgraph";

/**
 * Live against Goldsky, held out of `yarn test` — run with `yarn test:integration`.
 *
 * What it is for: the parsing tests work from captured payloads, so they cannot notice
 * that `templateData` has stopped being JSON, that `title` has been renamed, or that the
 * core subgraph has dropped `templateId` and severed the join. Nothing here is stubbed.
 *
 * It asserts no dispute count and no template id beyond the two the docs are written
 * against. New disputes arrive continually, and a test pinned to today's court would
 * fail for being right.
 */
describe("fetchDisputeTemplates", () => {
  it("resolves a title for the disputes the court currently holds", async () => {
    const disputes = toDisputes(await fetchCourtDisputes());
    const ids = templateIdsOf(disputes);

    expect(ids.length).toBeGreaterThanOrEqual(16);

    const templates = toDisputeTemplates(
      await fetchDisputeTemplates({ ids, url: DEFAULT_DRT_SUBGRAPH_URL }),
    );

    // Not every dispute need resolve — the row is built to survive one that does not —
    // but a wholesale failure of the join would show up here as an empty map.
    const titled = disputes.filter((dispute) => templateFor(templates, dispute)?.title);

    expect(titled.length).toBeGreaterThanOrEqual(16);
  }, 30_000);

  it("still holds the templates the design and the docs were written against", async () => {
    const templates = toDisputeTemplates(await fetchDisputeTemplates({ ids: [161, 163] }));

    // Dispute 151's template and dispute 152's. 151 is the dispute with the 8-hour commit
    // window and the offset between the two ids is not constant, so this also asserts the
    // join is still the one the model computes.
    expect(templates.get(161)?.title).toBe("Wrong Artistic Style in AI-Generated Painting");
    expect(templates.get(161)?.category).toBe("Image Generation");
    expect(templates.get(163)?.category).toBe("Agentic Commerce");
  }, 30_000);

  it("returns nothing rather than failing for a template id that does not exist", async () => {
    // The tolerance the row rendering assumes: an id with no template is not an error at
    // the endpoint, it simply does not come back.
    const templates = toDisputeTemplates(await fetchDisputeTemplates({ ids: [161, 99_999_999] }));

    expect(templates.has(161)).toBe(true);
    expect(templates.has(99_999_999)).toBe(false);
  }, 30_000);

  it("asks for templates by exact id, which a range query would get wrong", async () => {
    // `id` is a GraphQL `ID` and The Graph compares it as a string, so a range starting
    // at "161" also matches "2" and "17". This asserts the query does not drag those in.
    const templates = toDisputeTemplates(await fetchDisputeTemplates({ ids: [161] }));

    expect([...templates.keys()]).toEqual([161]);
  }, 30_000);

  it("makes no request at all when there is nothing to ask for", async () => {
    expect(await fetchDisputeTemplates({ ids: [], url: "http://127.0.0.1:1/unreachable" })).toEqual(
      [],
    );
  });
});
