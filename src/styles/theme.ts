/**
 * Placeholder tokens for the shell.
 *
 * The visual design is settled — DESIGN_PROMPT.md is answered by the canvas under
 * `.scratch/juror-performance-dashboard/canvas/` — and ticket 14 replaces these values with the
 * Kleros ×AI tokens, which is why it blocks the matrix rather than following it. Values here are
 * lifted from the Kleros court frontend's dark theme (`kleros-v2/web/src/styles/themes.ts`) and
 * are a placeholder only: the ×AI system carries ramps, semantic aliases, washes and glows that
 * have no counterpart here, so the swap is a re-palette and not a rename.
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
