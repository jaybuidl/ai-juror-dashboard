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
 * What a dispute row shows about itself once its template resolves.
 *
 * Both fields are plain strings and both may be empty, which the row treats as "no
 * value" rather than rendering. `""` is not hypothetical: dispute 159's template carries
 * an empty `category` today.
 */
export type DisputeTemplate = {
  title: string;
  category: string;
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

    const { title, category } = data as Record<string, unknown>;

    templates.set(Number(template.id), {
      title: toText(title),
      category: toText(category),
    });
  }

  return templates;
}
