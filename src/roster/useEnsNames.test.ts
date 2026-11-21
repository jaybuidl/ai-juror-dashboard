import { describe, expect, it } from "vitest";
import { shownEnsName } from "./useEnsNames";

describe("shownEnsName", () => {
  it("shows a name already in normal form", () => {
    expect(shownEnsName("vitalik.eth")).toBe("vitalik.eth");
  });

  it("drops a name that normalising would rewrite, which no reader could type back", () => {
    expect(shownEnsName("Vitalik.eth")).toBeNull();
  });

  it("drops a name that does not normalise at all", () => {
    // A zero-width joiner between two letters, the shape a look-alike takes.
    expect(shownEnsName("vit‍alik.eth")).toBeNull();
  });

  it("drops no name, an empty one, and anything that is not a string", () => {
    expect(shownEnsName(null)).toBeNull();
    expect(shownEnsName("")).toBeNull();
    expect(shownEnsName(42)).toBeNull();
  });
});
