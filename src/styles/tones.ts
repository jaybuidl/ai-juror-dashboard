import type { Theme } from "./theme";

/**
 * The four state colours, and the three ways a component reaches them.
 *
 * Shared rather than local to the matrix because the dispute row's pills carry the same tones as
 * the cells beside them — an amber lone-panel pill is the same amber as an amber cell, and two
 * mappings would be two chances to drift. ADR-0006 governs what they may be used for: a glyph and
 * a word carry the meaning, and these carry the colour, never the other way round.
 */
export type Tone = "pass" | "work" | "fail" | "live";

/** The ink: text and glyph. */
export function toneInk(theme: Theme, tone: Tone): string {
  const inks = {
    pass: theme.statePass,
    work: theme.stateWork,
    fail: theme.stateFail,
    live: theme.stateLive,
  };
  return inks[tone];
}

/** The tint behind it. Cyan has none: the coherent cell is the one with no fill at all. */
export function toneWash(theme: Theme, tone: Tone): string {
  const washes = {
    pass: "transparent",
    work: theme.washAmber,
    fail: theme.washRose,
    live: theme.washMint,
  };
  return washes[tone];
}

/** The line around it. */
export function toneLine(theme: Theme, tone: Tone): string {
  const lines = {
    pass: theme.accentQuiet,
    work: theme.lineAmber,
    fail: theme.lineRose,
    live: theme.lineMint,
  };
  return lines[tone];
}
