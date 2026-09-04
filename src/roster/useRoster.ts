import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { type AgentJuror, ROSTER } from "./agent-jurors";
import {
  type AgentJurorIdentity,
  createMainnetClient,
  resolveAgentJurorIdentities,
  rosterIdentity,
} from "./ens";

export type RosterEntry = {
  agentJuror: AgentJuror;
  identity: AgentJurorIdentity;
};

export type RosterView = {
  entries: readonly RosterEntry[];
  /** True while ENS is still being read. The roster itself is never pending. */
  isResolving: boolean;
  /**
   * False when ENS answered for nobody — a mainnet outage, a blocked request, or a
   * policy that forbids the endpoint. Callers must say so on the page: the roster still
   * renders, but every nickname on it is the checked-in one and no avatar is real.
   */
  isResolvedFromEns: boolean;
};

/**
 * The roster, with ENS layered over it where ENS could be reached.
 *
 * The checked-in roster is the value, not the fallback: it renders immediately and in
 * full, and ENS only ever replaces a nickname or adds an avatar to it. There is
 * deliberately no loading state in which the roster is absent.
 */
export function useRoster(agentJurors: readonly AgentJuror[] = ROSTER): RosterView {
  const client = useMemo(() => createMainnetClient(), []);

  const query = useQuery({
    queryKey: ["agentJurorIdentities", agentJurors.map((agentJuror) => agentJuror.nickname)],
    queryFn: () => resolveAgentJurorIdentities(client, agentJurors),
    // An ENS record changes when someone deliberately edits one, which for this roster
    // has happened a handful of times ever. Long, but not Infinity: a tab left open for
    // a day should pick up a corrected avatar without a reload.
    staleTime: 60 * 60 * 1000,
  });

  const identities = query.data;

  const entries = agentJurors.map((agentJuror, index) => ({
    agentJuror,
    identity: identities?.[index] ?? rosterIdentity(agentJuror),
  }));

  return {
    entries,
    isResolving: query.isPending,
    isResolvedFromEns: entries.some(({ identity }) => identity.resolvedFromEns),
  };
}
