import { describe, expect, it } from "vitest";
import { ROSTER } from "./agent-jurors";
import { DEFAULT_MAINNET_RPC_URL, mainnetRpcUrl, rosterIdentity } from "./ens";

describe("identity without ENS", () => {
  it("keeps the roster nickname and offers no avatar", () => {
    const agentJuror = ROSTER[0];
    if (!agentJuror) throw new Error("the roster is empty");

    expect(rosterIdentity(agentJuror)).toEqual({
      address: agentJuror.address,
      nickname: agentJuror.nickname,
      avatarUrl: null,
      resolvedFromEns: false,
    });
  });

  it("names every agent juror, so a total ENS failure still renders six of them", () => {
    const identities = ROSTER.map(rosterIdentity);

    expect(identities).toHaveLength(6);
    expect(identities.every((identity) => identity.nickname.length > 0)).toBe(true);
    expect(identities.every((identity) => identity.resolvedFromEns)).toBe(false);
  });
});

describe("the mainnet endpoint", () => {
  // The connect-src half of this claim lives in `src/csp.test.ts`, which reads the policy out
  // of netlify.toml. It was asserted in this title and nowhere in this body until then.
  it("defaults to a keyless endpoint reached over https", () => {
    expect(mainnetRpcUrl()).toBe(DEFAULT_MAINNET_RPC_URL);
    expect(DEFAULT_MAINNET_RPC_URL).toMatch(/^https:\/\//);
  });
});
