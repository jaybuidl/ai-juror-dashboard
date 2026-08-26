/**
 * Kleros ×AI, reachable from a styled template.
 *
 * Every value here is a reference to a custom property declared in `kleros-ai/tokens/`, never a
 * copy of one. That is the whole point of the file: the tokens are vendored verbatim so that
 * re-copying the design system is a whitespace diff, and a hex duplicated into TypeScript would
 * quietly survive the next copy and drift. `theme.test.ts` enforces both halves — that each value
 * is a `var()` reference, and that the property it names is one the vendored CSS declares, which
 * CSS itself will not tell you: an undefined custom property renders as the inherited value with
 * nothing in the console.
 *
 * This is not the whole system. It is the semantic layer `tokens/colors.css` marks "use these in
 * components", plus the type, shape, layout and motion tokens the page in front of it uses. Later
 * views add keys as they need them rather than mirroring the system wholesale.
 *
 * `success`, `warning` and `error` are gone rather than renamed. The court's traffic-light trio
 * has no counterpart here: `--state-pass` is cyan because the system reserves cyan for a verified
 * value, and its amber reads as *prototype*, not *caution*. The five `state*` keys below carry the
 * meanings ADR-0006 assigns them, and mean nothing outside a draw.
 */
export const theme = {
  name: "dark",

  // Ground and surfaces. Cards are a lighter ink than the page, never a tint of it.
  page: "var(--page)",
  pageHero: "var(--page-hero)",
  surfaceCard: "var(--surface-card)",
  surfaceRaised: "var(--surface-raised)",
  surfaceInset: "var(--surface-inset)",
  // Colours, not `border` shorthands — the names say so because `border: <colour>` is valid
  // CSS whose border-style defaults to none, so the mistake draws nothing and warns nothing.
  borderCardColor: "var(--border-card)",
  borderCardHoverColor: "var(--border-card-hover)",
  // The state washes and lines, in the pairs ADR-0006 assigns: amber tints a draw that
  // diverged, rose one that failed to act, mint one still acting. Cyan has no pair — the
  // coherent cell is the quiet one, with no fill and no border of its own.
  lineAmber: "var(--line-amber)",
  washAmber: "var(--wash-amber)",
  lineMint: "var(--line-mint)",
  washMint: "var(--wash-mint)",
  lineRose: "var(--line-rose)",
  washRose: "var(--wash-rose)",
  /* The heavier of the two hairlines: the rule under a table's column headers. */
  lineStrongColor: "var(--line-2)",

  // Text ramp. `textPending` is a step not yet reached, not a disabled control.
  textHeading: "var(--text-heading)",
  textBody: "var(--text-body)",
  textMeta: "var(--text-meta)",
  textPending: "var(--text-pending)",
  /*
   * The dimmest step, and the one thing on this page that is *meant* to be near-invisible: the
   * 3px "not drawn" dot, and nothing else. It is not text and is exempt from 4.5:1 by
   * construction — a dot that cleared it would no longer be the emptiest mark in the matrix,
   * which is the whole of what it says (ADR-0006). The meaning travels in the words "Not drawn"
   * in the cell's accessible name. Reach for it only for a mark whose job is to be almost
   * nothing; anything carrying a string wants `textPending` or brighter. See `docs/contrast.md`.
   */
  textDisabled: "var(--text-5)",

  // Cyan, and only for a value, a verified state, or focus. Not decoration.
  accent: "var(--accent)",
  accentQuiet: "var(--accent-quiet)",
  focusRing: "var(--focus-ring)",

  // The ×AI tail of the lockup. The system marks these "logo only", and they are used in
  // exactly one component — a second use would be a third brand colour by accident.
  brandAi: "var(--brand-ai)",
  brandX: "var(--brand-x)",

  // Draw states, per ADR-0006: a glyph and a word carry the meaning, these carry the colour.
  statePass: "var(--state-pass)",
  stateLive: "var(--state-live)",
  stateWork: "var(--state-work)",
  stateFail: "var(--state-fail)",
  stateIdle: "var(--state-idle)",

  // Type. The `type*` keys are `font` shorthands, so they set family, weight, size and leading
  // in one declaration; tracking is separate because the shorthand cannot carry it.
  //
  // TRAP: the `font` shorthand also *resets* font-feature-settings to normal. base.css puts
  // `font-feature-settings: var(--font-feature-numeric)` on body so digits are tabular page-wide,
  // and every element that sets its type through one of these keys drops that for itself and its
  // descendants. Anything holding figures — the latency cells from ticket 05 on — must re-declare
  // `font-feature-settings` after the shorthand, which is what the canvas does on every numeric
  // element. Nothing warns: the digits simply stop lining up in a column.
  fontMono: "var(--font-mono)",
  featureMono: "var(--font-feature-mono)",
  featureNumeric: "var(--font-feature-numeric)",
  typeDisplay2: "var(--type-display-2)",
  typeTitle1: "var(--type-title-1)",
  typeTitle2: "var(--type-title-2)",
  typeTitle3: "var(--type-title-3)",
  typeBodyLg: "var(--type-body-lg)",
  typeBody: "var(--type-body)",
  typeBodySm: "var(--type-body-sm)",
  typeMono: "var(--type-mono)",
  typeMonoLg: "var(--type-mono-lg)",
  typeMonoSm: "var(--type-mono-sm)",
  // The figure over a label: a stat tile's number, and nothing else.
  typeMetric: "var(--type-metric)",
  typeMetricSm: "var(--type-metric-sm)",
  trackingDisplay: "var(--tracking-display)",
  trackingTitle: "var(--tracking-title)",
  trackingMono: "var(--tracking-mono)",
  trackingMonoTight: "var(--tracking-mono-tight)",

  // Shape. `border*` are complete `border` shorthands, not colours.
  radiusCard: "var(--radius-5)",
  radiusTile: "var(--radius-4)",
  radiusChip: "var(--radius-3)",
  borderHairline: "var(--border-hairline)",
  borderVisible: "var(--border-visible)",
  shadowCard: "var(--shadow-card)",

  // Layout
  container: "var(--container)",
  /* Prose measure: the method page, where a reader is reading rather than scanning a grid. */
  containerNarrow: "var(--container-narrow)",
  gutter: "var(--gutter)",
  navHeight: "var(--nav-h)",
  cardPad: "var(--card-pad)",
  cardPadLg: "var(--card-pad-lg)",

  // The steps of the system's spacing scale this page uses, keyed by its own index so the
  // two stay legible against each other. The rest are added when a view needs them.
  space1: "var(--space-1)",
  space2: "var(--space-2)",
  space3: "var(--space-3)",
  space4: "var(--space-4)",
  space5: "var(--space-5)",
  space6: "var(--space-6)",
  space7: "var(--space-7)",
  space8: "var(--space-8)",
  space9: "var(--space-9)",
  space10: "var(--space-10)",
  space11: "var(--space-11)",
  space12: "var(--space-12)",

  // Motion. Nothing here animates yet; `tokens/motion.css` carries the reduced-motion block
  // that keeps it safe when something does.
  durFast: "var(--dur-fast)",
  durBase: "var(--dur-base)",
  easeOut: "var(--ease-out)",

  // Atmosphere: the violet glow the ground is lit by, the orbit lines drawn over it, and the
  // violet wash the illustrative comparison band is filled with — on both latency plots, which
  // draw it through one shared `StripBand` rather than a copy each.
  glowViolet: "var(--glow-violet)",
  orbitLine: "var(--orbit-line)",
  washViolet: "var(--wash-violet)",
};

// Deliberately not `as const`: literal types would make `name: "dark"` the only
// permitted name and each token reference its own type, so a second theme could not be
// assigned to Theme at all — and DefaultTheme propagates that into every template.
export type Theme = typeof theme;
