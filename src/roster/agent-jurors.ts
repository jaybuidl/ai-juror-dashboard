import type { Address } from "viem";

/**
 * The parent name every agent juror's nickname hangs off. Nicknames are ENS subnames of
 * it, one label deep: `blaise` is `blaise.agents.kleroslabs.eth`.
 */
export const AGENT_JUROR_ENS_PARENT = "agents.kleroslabs.eth";

/**
 * The agentic build behind one agent juror — its framework, model and harness.
 *
 * A record rather than a bare string because nothing on chain reports a stack: it is
 * recorded by hand, and what is known about each one differs. Today only the label is
 * carried; a later ticket can add fields here without touching any call site.
 */
export type Stack = {
  /** How the build is named, in a word or two. */
  label: string;
};

export type AgentJuror = {
  /**
   * The subname's own label, capitalised for display — see `ensNameOf` for the full ENS name.
   *
   * The capital costs nothing anywhere this is not a display string: ENS labels normalise to
   * lowercase, and draws join on the address. What it does touch is the route, which is this
   * string — so `AgentJurorPage` matches it case-insensitively and links made before the
   * capitals still open.
   */
  nickname: string;
  /** The address it votes from, in court 34. Checksummed. */
  address: Address;
  stack: Stack;
  /** One line, where there is something worth saying. */
  description?: string;
};

/**
 * The dashboard's own list of the agent jurors in court 34.
 *
 * Authoritative here because nothing on chain enumerates the set. The core subgraph knows
 * only the addresses that have been *drawn*, so between joining this experiment and its
 * first draw an agent juror is invisible to every read this dashboard makes — it may well
 * have staked, which is on chain and is not read here — and it exists on this page only
 * because ENS and this file say it does. Anything that enumerates agent jurors must read this
 * rather than the chain, or it will silently show fewer than there are. That window is not
 * hypothetical: `Baskerville` sat in it for the whole of this dashboard's first six
 * tickets, and every agent juror added from here sits in it until the court draws it.
 *
 * The converse failure is this file falling behind the court, and it is the worse of the
 * two because it is silent in the other direction. `buildCourtPerformance` maps each row's
 * cells over this array, so an address drawn in court 34 and missing here has no cell, no
 * column and no entry in any counter: its draws are dropped before a single figure is
 * computed, with no error and no caveat. That happened — `Grokleros` voted in three
 * disputes while this file held six entries, and nothing in the suite could see it, because
 * a roster short of the court is a claim no test in this repo is in a position to check.
 * Reconcile against the chain, not against the tests.
 *
 * Addresses were verified two ways: each forward-resolves from its ENS subname on mainnet,
 * and every one of them appears as a drawn juror in court 34 in the core subgraph.
 *
 * Deliberately absent: who operates each agent juror. That mapping exists elsewhere and
 * must not arrive here — agent jurors are identified by nickname and stack, never by the
 * person who built them.
 *
 * Ordered by nickname, with exceptions at the right-hand end, and **no rank may be read into
 * any of them**. The rule is about columns, not about merit, and it is stated as a rule rather
 * than as a fact about any one agent juror so that it survives the court drawing one:
 *
 * - **Append at the right, never to the left of an existing entry.** A column that moves shows
 *   one agent juror's record under another's avatar (see the join, below).
 * - **Any agent juror the court has not drawn sorts rightmost**, because an empty column
 *   mid-grid reads as missing data rather than as the sparsity random draws produce. No entry
 *   is in that state today; the next one added will be, until it is drawn.
 *
 * `Baskerville` is sixth because it was appended there under the first rule while the second
 * applied to it, and it stays there now that the court has drawn it: the rules place a new
 * column, they never justify moving an old one. `Aletheia` sits before it by the maintainer's
 * call — its column is the one dense with missed votes, and a full-height rose column two
 * positions from the left is the loudest thing in a grid whose subject is latency.
 *
 * That exception is the one to be careful about, and it is recorded here rather than left
 * to be inferred. Moving the agent juror that misses most votes to the right-hand end can be
 * read as sorting the grid by how well each did — which is exactly what the sentence above
 * forbids. It is a layout decision about one rose column and nothing else: the order is fixed
 * in this file, nothing sorts at runtime, no figure anywhere is ordered by it, and the column
 * will not move if Aletheia's record changes.
 *
 * **This array is the join.** `marginals` and every row's `cells` are built in this order and
 * matched to it by index, so a column moved anywhere but here shows one agent juror's draws under
 * another's avatar with every figure on the page internally consistent, no error, and nothing in
 * the console. Reorder here or not at all. Do not re-alphabetise.
 */
export const ROSTER: readonly AgentJuror[] = [
  {
    nickname: "007",
    address: "0x245314a76FC9b8e48Fea7Abb3B9B07E34E13d8C6",
    stack: { label: "OpenClaw" },
  },
  {
    nickname: "Blaise",
    address: "0x57eb05d4dfFAc43A0C52B42C47a4E7d1838725Ea",
    stack: { label: "OpenClaw" },
    description: "Reads with @kleros/agentkit and votes with kleros-juror-cli.",
  },
  {
    nickname: "Columbo",
    address: "0x70239816581Afff150814B46C831e2e5F9E3bF4C",
    stack: { label: "claude -p" },
    description: "No agent framework: the Claude Code CLI driven directly.",
  },
  {
    nickname: "Daemonhill",
    address: "0xAC237740772093Fcc812A463050c43A275dd01E5",
    stack: { label: "Hermes" },
  },
  {
    nickname: "Aletheia",
    address: "0xD44Ca97bCd957b410a6e0A7109323cfD9ad814bE",
    stack: { label: "Hermes" },
  },
  {
    nickname: "Baskerville",
    address: "0x606D2DD4Ca178349b327Ed7ACacf68058bd748Bc",
    stack: { label: "Hermes" },
  },
  {
    nickname: "Grokleros",
    address: "0x93Aa2f8e5cE8288d57F8785F5a40A60A42fD925e",
    stack: { label: "Grok Bot" },
  },
];

/**
 * The full ENS name to resolve records from, lowercased.
 *
 * The nickname above carries a capital for display and an ENS label does not have one. Case is
 * folded on resolution either way, but this string is also drawn on the agent juror's own page
 * as an identifier to paste into an ENS app, where a capital is a spelling no other tool shows.
 */
export function ensNameOf(agentJuror: AgentJuror): string {
  return `${agentJuror.nickname.toLowerCase()}.${AGENT_JUROR_ENS_PARENT}`;
}
