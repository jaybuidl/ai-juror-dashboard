/**
 * What a dispute is about, from the dispute resolver template subgraph.
 *
 * Pure: it touches no network, so it is tested against captured payloads with no mock
 * anywhere. The DRT record is plain JSON in a string field — no IPFS resolution and no
 * Kleros SDK, which is what keeps the Node-only half of agentkit out of this bundle.
 *
 * Every failure here is survivable by construction. A title is decoration on a row that
 * already stands on its core dispute ID, so a template that is missing, malformed or
 * empty drops out of the map and the row renders without it. Contrast `disputes.ts`,
 * which throws on a malformed field: there, a bad value would become a fabricated
 * timestamp or ruling.
 */

/** One template as the DRT subgraph returns it. `templateData` is a JSON string. */
export type RawDisputeTemplate = {
  id: string;
  templateData: string;
};

/**
 * One option on the ballot, as the template names it.
 *
 * The template is the only place a choice has a *name*: the chain carries choice numbers and
 * nothing else, so `currentRuling: 2` is all the court itself says about its own decision.
 * Ticket 09's ruling card names the winning choice "by number and in words", and the words
 * come from here or from nowhere.
 *
 * Choice `0` is deliberately absent from this list, because it is absent from the template's
 * own `answers` array: refusing to arbitrate is always valid and is never enumerated
 * (`CONTEXT.md`). Whatever renders a ballot supplies it.
 */
export type ChoiceLabel = {
  /** The choice number this names. Parsed from the template's hex `id` — `"0x1"` is choice 1. */
  choice: number;
  /** What to call it. May be empty, on the same terms as every other field here. */
  title: string;
};

/**
 * What a dispute shows about itself once its template resolves.
 *
 * Every field is a plain string or a list of them, and every one may be empty — which a row
 * treats as "no value" rather than rendering. `""` is not hypothetical: dispute 159's template
 * carries an empty `category` today.
 *
 * `question` and `answers` are ticket 09's and are read by the per-dispute view alone; the
 * matrix and the dispute index use `title` and `category` exactly as they did. They are parsed
 * here rather than there because nothing validates `templateData` before publication, and one
 * tolerant reader is easier to keep honest than two.
 */
export type DisputeTemplate = {
  title: string;
  category: string;
  /** What the panel was actually asked. Empty where the template carries no question. */
  question: string;
  /** The named choices, ascending. Empty where the template names none. */
  answers: readonly ChoiceLabel[];
};

/** Just enough of a dispute to find its template. */
type HasTemplateId = { templateId: number | null };

/**
 * The template ids a set of disputes needs, deduplicated and ascending.
 *
 * Sorted so the result is a function of which disputes are held and not of the order
 * they arrived in: it is used as a react-query key, and an unstable one would refetch
 * every title each time the list came back in a different order.
 */
export function templateIdsOf(disputes: readonly HasTemplateId[]): number[] {
  const ids = new Set<number>();

  for (const dispute of disputes) {
    if (dispute.templateId !== null) ids.add(dispute.templateId);
  }

  return [...ids].sort((a, b) => a - b);
}

/**
 * The template behind one dispute, if it has one and it resolved.
 *
 * `undefined` covers both a dispute with no template and a template the subgraph did not
 * return — the row renders the same way either way, identified by its dispute ID.
 */
export function templateFor(
  templates: Map<number, DisputeTemplate>,
  dispute: HasTemplateId,
): DisputeTemplate | undefined {
  return dispute.templateId === null ? undefined : templates.get(dispute.templateId);
}

/** Template ids arrive as decimal strings, and only a canonical one is a real id. */
const CANONICAL_DECIMAL = /^(0|[1-9]\d*)$/;

/**
 * One text field, reduced to what can sit on a single line.
 *
 * Anything that is not a string is treated as absent rather than coerced: nothing
 * validates `templateData` before it is published, so a number or an object in either
 * slot is a shape to survive, not one to render. Runs of whitespace collapse to a single
 * space because a title renders on one line and is also carried verbatim into the hover
 * text — one live template holds two literal tabs mid-sentence, which would show as a
 * gap in the first and stay a gap in the second.
 */
function toText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

/**
 * A choice number, as a template writes it: `"0x1"`.
 *
 * Hex with the prefix, which is how every live template in this court spells it. Anything else
 * — a decimal, a number, a missing field — drops the answer rather than guessing, for the same
 * reason `toText` treats a non-string as absent: a mis-parsed id would put one choice's name
 * against another choice's votes, which is worse on a ruling card than no name at all.
 */
const CANONICAL_HEX = /^0x[0-9a-fA-F]{1,8}$/;

/**
 * The named choices a template carries, ascending, with anything unreadable dropped.
 *
 * Ascending by choice rather than in the order the template happens to list them, so a ballot
 * reads 0, 1, 2 down the card whatever the JSON did. Duplicates are dropped on first-wins: two
 * entries claiming the same choice is a template nobody validated, and rendering both would
 * show one choice's votes twice.
 */
function toAnswers(value: unknown): readonly ChoiceLabel[] {
  if (!Array.isArray(value)) return [];

  const byChoice = new Map<number, ChoiceLabel>();

  for (const entry of value) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;

    const { id, title } = entry as Record<string, unknown>;
    if (typeof id !== "string" || !CANONICAL_HEX.test(id)) continue;

    const choice = Number.parseInt(id, 16);
    if (byChoice.has(choice)) continue;

    byChoice.set(choice, { choice, title: toText(title) });
  }

  return [...byChoice.values()].sort((a, b) => a.choice - b.choice);
}

/**
 * The templates for a batch of ids, keyed by template id.
 *
 * Keyed by the template's own id and never by a dispute id: the two are not the same
 * number and the offset between them is not constant — court 34's dispute 151 resolves
 * through template 161, and dispute 152 through 163.
 */
export function toDisputeTemplates(
  raw: readonly RawDisputeTemplate[],
): Map<number, DisputeTemplate> {
  const templates = new Map<number, DisputeTemplate>();

  for (const template of raw) {
    if (!CANONICAL_DECIMAL.test(template.id)) continue;

    let data: unknown;
    try {
      data = JSON.parse(template.templateData);
    } catch {
      continue;
    }

    // `typeof null === "object"`, and an array is an object too. Neither can carry the
    // fields, and both would otherwise reach the property reads below as `undefined`.
    if (typeof data !== "object" || data === null || Array.isArray(data)) continue;

    const { title, category, question, answers } = data as Record<string, unknown>;

    templates.set(Number(template.id), {
      title: toText(title),
      category: toText(category),
      question: toText(question),
      answers: toAnswers(answers),
    });
  }

  return templates;
}
