import { describe, expect, it } from "vitest";
import { AGENT_JUROR_ENS_PARENT, ROSTER } from "../roster/agent-jurors";
import { fold, imitates } from "./lookalike";

/**
 * Funder ENS names that must not be shown, and ordinary ones that must (#32). The cases are the
 * bypasses four rounds of review found, one row each, so a later change that reopens one says so.
 */

const NICKNAMES = ROSTER.map((agentJuror) => agentJuror.nickname);

describe("imitates", () => {
  it.each([
    // Rule 1: deeper than a direct child of the agents parent.
    `grokleros.blaise.${AGENT_JUROR_ENS_PARENT}`,
    // Rule 2: address-shaped.
    "0xd66c.eth",
    "0x9eb6a13d66fb.eth",
    // Rule 3: Latin beside anything else, or a confusable script.
    "klerøs.eth",
    "kłeros.eth",
    "klero$.eth",
    "kl€ros.eth",
    "blai$e.eth",
    "кӏегоѕ.eth",
    // Rule 4: folded to kleros or a nickname.
    "grokleros.eth",
    "x.grokleros.eth",
    "grok.leros.eth",
    "blai.se",
    "the-kleros-bot.eth",
    "kléros.eth",
    "k1eros.eth",
    "kieros.eth",
    "colurnbo.eth",
    "daernonhill.eth",
    "claemonhill.eth",
    "6laise.eth",
    "6askerville.eth",
    "colum6o.eth",
    "9rokleros.eth",
    "1ntendant.eth",
    "j0nesy.eth",
    // Short nickname 007.
    "oo7.eth",
    "007agent.eth",
    "agent-007.eth",
    "agent-oo7.eth",
    "agentoo7.eth",
    "x0-07.eth",
    "〇〇7.eth",
  ])("does not show %s", (name) => {
    expect(imitates(name, NICKNAMES)).toBe(true);
  });

  it.each([
    `grokleros.${AGENT_JUROR_ENS_PARENT}`,
    "alice.eth",
    "vitalik.eth",
    "root.eth",
    "scooter.eth",
    "blais.eth",
    "café.eth",
    "müller.eth",
    "françois.eth",
    "中文.eth",
    "🔥🔥🔥.eth",
    "oxford.eth",
  ])("shows %s", (name) => {
    expect(imitates(name, NICKNAMES)).toBe(false);
  });

  it("checks the names the page gives agent jurors, beyond the roster's", () => {
    expect(imitates("the-oracle.eth", [...NICKNAMES, "The Oracle"])).toBe(true);
  });
});

describe("fold", () => {
  it("reads each character as the class it passes for, on both sides alike", () => {
    expect(fold("K1éR05")).toBe(fold("kleros"));
    expect(fold("007")).toBe(fold("oot"));
    expect(fold("rn")).toBe("m");
  });
});
