import { normalize } from "viem/ens";
import { describe, expect, it } from "vitest";
import { ensNameOf, ROSTER } from "./agent-jurors";
import { createMainnetClient, resolveAgentJurorIdentities } from "./ens";

const client = createMainnetClient();

describe("ENS against mainnet", () => {
  it("resolves every agent juror's nickname and avatar", async () => {
    const identities = await resolveAgentJurorIdentities(client, ROSTER);

    expect(identities).toHaveLength(ROSTER.length);
    for (const identity of identities) {
      expect(identity.resolvedFromEns).toBe(true);
      expect(identity.nickname).not.toHaveLength(0);
      expect(identity.avatarUrl).toMatch(/^https:\/\//);
    }
  });

  /**
   * The roster's addresses are checked in by hand, and every later metric is keyed by
   * them: an address that drifts from the subname it claims would silently attribute one
   * agent juror's latency and coherence to another. ENS is the second opinion.
   */
  it("agrees with the roster about which address each nickname belongs to", async () => {
    const resolved = await Promise.all(
      ROSTER.map(async (agentJuror) => ({
        nickname: agentJuror.nickname,
        expected: agentJuror.address,
        actual: await client.getEnsAddress({ name: normalize(ensNameOf(agentJuror)) }),
      })),
    );

    for (const { nickname, expected, actual } of resolved) {
      expect(actual, `${nickname} resolves to a different address than the roster records`).toBe(
        expected,
      );
    }
  });

  it("degrades to the roster nickname when the endpoint is unreachable", async () => {
    const offline = createMainnetClient("https://127.0.0.1:1/unreachable");

    const identities = await resolveAgentJurorIdentities(offline, ROSTER);

    expect(identities).toHaveLength(ROSTER.length);
    for (const [index, identity] of identities.entries()) {
      expect(identity.resolvedFromEns).toBe(false);
      expect(identity.avatarUrl).toBeNull();
      expect(identity.nickname).toBe(ROSTER[index]?.nickname);
    }
  });
});
