import { type Address, createPublicClient, http, type PublicClient } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";
import { type AgentJuror, ensNameOf } from "./agent-jurors";

/**
 * Keyless, CORS-open (`access-control-allow-origin: *`) and reachable from a browser.
 *
 * Chosen over the alternatives tried in ticket 02, two of which fail in ways worth
 * recording: `rpc.ankr.com/eth` now requires an API key, and `cloudflare-eth.com` answers
 * ordinary calls but reverts inside the ENS universal resolver, so it looks healthy right
 * up until a name is resolved. `eth.drpc.org` and `eth.merkle.io` both work and are the
 * obvious substitutes.
 *
 * Overridable, but see netlify.toml — a host that is not in `connect-src` is blocked by
 * the browser before the request leaves.
 */
export const DEFAULT_MAINNET_RPC_URL = "https://ethereum-rpc.publicnode.com";

/** Overridable at build time; see `coreSubgraphUrl` on testing an `import.meta.env` read both ways. */
export function mainnetRpcUrl(): string {
  return import.meta.env.VITE_MAINNET_RPC_URL ?? DEFAULT_MAINNET_RPC_URL;
}

export function createMainnetClient(url: string = mainnetRpcUrl()): PublicClient {
  return createPublicClient({
    chain: mainnet,
    // Every agent juror costs three reads, so the whole roster is three round trips
    // apiece unbatched, and the roster grows. Both layers are wanted: multicall folds the
    // resolver reads into one call, and the batch scheduler folds what is left into one
    // HTTP request.
    transport: http(url, { batch: true }),
    batch: { multicall: true },
  });
}

/**
 * What ENS was able to say about one agent juror. `nickname` is always populated — it
 * falls back to the roster's — so a caller never has to handle a missing name.
 */
export type AgentJurorIdentity = {
  address: Address;
  nickname: string;
  avatarUrl: string | null;
  /** False when mainnet could not be reached, or the subname has no records. */
  resolvedFromEns: boolean;
};

/** The identity to show before ENS answers, and the one to keep if it never does. */
export function rosterIdentity(agentJuror: AgentJuror): AgentJurorIdentity {
  return {
    address: agentJuror.address,
    nickname: agentJuror.nickname,
    avatarUrl: null,
    resolvedFromEns: false,
  };
}

/**
 * Resolve one agent juror's nickname and avatar from its ENS subname.
 *
 * Forward resolution, deliberately: only a couple of the roster's addresses have a reverse
 * record set, so `getEnsName` would leave most of them anonymous. The roster holds the subname
 * and this reads records off it.
 *
 * ENS is the one source this dashboard is allowed to lose quietly (ticket 13): a mainnet
 * outage costs an avatar, not a measurement, so a failure here degrades to the roster
 * nickname rather than raising.
 */
export async function resolveAgentJurorIdentity(
  client: PublicClient,
  agentJuror: AgentJuror,
): Promise<AgentJurorIdentity> {
  const name = normalize(ensNameOf(agentJuror));

  try {
    const [avatarUrl, nameRecord] = await Promise.all([
      client.getEnsAvatar({ name }),
      client.getEnsText({ name, key: "name" }),
    ]);

    return {
      address: agentJuror.address,
      // The `name` text record is set on one subname only; the rest fall back to the
      // roster nickname, which is the subname's own label and reads identically.
      nickname: nameRecord?.trim() || agentJuror.nickname,
      avatarUrl: avatarUrl ?? null,
      resolvedFromEns: true,
    };
  } catch {
    return rosterIdentity(agentJuror);
  }
}

/** Resolves the whole roster. One agent juror failing never removes another. */
export async function resolveAgentJurorIdentities(
  client: PublicClient,
  agentJurors: readonly AgentJuror[],
): Promise<AgentJurorIdentity[]> {
  return Promise.all(
    agentJurors.map((agentJuror) => resolveAgentJurorIdentity(client, agentJuror)),
  );
}
