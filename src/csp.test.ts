import { describe, expect, it } from "vitest";
// The deployed policy itself, as text. Imported through Vite's `?raw` rather than read with
// `node:fs`: nothing else in `src/` touches a Node API, and this bundle has no business being
// able to. It also keeps the path resolved by the same resolver as every other import.
import netlifyToml from "../netlify.toml?raw";
import { DEFAULT_CORE_SUBGRAPH_URL } from "./disputes/court-subgraph";
import { DEFAULT_DRT_SUBGRAPH_URL } from "./disputes/drt-subgraph";
import { DEFAULT_ARBITRUM_RPC_URL } from "./performance/arbitrum";
import { DEFAULT_MAINNET_RPC_URL } from "./roster/ens";

/**
 * Every endpoint this dashboard reads by default is allowed by the deployed CSP.
 *
 * The failure this exists for is silent and remote. `connect-src` is served from
 * `netlify.toml` and nowhere else — Vite's dev server and `yarn preview` send no policy at all
 * — so a host missing from it looks perfect on every machine and fails only in production,
 * where the browser refuses the request before it leaves and the read reports no status to
 * distinguish it from an outage. That is not hypothetical: a production deploy overrode the
 * Arbitrum endpoint without adding the host here, and the page showed the blocking banner with
 * "No response" against an endpoint nothing had contacted.
 *
 * **What this cannot catch.** A host configured through a `VITE_` override set in Netlify's UI
 * never reaches this repository, so no test can compare it against anything. This pins the
 * stock configuration only. The override case is answered elsewhere and differently: the
 * banner now derives its SOURCE from the URL in use (`arbitrumSource`), so a blocked override
 * names itself rather than blaming the default. The prose in `netlify.toml` is what tells the
 * next person to add the host.
 *
 * Deliberately stated, because a test whose title claims more than its body checks is worse
 * than no test — `ens.test.ts` carried exactly that overclaim until this file took the claim
 * over.
 */
describe("netlify.toml's connect-src", () => {
  const connectSrc = connectSrcHosts();

  const endpoints = [
    ["the core subgraph", DEFAULT_CORE_SUBGRAPH_URL],
    ["the template subgraph", DEFAULT_DRT_SUBGRAPH_URL],
    ["the Arbitrum endpoint", DEFAULT_ARBITRUM_RPC_URL],
    ["the mainnet endpoint", DEFAULT_MAINNET_RPC_URL],
  ] as const;

  it.each(endpoints)("allows %s", (_name, url) => {
    expect(connectSrc).toContain(new URL(url).origin);
  });

  it("allows the ENS avatar host", () => {
    // Not a `DEFAULT_*` constant and not an `img-src` matter: viem sends a HEAD to the avatar
    // URL before it ever reaches an `<img>`, so this is a connection. Blocked, it fails
    // silently — viem catches it and falls back to `new Image()`, leaving only a console
    // violation on every load.
    expect(connectSrc).toContain("https://euc.li");
  });

  it("allows nothing by wildcard", () => {
    // A `*` or a bare `https:` here would make every assertion above vacuously true.
    expect(connectSrc).not.toContain("*");
    expect(connectSrc).not.toContain("https:");
  });
});

/**
 * The hosts on the `connect-src` directive of the policy `netlify.toml` serves.
 *
 * The policy is a TOML multi-line string whose directives are joined with a trailing `\`, so
 * the continuations are unfolded before it is split. Read from the file rather than from a
 * copy, because a copy is the thing that goes stale.
 */
function connectSrcHosts(): readonly string[] {
  const policy = netlifyToml.match(/Content-Security-Policy\s*=\s*"""([\s\S]*?)"""/)?.[1];
  if (policy === undefined) {
    throw new Error("netlify.toml carries no Content-Security-Policy to check");
  }

  const directives = policy.replace(/\\\s*\n/g, " ").split(";");
  const connectSrc = directives.find((directive) => directive.trim().startsWith("connect-src"));
  if (connectSrc === undefined) {
    throw new Error("The policy in netlify.toml carries no connect-src directive");
  }

  return connectSrc.trim().split(/\s+/).slice(1);
}
