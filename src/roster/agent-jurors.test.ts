import { describe, expect, it } from "vitest";
import { AGENT_JUROR_ENS_PARENT, ensNameOf, ROSTER } from "./agent-jurors";

describe("the roster", () => {
  it("holds all six agent jurors, including the one with no on-chain presence", () => {
    expect(ROSTER).toHaveLength(6);
    expect(ROSTER.map((agentJuror) => agentJuror.nickname)).toContain("baskerville");
  });

  it("identifies every agent juror by nickname and stack", () => {
    for (const agentJuror of ROSTER) {
      expect(agentJuror.nickname).not.toHaveLength(0);
      expect(agentJuror.stack.label).not.toHaveLength(0);
    }
  });

  it("gives every agent juror a distinct nickname and address", () => {
    const nicknames = new Set(ROSTER.map((agentJuror) => agentJuror.nickname));
    const addresses = new Set(ROSTER.map((agentJuror) => agentJuror.address.toLowerCase()));

    expect(nicknames.size).toBe(ROSTER.length);
    expect(addresses.size).toBe(ROSTER.length);
  });

  it("keeps addresses checksummed, so they compare equal to what the chain returns", () => {
    for (const agentJuror of ROSTER) {
      expect(agentJuror.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(agentJuror.address).not.toBe(agentJuror.address.toLowerCase());
    }
  });

  it("builds each ENS name as a subname of the agents parent", () => {
    expect(ensNameOf({ nickname: "blaise", address: "0x0", stack: { label: "x" } })).toBe(
      "blaise.agents.kleroslabs.eth",
    );

    for (const agentJuror of ROSTER) {
      expect(ensNameOf(agentJuror)).toBe(`${agentJuror.nickname}.${AGENT_JUROR_ENS_PARENT}`);
    }
  });

  it("uses a nickname that survives a URL, because ticket 11 routes on it", () => {
    for (const agentJuror of ROSTER) {
      expect(encodeURIComponent(agentJuror.nickname)).toBe(agentJuror.nickname);
    }
  });
});
