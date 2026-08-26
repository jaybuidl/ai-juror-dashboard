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
  /** The subname's own label — see `ensNameOf` for the full ENS name. */
  nickname: string;
  /** The address it votes from, in court 34. Checksummed. */
  address: Address;
  stack: Stack;
  /** One line, where there is something worth saying. */
  description?: string;
};

/**
 * The dashboard's own list of the six agent jurors.
 *
 * Authoritative here because it is the only place all six appear: `baskerville` has never
 * staked or been drawn and so has no on-chain presence at all — the core subgraph knows
 * nothing about it, and it exists in this experiment only because ENS and this file say
 * it does. Anything that enumerates agent jurors must read this rather than the chain,
 * or it will silently show five.
 *
 * Addresses were verified two ways: each forward-resolves from its ENS subname on
 * mainnet, and five of the six appear as drawn jurors in court 34 in the core subgraph.
 *
 * Deliberately absent: who operates each agent juror. That mapping exists elsewhere and
 * must not arrive here — agent jurors are identified by nickname and stack, never by the
 * person who built them.
 *
 * Ordered by nickname, with two exceptions at the right-hand end, and **no rank may be read into
 * either**. `baskerville` is last because its matrix column is empty end to end, and an empty
 * column mid-grid reads as missing data rather than as the sparsity random draws produce; every
 * artboard draws it in that position. `aletheia` sits just before it by the maintainer's call:
 * its column is the one dense with missed votes, and a full-height rose column two positions
 * from the left is the loudest thing in a grid whose subject is latency.
 *
 * That second exception is the one to be careful about, and it is recorded here rather than left
 * to be inferred. Moving the agent juror that misses most votes to the far right, next to the one
 * never drawn, can be read as sorting the grid by how well each did — which is exactly what the
 * sentence above forbids. It is a layout decision about one rose column and nothing else: the
 * order is fixed in this file, nothing sorts at runtime, no figure anywhere is ordered by it, and
 * the column will not move if aletheia's record changes.
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
    nickname: "blaise",
    address: "0x57eb05d4dfFAc43A0C52B42C47a4E7d1838725Ea",
    stack: { label: "OpenClaw" },
    description: "Reads with @kleros/agentkit and votes with kleros-juror-cli.",
  },
  {
    nickname: "columbo",
    address: "0x70239816581Afff150814B46C831e2e5F9E3bF4C",
    stack: { label: "claude -p" },
    description: "No agent framework: the Claude Code CLI driven directly.",
  },
  {
    nickname: "daemonhill",
    address: "0xAC237740772093Fcc812A463050c43A275dd01E5",
    stack: { label: "Hermes" },
  },
  {
    nickname: "aletheia",
    address: "0xD44Ca97bCd957b410a6e0A7109323cfD9ad814bE",
    stack: { label: "Hermes" },
  },
  {
    nickname: "baskerville",
    address: "0x606D2DD4Ca178349b327Ed7ACacf68058bd748Bc",
    stack: { label: "Hermes" },
  },
];

/** The full ENS name to resolve records from. */
export function ensNameOf(agentJuror: AgentJuror): string {
  return `${agentJuror.nickname}.${AGENT_JUROR_ENS_PARENT}`;
}
