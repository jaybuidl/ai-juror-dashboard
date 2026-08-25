import { describe, expect, it } from "vitest";
import indexHtml from "../../index.html?raw";
import { theme } from "./theme";

/**
 * These three tests exist because every failure they catch is a *silent* one.
 *
 * An undefined custom property is not an error in CSS: `color: var(--acccent)` computes to
 * the inherited colour and the page renders, slightly wrong, with nothing in the console. A
 * hex copied out of a token file is not an error either — it looks identical until the token
 * moves and the copy does not. And a Court-purple value left behind is invisible against a
 * dark ground until someone screenshots the page for a paper.
 */

/**
 * Every `--custom-property:` the vendored design system declares on `:root`.
 *
 * Scoped to `:root` on purpose. `themes.css` declares some thirty properties inside
 * `[data-theme="light"]`, and the dashboard ships dark with no such attribute anywhere — so a
 * theme key pointing at one of those would resolve to nothing at runtime while looking, to a
 * scan of the whole file, perfectly well declared.
 */
const declaredTokens = new Set(
  Object.values(
    import.meta.glob("/src/styles/kleros-ai/**/*.css", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>,
  )
    .flatMap((css) => [...css.matchAll(/:root\s*\{([^}]*)\}/g)].map(([, block]) => block as string))
    .flatMap((block) => [...block.matchAll(/(--[\w-]+)\s*:/g)].map(([, name]) => name as string)),
);

/** The Kleros court palette this ticket replaced. Any survivor is a miss, not a choice. */
const COURT_PALETTE = [
  "#7E1BD4",
  "#B45FFF",
  "#BB72FF",
  "#DAF0FF",
  "#BECCE5",
  "#392C74",
  "#220050",
  "#1B003F",
  "#65DC7F",
  "#FFC46B",
  "#FF5A78",
];

/** The files that paint the page, as text. Test files are excluded: this one holds the hexes. */
const renderedSources: Record<string, string> = {
  ...(Object.fromEntries(
    Object.entries(
      import.meta.glob("/src/**/*.{ts,tsx}", {
        query: "?raw",
        import: "default",
        eager: true,
      }) as Record<string, string>,
    ).filter(([path]) => !path.includes(".test.")),
  ) as Record<string, string>),
  "/index.html": indexHtml,
};

describe("theme", () => {
  it("aliases CSS custom properties instead of copying their values", () => {
    for (const [key, value] of Object.entries(theme)) {
      if (key === "name") continue;

      expect(value, `theme.${key}`).toMatch(/^var\(--[\w-]+\)$/);
    }
  });

  it("names only custom properties the design system actually declares", () => {
    // A typo here would not throw, would not warn, and would not fail a build. It would
    // render one element in the inherited colour and be found by eye, or not at all.
    expect(declaredTokens.size).toBeGreaterThan(0);

    for (const [key, value] of Object.entries(theme)) {
      if (key === "name") continue;

      const token = value.slice("var(".length, -1);
      expect(declaredTokens, `theme.${key} -> ${token}`).toContain(token);
    }
  });
});

describe("the page", () => {
  it("carries no value from the Kleros court palette", () => {
    for (const [path, source] of Object.entries(renderedSources)) {
      for (const hex of COURT_PALETTE) {
        expect(source.toUpperCase(), `${path} still holds ${hex}`).not.toContain(hex);
      }
    }
  });
});
