/**
 * The two Kleros ×AI families, self-hosted.
 *
 * The design system's `tokens/fonts.css` fetches these from fonts.googleapis.com. This repo
 * does not: the CSP in `netlify.toml` is written to make read-only structurally true, and a
 * public page that may be cited in research gains nothing from a third-party request on every
 * load. Bundling them keeps `style-src` and `font-src` at `'self'`, so adopting the system
 * cost the policy nothing. The @import is removed from the vendored `tokens/fonts.css`, which
 * says so at the top; `--font-sans` and `--font-mono` there are unchanged, and these packages
 * declare the family names `Manrope` and `JetBrains Mono` exactly as those stacks name them.
 *
 * Latin subset only — every string this dashboard renders is ASCII, and the agent jurors'
 * nicknames are ENS labels, which are too. A nickname outside it would fall back to the system
 * stack rather than fail.
 *
 * Weights follow the system's own @import, with one addition: JetBrains Mono 800. That import
 * stops at 700 while `--type-metric` asks for `800 34px … var(--font-mono)` — the big figures
 * tickets 05 and 07 render. Left at 700 the browser would synthesise the weight; this is the
 * design system's inconsistency, self-hosting is what makes the weight set ours to settle, and
 * it is settled toward what the tokens ask for.
 */
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import "@fontsource/manrope/latin-800.css";

import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import "@fontsource/jetbrains-mono/latin-600.css";
import "@fontsource/jetbrains-mono/latin-700.css";
import "@fontsource/jetbrains-mono/latin-800.css";
