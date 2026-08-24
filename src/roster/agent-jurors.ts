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
 * Ordered by nickname so the roster's order is a property of the file rather than of
 * anything measured. Nothing downstream may read rank into it.
 */
export const ROSTER: readonly AgentJuror[] = [
  {
    nickname: "007",
    address: "0x245314a76FC9b8e48Fea7Abb3B9B07E34E13d8C6",
    stack: { label: "OpenClaw" },
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
];

/** The full ENS name to resolve records from. */
export function ensNameOf(agentJuror: AgentJuror): string {
  return `${agentJuror.nickname}.${AGENT_JUROR_ENS_PARENT}`;
}
