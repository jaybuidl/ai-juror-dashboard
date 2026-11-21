import { AGENT_JUROR_ENS_PARENT } from "../roster/agent-jurors";

/**
 * Whether an ENS name would pass for an agent juror, for Kleros, or for an address on the page
 * (#32). A funder nothing else names is shown by its primary ENS name, which anyone can register:
 * `grokleros.eth`, `x.grokleros.eth`, `k1eros.eth`. The forward check `useEnsNames` relies on
 * proves only that the account holds the name, so a name that dresses as the roster or as the
 * court is not shown, and its funder is "someone else".
 *
 * A deny rule, so never complete, and built to fail one way: a genuine name that happens to look
 * like one of these loses a label, never a figure, and nobody is named who should not be. Four
 * rules, in order:
 *
 * 1. **A direct child of the agents parent is shown**, since only Kleros issues those. A deeper
 *    name under it is not exempt: a subname's holder can issue its own.
 * 2. **A label shaped like an address is not**: `0x` and four hex digits is the page's own
 *    shorthand, and two roster nicknames are that shape.
 * 3. **A label that could be read as Latin and is not plain Latin is not**: Latin letters beside
 *    anything but a–z, digits and hyphens once accents are folded away (`klerøs`, `klero$`), or a
 *    label in Cyrillic or Greek, whose letters pass for Latin ones (`кӏегоѕ`). A label wholly in
 *    another script, or of emoji, is read as it is.
 * 4. **A label that folds to "kleros" or to a nickname is not**, folding each letter into the class
 *    of characters that pass for it (`CLASSES`). The labels are run together, the top-level one
 *    too unless it is `eth` (`blai.se` is a name; `blais.eth` is a surname). A nickname under five
 *    folded characters, such as 007, is matched only at the start of a label, or anywhere in one
 *    that holds a digit: anywhere at all, it would take `root.eth`.
 */
export function imitates(name: string, nicknames: readonly string[]): boolean {
  const labels = name.split(".");
  const parent = AGENT_JUROR_ENS_PARENT.split(".");
  if (labels.length === parent.length + 1 && name.endsWith(`.${AGENT_JUROR_ENS_PARENT}`)) {
    return false;
  }
  if (labels.some((label) => /^0x[0-9a-f]{4,}/i.test(label))) return true;
  if (labels.some(isNotPlainLatin)) return true;

  const run = fold((labels.at(-1) === "eth" ? labels.slice(0, -1) : labels).join(""));
  if (run.includes(fold("kleros"))) return true;
  return nicknames.some((nickname) => {
    const folded = fold(nickname);
    if (folded.length === 0) return false;
    if (folded.length >= 5) return run.includes(folded);
    return labels.some((label) => {
      const foldedLabel = fold(label);
      return (
        foldedLabel.startsWith(folded) || (/[0-9〇]/u.test(label) && foldedLabel.includes(folded))
      );
    });
  });
}

/** Rule 3: Latin letters beside anything else, or a script whose letters pass for Latin ones. */
function isNotPlainLatin(label: string): boolean {
  const stripped = stripMarks(label).toLowerCase();
  if (/[\p{Script=Cyrillic}\p{Script=Greek}]/u.test(stripped)) return true;
  return /[a-z]/.test(stripped) && /[^a-z0-9-]/.test(stripped);
}

/**
 * Characters that pass for one another, each class read as its first member. `6` is with both `b`
 * and `g` because it passes for either, which puts them in one class: a name that differs from a
 * nickname only by b for g is dropped too, which costs a label.
 */
const CLASSES: readonly (readonly string[])[] = [
  ["o", "0", "〇"],
  ["l", "1", "i"],
  ["e", "3"],
  ["a", "4"],
  ["s", "5"],
  ["t", "7"],
  ["b", "g", "6", "8", "9"],
  ["z", "2"],
];

const CLASS_OF = new Map(CLASSES.flatMap((members) => members.map((m) => [m, members[0]])));

/**
 * The form a name is compared in: accents folded away, lowercased, the pairs that pass for one
 * letter read as it (`rn` for m, `cl` for d), everything but letters, digits and 〇 dropped, and
 * each character read as its class. Applied to both sides, so a nickname such as 007 still
 * matches itself.
 */
export function fold(text: string): string {
  return [
    ...stripMarks(text)
      .toLowerCase()
      .replace(/rn/g, "m")
      .replace(/cl/g, "d")
      .replace(/[^a-z0-9〇]/gu, ""),
  ]
    .map((character) => CLASS_OF.get(character) ?? character)
    .join("");
}

function stripMarks(text: string): string {
  return text.normalize("NFKD").replace(/\p{M}/gu, "");
}
