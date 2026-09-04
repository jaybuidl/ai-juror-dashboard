import { describe, expect, it } from "vitest";
import { AGENT_JUROR_ENS_PARENT, ensNameOf, handleUrlOf, ROSTER } from "./agent-jurors";

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
      "Blaise",
      "Columbo",
      "Daemonhill",
      "Aletheia",
      "Baskerville",
      "Grokleros",
    ]);
  });

  it("identifies every agent juror by nickname and stack", () => {
    for (const agentJuror of ROSTER) {
      expect(agentJuror.nickname).not.toHaveLength(0);
      expect(agentJuror.stack.label).not.toHaveLength(0);
    }
  });

  // Case-insensitively for the nicknames, and that is load-bearing rather than fussy:
  // `AgentJurorPage` folds case to keep links made before the nicknames were capitalised
  // working, so two entries differing only in case would give one URL two pages.
  it("gives every agent juror a distinct nickname and address", () => {
    const nicknames = new Set(ROSTER.map((agentJuror) => agentJuror.nickname.toLowerCase()));
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

  it("builds each ENS name as a lowercase subname of the agents parent", () => {
    // The capital goes in and does not come out. Nicknames are capitalised for display and ENS
    // labels are not, so this is where the two spellings part: resolution folds case either way
    // (ENSIP-15), but this string is also drawn on the agent juror's own page as something to
    // paste into an ENS app, and there only the lowercase form is the name anyone else shows.
    expect(ensNameOf({ nickname: "Blaise", address: "0x0", stack: { label: "x" } })).toBe(
      "blaise.agents.kleroslabs.eth",
    );

    for (const agentJuror of ROSTER) {
      expect(ensNameOf(agentJuror)).toBe(
        `${agentJuror.nickname.toLowerCase()}.${AGENT_JUROR_ENS_PARENT}`,
      );
      expect(ensNameOf(agentJuror)).toBe(ensNameOf(agentJuror).toLowerCase());
    }
  });

  it("starts every nickname with a capital, where the label has a letter to capitalise", () => {
    // The point of the spelling: a page that shows `Blaise` beside `007` and `columbo` reads as
    // three conventions rather than one. `007` has no letter to raise and is left as it is.
    for (const agentJuror of ROSTER) {
      const first = agentJuror.nickname[0] as string;
      expect(first, `${agentJuror.nickname} does not start with a capital`).toBe(
        first.toUpperCase(),
      );
    }
  });

  it("uses a nickname that survives a URL, because ticket 11 routes on it", () => {
    for (const agentJuror of ROSTER) {
      expect(encodeURIComponent(agentJuror.nickname)).toBe(agentJuror.nickname);
    }
  });
});

describe("an agent juror's own account", () => {
  /**
   * Named rather than counted, for the same reason the roster itself is: a test that derived
   * "who has a handle" from the file it is testing would pass on any edit, including a handle
   * quietly attached to the wrong agent juror.
   *
   * The capitalisation is asserted because it is display text and nothing folds it — unlike the
   * nickname beside it, which routes and therefore has a fold to survive.
   */
  it("gives a handle to exactly the three agent jurors that have one", () => {
    const handles = ROSTER.filter((agentJuror) => agentJuror.handle !== undefined).map(
      (agentJuror) => [agentJuror.nickname, agentJuror.handle],
    );

    expect(handles).toEqual([
      ["Blaise", "@BlaiseBuidl"],
      ["Baskerville", "@JurBaskerville"],
      ["Grokleros", "@Grokleros"],
    ]);
  });

  it("stores a handle and never a URL, so the host stays in one place", () => {
    // The trap this pins: pasting `https://x.com/Grokleros` into the field renders a URL as
    // display text and builds `https://x.com/https://x.com/Grokleros` as the href, which is a
    // live link to nowhere on a public page.
    for (const agentJuror of ROSTER) {
      if (agentJuror.handle === undefined) continue;
      expect(agentJuror.handle).toMatch(/^@[A-Za-z0-9_]{1,15}$/);
    }
  });

  it("builds the link from the handle, and nothing at all without one", () => {
    expect(
      handleUrlOf({ nickname: "X", address: "0x0", stack: { label: "x" }, handle: "@Grokleros" }),
    ).toBe("https://x.com/Grokleros");

    expect(handleUrlOf({ nickname: "X", address: "0x0", stack: { label: "x" } })).toBeNull();
  });
});
