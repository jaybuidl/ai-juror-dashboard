import type { PublicClient } from "viem";
import { describe, expect, it, vi } from "vitest";
import { type AgentJuror, ROSTER } from "./agent-jurors";
import {
  DEFAULT_MAINNET_RPC_URL,
  mainnetRpcUrl,
  resolveAgentJurorIdentities,
  rosterIdentity,
} from "./ens";

/** A mainnet that answers every subname with an avatar and a `name` record, and counts asks. */
function answeringClient() {
  const client = {
    getEnsAvatar: vi.fn(async () => "https://euc.li/avatar"),
    getEnsText: vi.fn(async () => null),
  };
  return { client, asked: client as unknown as PublicClient };
}

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

  it("names every agent juror, so a total ENS failure still renders all of them", () => {
    const identities = ROSTER.map(rosterIdentity);

    expect(identities).toHaveLength(ROSTER.length);
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

describe("an agent juror ENS cannot name", () => {
  const named: AgentJuror = { nickname: "Blaise", address: "0x1", stack: null };

  it("asks mainnet nothing where there is no subname", async () => {
    const { client, asked } = answeringClient();
    const unnamed: AgentJuror = { ...named, nickname: "No Subname", ensSubname: false };

    const [identity] = await resolveAgentJurorIdentities(asked, [unnamed]);

    expect(identity).toEqual(rosterIdentity(unnamed));
    expect(client.getEnsAvatar).not.toHaveBeenCalled();
  });

  it("costs only its own identity when its label is one ENS rejects", async () => {
    // The failure this pins: `normalize` throws on a space, and it once ran outside the `try`,
    // so one bad label rejected the whole roster's lookup and every avatar fell back with a
    // banner blaming a mainnet that had answered.
    const { asked } = answeringClient();
    const rejected: AgentJuror = { ...named, address: "0x2", nickname: "Has A Space" };

    const [first, second] = await resolveAgentJurorIdentities(asked, [named, rejected]);

    expect(first?.resolvedFromEns).toBe(true);
    expect(second).toEqual(rosterIdentity(rejected));
  });
});
