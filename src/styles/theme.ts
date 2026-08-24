/**
 * Placeholder tokens for the shell.
 *
 * The visual design is not settled: DESIGN_PROMPT.md is out with a design agent, and
 * tickets 05, 09 and 11 fold its output back in. Values here are lifted verbatim from
 * the Kleros court frontend's dark theme (`kleros-v2/web/src/styles/themes.ts`) and keep
 * its key names, so swapping in `@kleros/ui-components-library` later is a rename-free
 * substitution rather than a re-palette.
 */
export const theme = {
  name: "dark",

  primaryPurple: "#7E1BD4",
  secondaryPurple: "#B45FFF",
  lavenderPurple: "#BB72FF",

  primaryText: "#DAF0FF",
  secondaryText: "#BECCE5",

  stroke: "#392C74",
  whiteBackground: "#220050",
  lightBackground: "#1B003F",

  success: "#65DC7F",
  warning: "#FFC46B",
  error: "#FF5A78",

  transitionSpeed: "0.25s",
};

// Deliberately not `as const`: literal types would make `name: "dark"` the only
// permitted name and each hex string its own type, so a second theme could not be
// assigned to Theme at all — and DefaultTheme propagates that into every template.
export type Theme = typeof theme;
