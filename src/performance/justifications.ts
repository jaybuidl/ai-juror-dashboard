/**
 * What an agent juror published with its reveal, and the three things a column says about it.
 *
 * A justification is prose (`CONTEXT.md`): it is carried on the reveal, it is one per draw, it
 * is sometimes absent, sometimes Markdown and not always English. None of those is a failure,
 * and this module's whole job is to keep them from being drawn as one. Pure — it touches no
 * network, reads no clock and renders nothing.
 *
 * The court's own record is `ClassicJustification.reference`, a plain string. Nothing validates
 * it before publication, so every shape here is one to survive rather than one to trust.
 */

/** The scripts this dashboard can put a name to. Latin-script only, which is all the court holds. */
export type Language = "es" | "fr" | "pt" | "de" | "it";

/**
 * How a column labels what it is showing: its length, and then one of these.
 *
 * `markdown` and `plain` are a *format* — what the parser did with it. A language is what it was
 * written in, and it displaces the format in the label rather than joining it, because the
 * footer has room for one fact and "written in Spanish" is the more surprising one.
 * `canvas/Dispute.dc.html:204,233` draws all three: `MD`, `Plain`, `ES`.
 */
export type Form =
  | { kind: "markdown" }
  | { kind: "plain" }
  | { kind: "language"; language: Language };

export type Justification = {
  /**
   * The prose exactly as published, whitespace and all.
   *
   * Never trimmed into absence: `""` is a field somebody published empty, and the column says
   * so in its own words. Trimming it away here would make it indistinguishable from a draw that
   * has no justification at all, which is a different fact about a different draw.
   */
  text: string;
  /** Characters, as the footer counts them. `0` for a justification published empty. */
  length: number;
  /** Whether Markdown structure was found, or a language recognised. See `Form`. */
  form: Form;
  /**
   * The BCP-47 tag for the prose, or `null` where it was not recognised.
   *
   * Set on the rendered element rather than only shown, so a screen reader pronounces a Spanish
   * justification as Spanish and the browser hyphenates it by the right rules. `null` means
   * "not recognised" and not "English": the element then inherits the page's language, which is
   * the honest default for prose nobody identified.
   */
  lang: Language | null;
};

/**
 * Markdown structure, as distinct from prose that happens to contain punctuation.
 *
 * Deliberately structural — a heading, a list, a fence, a table row, a blockquote, a link, or
 * bold/italic emphasis — rather than anything that merely looks like syntax. An asterisk mid
 * sentence is not Markdown, and labelling a plain justification `MD` would misdescribe an agent
 * juror's own output on a page that may be cited.
 *
 * It labels only. The renderer parses *every* justification as Markdown, because CommonMark
 * leaves prose with no structure in it looking exactly like itself — so a wrong answer here
 * costs a two-letter label and never the reading.
 */
const MARKDOWN = [
  /^ {0,3}#{1,6}\s/m, // headings
  /^ {0,3}(?:[-*+]|\d{1,9}[.)])\s/m, // list items
  /^ {0,3}>/m, // block quotes
  /^ {0,3}(?:```|~~~)/m, // fenced code
  /^ {0,3}\|.*\|/m, // GFM table rows
  /\[[^\]\n]+\]\([^)\n]+\)/, // links
  /\*\*[^\s*][^*]*\*\*/, // bold
  /(?:^|[\s(])_[^\s_][^_]*_(?:$|[\s).,;:!?])/, // italic, underscore form
];

function looksMarkdown(text: string): boolean {
  return MARKDOWN.some((pattern) => pattern.test(text));
}

/**
 * Function words that only really occur in one of these languages.
 *
 * Chosen to be *unambiguous between the five*, not to be the commonest words in each: "de" is
 * the top word in Spanish, French and Portuguese at once, and counting it would score every
 * Romance justification for all three. Every entry here is a word whose presence is evidence
 * for exactly one column of this table.
 *
 * Accent-bearing forms are matched as written. The prose in this court carries its accents —
 * `153-0-3` opens "Voto: 1 — Aceptar el reclamo" — and a stripped-accent variant is not a
 * spelling any of these languages uses.
 */
const STOPWORDS: Record<Language, readonly string[]> = {
  es: ["el", "los", "las", "una", "pero", "porque", "cuando", "según", "está", "más", "sí", "año"],
  fr: ["le", "les", "une", "cette", "mais", "parce", "lorsque", "selon", "être", "très", "où"],
  pt: ["os", "as", "uma", "mas", "porque", "quando", "segundo", "está", "mais", "não", "às"],
  de: ["der", "die", "das", "und", "nicht", "eine", "weil", "wenn", "auch", "wird", "über"],
  it: ["il", "gli", "una", "perché", "quando", "secondo", "essere", "più", "questa", "sono"],
};

/**
 * How much of the prose has to be one language's function words before it is named.
 *
 * A margin and not a maximum: the winner must clear this *and* beat the runner-up outright, so
 * a justification that scores two languages equally is left unnamed rather than assigned to
 * whichever the table happens to list first. English prose scores near zero on all five, which
 * is why English is the absence of a match rather than a sixth column — this dashboard's own
 * language needs no detecting, and a false "EN" would be a claim where silence is free.
 *
 * Set inside a gap measured in the court's own record on 2026-08-25, over the 90 justifications
 * long enough to test: every Spanish one scores between 3.0% and 14.6%, and the highest score
 * any English one reaches on any of the five is 1.6% — `166-0-2`, which is English prose
 * quoting a Spanish choice title, and the nearest thing to a trap in the whole set. 2.5% sits
 * between the two with margin either side, and names 38 of them.
 *
 * Erring low would be the wrong direction to err. A justification left unnamed is labelled by
 * its format instead and reads verbatim regardless; one named wrongly puts a claim about an
 * agent juror's output on a page that may be cited.
 */
const LANGUAGE_SHARE = 0.025;

/** Enough words to be worth testing. Below this a single stopword would carry a whole label. */
const LANGUAGE_MINIMUM_WORDS = 40;

/**
 * The language the prose was written in, or `null` where nothing was recognised.
 *
 * A heuristic, and named as one: it labels a column, it is never counted, and no measurement on
 * this dashboard depends on it. That is what makes a wrong answer affordable — the prose is
 * still reproduced verbatim, in full, in whatever language it was written in.
 */
export function languageOf(text: string): Language | null {
  const words = text.toLowerCase().match(/\p{Letter}+/gu) ?? [];
  if (words.length < LANGUAGE_MINIMUM_WORDS) return null;

  let best: { language: Language; share: number } | null = null;
  let runnerUp = 0;

  for (const [language, stopwords] of Object.entries(STOPWORDS) as [Language, string[]][]) {
    const hits = words.filter((word) => stopwords.includes(word)).length;
    const share = hits / words.length;

    if (best === null || share > best.share) {
      runnerUp = best?.share ?? 0;
      best = { language, share };
    } else if (share > runnerUp) {
      runnerUp = share;
    }
  }

  if (best === null || best.share < LANGUAGE_SHARE || best.share <= runnerUp) return null;
  return best.language;
}

/**
 * One published justification, as a column states it.
 *
 * The empty string is not special-cased away: it produces a justification of length zero whose
 * form is `plain`, and the column decides how to draw that. The distinction this module must
 * never collapse is the one between prose published empty and no justification at all — the
 * second is `null` at the call site and never reaches here.
 */
export function toJustification(text: string): Justification {
  const language = languageOf(text);

  return {
    text,
    // Code points rather than UTF-16 units, so an emoji or an accented character counts once.
    // The figure is printed beside the prose it describes and a reader can check it by eye.
    length: [...text].length,
    form:
      language !== null
        ? { kind: "language", language }
        : { kind: looksMarkdown(text) ? "markdown" : "plain" },
    lang: language,
  };
}
