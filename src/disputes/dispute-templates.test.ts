import { describe, expect, it } from "vitest";
import { templateFor, templateIdsOf, toDisputeTemplates } from "./dispute-templates";

/** A DRT row, with `templateData` given as the object it is a JSON string of. */
function raw(id: string, data: unknown) {
  return { id, templateData: JSON.stringify(data) };
}

describe("toDisputeTemplates", () => {
  it("reads the title and the category a template carries", () => {
    const templates = toDisputeTemplates([
      raw("161", {
        title: "Wrong Artistic Style in AI-Generated Painting",
        category: "Image Generation",
      }),
    ]);

    expect(templates.get(161)).toEqual({
      title: "Wrong Artistic Style in AI-Generated Painting",
      category: "Image Generation",
      question: "",
      answers: [],
    });
  });

  it("keys by the numeric template id, which is not the dispute id", () => {
    // Court 34's dispute 151 resolves through template 161 and dispute 152 through 163.
    // The offset is neither zero nor constant, so the key has to be the template's own.
    const templates = toDisputeTemplates([raw("161", { title: "A" }), raw("163", { title: "B" })]);

    expect([...templates.keys()]).toEqual([161, 163]);
  });

  it("reads a template that carries no category as having none", () => {
    // Dispute 159's template does exactly this today: `category` is present and empty.
    const templates = toDisputeTemplates([raw("170", { title: "A title", category: "" })]);

    expect(templates.get(170)).toEqual({
      title: "A title",
      category: "",
      question: "",
      answers: [],
    });
  });

  it("treats a missing field as absent rather than as the string 'undefined'", () => {
    const templates = toDisputeTemplates([raw("161", { title: "Only a title" })]);

    expect(templates.get(161)).toEqual({
      title: "Only a title",
      category: "",
      question: "",
      answers: [],
    });
  });

  it("treats a field that is not a string as absent", () => {
    // Nothing validates templateData before it is published, so a number or an object
    // in either slot is a shape this has to survive rather than render.
    const templates = toDisputeTemplates([
      raw("161", { title: 42, category: { name: "x" }, question: [], answers: "0x1" }),
    ]);

    expect(templates.get(161)).toEqual({
      title: "",
      category: "",
      question: "",
      answers: [],
    });
  });

  it("collapses the whitespace inside a title to keep it one line", () => {
    // One live template's title carries two literal tabs. The row renders on a single
    // line, so leaving them in means a gap mid-sentence — and the hover text keeps them
    // verbatim, where nothing collapses them at all.
    const templates = toDisputeTemplates([raw("17", { title: "  A\t\ttitle \n split " })]);

    expect(templates.get(17)?.title).toBe("A title split");
  });

  it("skips a template whose data is not JSON, and keeps the rest of the batch", () => {
    const templates = toDisputeTemplates([
      { id: "161", templateData: "{not json" },
      raw("163", { title: "Still read" }),
    ]);

    expect(templates.has(161)).toBe(false);
    expect(templates.get(163)?.title).toBe("Still read");
  });

  it("skips template data that is valid JSON but not an object", () => {
    const templates = toDisputeTemplates([raw("161", null), raw("163", [1, 2]), raw("165", 42)]);

    expect(templates.size).toBe(0);
  });

  it("reads the question the panel was actually asked", () => {
    const templates = toDisputeTemplates([
      raw("163", {
        title: "Alleged Plagiarism in an Original Commissioned Article",
        question: "Did the seller's delivered work substantially comply?",
      }),
    ]);

    expect(templates.get(163)?.question).toBe(
      "Did the seller's delivered work substantially comply?",
    );
  });

  it("reads the named choices, turning each hex id into its choice number", () => {
    // The live shape, from template 163: the id is hex with the prefix, and the choice
    // number is what the chain's `currentRuling` will be compared against.
    const templates = toDisputeTemplates([
      raw("163", {
        answers: [
          { id: "0x1", title: "Refund the buyer", description: "…" },
          { id: "0x2", title: "Pay the seller", description: "…" },
        ],
      }),
    ]);

    expect(templates.get(163)?.answers).toEqual([
      { choice: 1, title: "Refund the buyer" },
      { choice: 2, title: "Pay the seller" },
    ]);
  });

  it("orders the choices by number rather than by how the template listed them", () => {
    const templates = toDisputeTemplates([
      raw("163", {
        answers: [
          { id: "0x2", title: "Second" },
          { id: "0xa", title: "Tenth" },
          { id: "0x1", title: "First" },
        ],
      }),
    ]);

    expect(templates.get(163)?.answers.map((answer) => answer.choice)).toEqual([1, 2, 10]);
  });

  it("drops an answer whose id it cannot read, and keeps the rest", () => {
    // A mis-parsed id would put one choice's name against another choice's votes, which is
    // worse on a ruling card than no name at all. Nothing validates this data before it is
    // published, so every one of these is a shape to survive.
    const templates = toDisputeTemplates([
      raw("163", {
        answers: [
          { id: "1", title: "Decimal" },
          { id: 2, title: "Not a string" },
          { id: "0xzz", title: "Not hex" },
          { title: "No id at all" },
          "not an object",
          null,
          { id: "0x3", title: "Kept" },
        ],
      }),
    ]);

    expect(templates.get(163)?.answers).toEqual([{ choice: 3, title: "Kept" }]);
  });

  it("keeps the first of two answers claiming the same choice", () => {
    const templates = toDisputeTemplates([
      raw("163", {
        answers: [
          { id: "0x1", title: "First" },
          { id: "0x1", title: "Second" },
        ],
      }),
    ]);

    expect(templates.get(163)?.answers).toEqual([{ choice: 1, title: "First" }]);
  });

  it("reads an answer with no title as a choice that is named nothing", () => {
    // Distinct from an answer that was dropped: this choice exists on the ballot and the
    // ruling card must still list it and its votes. It simply has no words to print.
    const templates = toDisputeTemplates([raw("163", { answers: [{ id: "0x1" }] })]);

    expect(templates.get(163)?.answers).toEqual([{ choice: 1, title: "" }]);
  });

  it("skips a template whose id is not a canonical decimal", () => {
    // Unlike the core subgraph's fields, a malformed template id is not fatal: a title
    // is decoration on a row that already stands on its dispute ID, so the batch keeps
    // going rather than taking the dispute list down with it.
    const templates = toDisputeTemplates([
      { id: "16 1", templateData: '{"title":"Dropped"}' },
      raw("163", { title: "Kept" }),
    ]);

    expect(templates.size).toBe(1);
    expect(templates.get(163)?.title).toBe("Kept");
  });
});

describe("templateIdsOf", () => {
  it("collects the ids the disputes need, without the ones they do not have", () => {
    const ids = templateIdsOf([{ templateId: 177 }, { templateId: null }, { templateId: 161 }]);

    expect(ids).toEqual([161, 177]);
  });

  it("deduplicates, so two disputes sharing a template are asked for once", () => {
    expect(templateIdsOf([{ templateId: 161 }, { templateId: 161 }])).toEqual([161]);
  });

  it("orders the ids, so the same disputes always produce the same query key", () => {
    // This is a react-query key. Were it a function of arrival order rather than of the
    // set of disputes held, every reordered response would refetch every title.
    const ascending = templateIdsOf([{ templateId: 161 }, { templateId: 177 }]);
    const descending = templateIdsOf([{ templateId: 177 }, { templateId: 161 }]);

    expect(ascending).toEqual(descending);
  });

  it("asks for nothing when no dispute has a template", () => {
    expect(templateIdsOf([{ templateId: null }])).toEqual([]);
  });
});

describe("templateFor", () => {
  const templates = toDisputeTemplates([raw("161", { title: "Found", category: "Image" })]);

  it("finds the template a dispute joins to", () => {
    expect(templateFor(templates, { templateId: 161 })?.title).toBe("Found");
  });

  it("has nothing for a dispute with no template", () => {
    expect(templateFor(templates, { templateId: null })).toBeUndefined();
  });

  it("has nothing for a template the subgraph did not return", () => {
    // Asking for an id that has no template is not an error at the endpoint — it simply
    // does not come back — so this is the ordinary shape of a missing title.
    expect(templateFor(templates, { templateId: 999 })).toBeUndefined();
  });
});
