import { useQuery } from "@tanstack/react-query";
import {
  type Address,
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  http,
  type PublicClient,
  RawContractError,
  RpcRequestError,
} from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";
import { mainnetRpcUrl } from "./ens";

/**
 * A primary ENS name worth showing, or `null`.
 *
 * Only a name already in normal form (ENSIP-15) is shown. A name that `normalize` rejects or
 * rewrites is not one a reader could type back into ENS, and it is the shape a look-alike takes,
 * so it is dropped and its funder is shown by its account.
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
 * violation per name. Off, such a name fails to resolve and the funder is shown by its account. A
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
 * Whether a lookup failed because its own call reverted, rather than because nothing answered.
 *
 * Every lookup goes through multicall, one leg per address even for one address, and a leg that
 * reverts reaches here as viem's `RawContractError` with that leg's return data, or, where viem
 * tried to decode that data and could not, as a `ContractFunctionRevertedError` whose cause is the
 * decoding failure. Neither has a node's own error in its chain. viem also makes a reverted call
 * of a node's -32603 internal error, with or without data in it, and that one carries the node's
 * `RpcRequestError`: it is an outage, and taking it for a revert would hold "no names" for the
 * hour below.
 */
function isRevert(reason: unknown): boolean {
  if (!(reason instanceof BaseError)) return false;
  if (reason.walk((error) => error instanceof RawContractError) !== null) return true;
  return (
    reason.walk((error) => error instanceof ContractFunctionRevertedError) !== null &&
    reason.walk((error) => error instanceof RpcRequestError) === null
  );
}

/**
 * The primary ENS name of each of a few accounts, for appeal funders nothing else names (#32).
 *
 * Reverse resolution through ENS's universal resolver, which checks it against forward
 * resolution: a name only counts if it resolves back to the same address, so an account cannot
 * claim a name it does not hold. A name is the account's own public choice, set on chain by
 * whoever holds it; the maintainer asked for it (2026-11-21) where a funder would otherwise be
 * shown by its bare account.
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
      const lookups = await Promise.allSettled(
        asked.map((address) => client.getEnsName({ address: address as Address })),
      );
      // Any lookup failing without a revert is mainnet not answering, for that lookup's chunk of
      // the multicall at least: an error, so react-query retries it and never holds a partial
      // answer as a fresh one for the hour below. A revert is that account's own (an offchain
      // name, with lookups off) and costs only its name, so a lone such funder is an answer, not
      // an outage retried on every focus.
      if (lookups.some((lookup) => lookup.status === "rejected" && !isRevert(lookup.reason))) {
        throw new Error("Mainnet did not answer every ENS lookup");
      }
      return asked.flatMap((address, index) => {
        const lookup = lookups[index];
        const name = shownEnsName(lookup?.status === "fulfilled" ? lookup.value : null);
        return name === null ? [] : [[address, name] as const];
      });
    },
    enabled: asked.length > 0,
    // A new funder changes the key; the names already read stay on screen meanwhile, rather
    // than every named funder turning back into its bare account for the length of the round trip.
    placeholderData: (previous) => previous,
    // A primary name changes when its holder changes it, rarely. An hour, as the roster holds.
    staleTime: 60 * 60 * 1000,
  });

  return new Map(query.data ?? []);
}
