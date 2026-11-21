import { useQuery } from "@tanstack/react-query";
import { type Address, createPublicClient, http, type PublicClient } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";
import { mainnetRpcUrl } from "./ens";

/**
 * A primary ENS name worth showing, or `null`.
 *
 * Only a name already in normal form (ENSIP-15) is shown. A name that `normalize` rejects or
 * rewrites is not one a reader could type back into ENS, and it is the shape a look-alike takes,
 * so it is dropped and its funder stays "someone else".
 */
export function shownEnsName(name: unknown): string | null {
  if (typeof name !== "string" || name.length === 0) return null;
  try {
    return normalize(name) === name ? name : null;
  } catch {
    return null;
  }
}

/**
 * Mainnet, as `createMainnetClient` reaches it, with offchain lookups (CCIP-Read) turned off.
 *
 * A funder chooses its own name, and so its resolver: one that answers offchain names a gateway
 * URL of its choosing, which every reader's browser would then fetch, handing a funder each
 * visitor's address. The CSP would block the fetch anyway (`netlify.toml`), with a console
 * violation per name. Off, such a name fails to resolve and the funder stays "someone else". A
 * name held on mainnet needs no gateway: `vitalik.eth` resolves either way (checked 2026-11-21).
 */
function createFunderNameClient(): PublicClient {
  return createPublicClient({
    chain: mainnet,
    transport: http(mainnetRpcUrl(), { batch: true }),
    batch: { multicall: true },
    ccipRead: false,
  });
}

/**
 * The primary ENS name of each of a few accounts, for appeal funders nothing else names (#32).
 *
 * Reverse resolution through ENS's universal resolver, which checks it against forward
 * resolution: a name only counts if it resolves back to the same address, so an account cannot
 * claim a name it does not hold. A name is the account's own public choice, set on chain by
 * whoever holds it; the maintainer asked for it (2026-11-21) where a funder is otherwise
 * "someone else".
 *
 * Best effort, like every ENS read here: a lookup that fails is a name not shown, never a banner,
 * because it costs a label and never a figure (`CLAUDE.md`). Not persisted, for the reason the
 * roster's identities are not: a failed read is a successful query, and restoring it would keep
 * a name missing long after ENS answered again (`persistence.ts`).
 */
export function useEnsNames(addresses: readonly string[]): ReadonlyMap<string, string> {
  const asked = [...new Set(addresses.map((address) => address.toLowerCase()))].sort();
  const query = useQuery({
    queryKey: ["ensNames", asked],
    queryFn: async () => {
      const client = createFunderNameClient();
      const names = await Promise.all(
        asked.map((address) =>
          client.getEnsName({ address: address as Address }).catch(() => null),
        ),
      );
      return asked.flatMap((address, index) => {
        const name = shownEnsName(names[index]);
        return name === null ? [] : [[address, name] as const];
      });
    },
    enabled: asked.length > 0,
    // A primary name changes when its holder changes it, rarely. An hour, as the roster holds.
    staleTime: 60 * 60 * 1000,
  });

  return new Map(query.data ?? []);
}
