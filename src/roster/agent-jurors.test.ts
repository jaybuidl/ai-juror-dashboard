import { describe, expect, it } from "vitest";
import { AGENT_JUROR_ENS_PARENT, ensNameOf, ROSTER } from "./agent-jurors";

describe("the roster", () => {
  /**
   * Named rather than counted, and deliberately the one test in the repo that hard-codes the
   * roster.
   *
   * Every other assertion about the roster's size reads `ROSTER.length`, which is right for
   * them and useless here: a test of this file that derived its expectation from this file
   * would pass on any edit at all, including a dropped entry. So the names are written out, and
   * they are in order, which makes this fail loudly for the two changes that matter — an agent
   * juror leaving, and a column moving. `ROSTER` is the index every figure on the page is joined
   * on, so a reorder here silently reattributes one agent juror's record to another.
   *
   * Updating this list is meant to be a deliberate act. It is not a chore to be got past: the
   * reason it is failing is that the set of agent jurors changed, and that is a fact about the
   * court that has to be true before anything downstream of it can be.
   */
  it("holds exactly the agent jurors it says it does, in the order the join runs on", () => {
    expect(ROSTER.map((agentJuror) => agentJuror.nickname)).toEqual([
      "007",
      "blaise",
      "columbo",
      "daemonhill",
      "aletheia",
      "baskerville",
      "grokleros",
    ]);
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
