/**
 * The one place a width at which the layout changes is written down.
 *
 * The chrome reduces below `narrow`: the wordmark loses its lettering, the nav folds, and the
 * stat tiles wrap. Declaring it here rather than at each `@media` is what ticket 15 means by
 * "declares the breakpoint it reduces at in one place" — a second literal somewhere else is a
 * second breakpoint the day one of them moves.
 *
 * What the reduced form *is* — which tiles survive, in what order, what the folded nav looks
 * like — is ticket 16's, and this file is where 16 will change the number if it needs to.
 */
export const breakpoints = {
  /** The phone artboard is 390pt; this is the width below which the desktop chrome stops fitting. */
  narrow: "720px",
};

/** `@media` prelude for the reduced form. Used as `${narrow} { … }` inside a styled template. */
export const narrow = `@media (max-width: ${breakpoints.narrow})`;
