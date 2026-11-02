import { describe, expect, it } from "vitest";
import { casePageOf, jurorProfileOf } from "./court-frontend";

describe("links into the Kleros court frontend", () => {
  // Pinned whole, because the court is hash-routed: drop the `#/` and both of these still look
  // like a URL and still load — the court's home page, with no case or juror on it.
  it("links a case to its overview", () => {
    expect(casePageOf(326)).toBe("https://v2.kleros.builders/#/cases/326/overview");
  });

  it("links a juror to its profile, keyed on the address", () => {
    expect(jurorProfileOf("0x245314a76fC9b8E48fEA7AbB3b9b07E34E13D8c6")).toBe(
      "https://v2.kleros.builders/#/profile/1/desc/all?address=0x245314a76fC9b8E48fEA7AbB3b9b07E34E13D8c6",
    );
  });
});
