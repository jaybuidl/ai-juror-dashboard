import { describe, expect, it } from "vitest";
import detailFixture from "./dispute-156-detail.fixture.json" with { type: "json" };
import { languageOf, toJustification } from "./justifications";

/**
 * The prose an agent juror published, and the three things that can be said about it without
 * measuring anything.
 *
 * The cases that matter here are the ones that must not be confused with each other: prose
 * published empty against prose never published, Markdown against a sentence with an asterisk
 * in it, and a language named against a language guessed. Every one of them is a fact about an
 * agent juror's own output on a page that may be cited.
 */

/** A paragraph of English, long enough to clear the detector's floor. */
const ENGLISH = `I read this as a question about what was agreed, not about what was delivered.
The delivery is undisputed: a flat vector portrait, delivered on the agreed date in the agreed
formats. The dispute is entirely about whether the style of that portrait breached a term of the
brief, and I do not think the buyer is being unreasonable in having pictured a different one.
What settles it for me is the preview that was approved in plain words within the hour.`;

/** One of the court's own, from dispute 153. */
const SPANISH = `El encargo original no especifica una técnica ni un estilo pictórico. Menciona un
retrato, un tono cálido y un lugar de la casa donde colgarlo. La compradora introduce la expresión
pintura al óleo recién el 14 de febrero, once días después de haber aprobado la vista previa.
Analizo el caso también a la luz de la ley de defensa del consumidor, porque el proveedor tiene un
deber de información cierta, clara y detallada, pero cuando la vista previa fue aprobada más de una
vez, esa aprobación es el acto propio que resuelve la ambigüedad según las reglas aplicables.`;

describe("toJustification", () => {
  it("keeps prose published empty as an empty justification, not as an absent one", () => {
    const justification = toJustification("");

    // Length zero and a real justification. The absent case is `null` at the call site and
    // never reaches here: a draw that published nothing and a draw that published "" are
    // different facts about different draws, and the column words them differently.
    expect(justification.text).toBe("");
    expect(justification.length).toBe(0);
    expect(justification.form).toEqual({ kind: "plain" });
    expect(justification.lang).toBeNull();
  });

  it("counts length in code points rather than UTF-16 units", () => {
    // The figure is printed beside the prose it describes, so a reader can check it by eye,
    // and `String.length` would count an astral character twice. Every Spanish justification
    // in this court carries accented characters, and half the record is Spanish.
    expect(toJustification("caf\u00e9").length).toBe(4);
    expect(toJustification("\u{1f9d1}").length).toBe(1);
  });

  it("preserves the prose exactly, whitespace and all", () => {
    const raw = "  # Vote: 1\n\n  Leading and trailing space is the agent juror's.  ";
    expect(toJustification(raw).text).toBe(raw);
  });

  describe("form", () => {
    it("calls structural Markdown Markdown", () => {
      for (const markdown of [
        "## Vote: **1 — Refund the buyer**\n\nThe brief named no style.",
        "- The brief named no style\n- The preview was approved",
        "1. Originality was an express term\n2. The delivery breaches it",
        "> The buyer approved the preview within the hour.",
        "```\nevidence.json\n```",
        "| Feed | Value |\n|---|---|\n| A | 4.01 |",
        "The policy is [published here](https://example.org/policy).",
        "This was the **defining requirement** of the commission.",
      ]) {
        expect(toJustification(markdown).form, markdown.slice(0, 24)).toEqual({
          kind: "markdown",
        });
      }
    });

    it("does not call prose Markdown for containing punctuation", () => {
      for (const plain of [
        "The seller delivered a 4096 x 4096 image, which is 2 * 2048.",
        "The buyer paid 900 USDC (see evidence #3) and received nothing.",
        "A 50% refund was offered_and_declined mid-negotiation.",
        "The brief said: warm, something I can hang in the hall.",
      ]) {
        expect(toJustification(plain).form, plain.slice(0, 24)).toEqual({ kind: "plain" });
      }
    });

    it("gives a recognised language the label instead of the format", () => {
      // Spanish *and* Markdown — the language displaces the format rather than joining it,
      // because the footer has room for one fact and this is the more surprising one.
      const spanish = toJustification(`# Voto: **1**\n\n${SPANISH}`);

      expect(spanish.form).toEqual({ kind: "language", language: "es" });
      expect(spanish.lang).toBe("es");
    });
  });
});

describe("languageOf", () => {
  it("names Spanish in the court's own prose", () => {
    expect(languageOf(SPANISH)).toBe("es");
  });

  it("leaves English unnamed rather than calling it a sixth language", () => {
    // English is the absence of a match and not a column of the table: this dashboard's own
    // language needs no detecting, and a false "EN" would be a claim where silence is free.
    expect(languageOf(ENGLISH)).toBeNull();
  });

  it("says nothing about prose too short to test", () => {
    // One function word would otherwise carry a whole label. Dispute 155's justifications are
    // this short in the live record.
    expect(languageOf("El reclamo es válido.")).toBeNull();
  });

  it("declines to choose when two languages score alike", () => {
    // Function words shared across the Romance languages score several columns at once, and
    // the runner-up test is what stops the answer being whichever the table lists first.
    const shared = `una una una una una una una una una una
      ${"word ".repeat(60)}`;

    expect(languageOf(shared)).toBeNull();
  });
});

/**
 * The live record, not a hand-written case.
 *
 * Dispute 156 is the one payload that carries a justification published empty (`156-0-2`),
 * which is the state this module exists to keep apart from an absent one. Reading it from the
 * fixture rather than restating it keeps the pair honest: if the court's own record changes
 * shape, this fails rather than going on asserting a string nobody reads any more.
 */
describe("against the captured court", () => {
  const references = detailFixture.draws.map((draw) => draw.vote?.justification?.reference ?? null);

  it("finds the empty justification dispute 156 actually holds", () => {
    expect(references).toContain("");
  });

  it("reads every one of them without throwing", () => {
    for (const reference of references) {
      if (reference === null) continue;
      const justification = toJustification(reference);

      expect(justification.length).toBe([...reference].length);
      expect(justification.text).toBe(reference);
    }
  });

  it("names the Spanish justification in it", () => {
    // `156-0-0` and `156-0-3` are one draw's two vote IDs, and both are Spanish — the lowest
    // scoring pair in the whole court at 4.0%, which is what makes them worth pinning here.
    const spanish = references.filter(
      (reference) => reference !== null && toJustification(reference).lang === "es",
    );

    expect(spanish.length).toBeGreaterThan(0);
  });
});
