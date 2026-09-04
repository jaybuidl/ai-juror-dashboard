import type { ReactElement } from "react";
import styled from "styled-components";
import type { Stack } from "./agent-jurors";
import hermesMark from "./hermes-agent.png";

/**
 * A small monochrome mark for the stack an agent juror runs on.
 *
 * **Beside the stack label, never instead of it.** Both render sites already say why the label
 * itself stays — which stack an agent juror is built on is a fact about the roster, true whether
 * or not ENS answers — and the same reasoning covers a mark that fails to draw. The mark is
 * `aria-hidden` throughout and the accessible name is the label alone, so nothing here is the
 * sole carrier of anything.
 *
 * **Vendored, not hot-linked, and that is a decision rather than a constraint.** The policy in
 * `netlify.toml` allows arbitrary https hosts on `img-src` — it has to, because ENS avatars come
 * from anywhere — so both remote marks below would load perfectly well from their own hosts.
 * Three reasons not to: this repo has no remote assets at all and self-hosts its fonts and its
 * design system on purpose; one of the two source URLs carries a `?v=3` cache-buster and is
 * therefore versioned and free to move under us; and a third-party host sees the address of
 * every reader of a public page that may be cited in research. Nothing about this needed a
 * change to `netlify.toml`.
 *
 * **But not because a vendored asset is 'self'.** The three inline marks are markup and reach no
 * policy at all, and the raster is 817 bytes — under Vite's 4096-byte `assetsInlineLimit` — so it
 * does not ship as a file either: `dist/` contains no PNG, and the bundle carries one
 * `data:image/png;base64` URI. It loads because `img-src` lists `data:`. Anyone hardening that
 * directive has to drop `data:` knowing this mark goes with it, and it goes **only in
 * production**: Vite dev and `yarn preview` send no CSP, so the loss is invisible until deploy.
 *
 * These are the first image assets in the repository. Each one's source is recorded beside it.
 *
 * The marks were supplied on a sheet that also pulled DM Mono from Google Fonts. Nothing but the
 * artwork was taken from it, and that is worth saying because the type would have failed only in
 * production: `style-src 'self' 'unsafe-inline'` and `font-src 'self' data:` both block the
 * request, while Vite dev and `yarn preview` send no CSP at all, so the fallback font would look
 * perfect on every machine it was checked on.
 */

/**
 * One mark, at the size the system's own scale offers for it.
 *
 * `--space-5` is 12px and `--type-mono-sm` is 11px on 1.2, so the mark sits inside the 13.2px
 * line box of the label it accompanies. That is the reason for the size rather than taste: on
 * the agent-juror page the label is a pill in a row of pills laid out with `align-items: center`,
 * and a mark taller than the line box would make one pill taller than its neighbours. There is
 * no artboard to cite — `Juror.dc.html` draws this identity block and draws no icon in it, and
 * `/agent-jurors` has no artboard at all.
 */
const Mark = styled.svg`
  display: block;
  flex: none;
  width: ${({ theme }) => theme.space5};
  height: ${({ theme }) => theme.space5};
`;

/**
 * The one mark with no vector source, monochromed by filter.
 *
 * Both source paths under lobehub's static-svg 404 in light and dark alike; only the PNG exists.
 * Redrawing it by hand is the thing this comment exists to prevent — an approximation of
 * somebody's mark is worse than the mark.
 *
 * The filter is theme-aware, which the source sheet's was not: it applied brightness(0) invert(1)
 * unconditionally, and that is correct only on a dark ground. Dark is the default here and light
 * is the override, matching how tokens/themes.css is written. Today the light branch is
 * unreachable — the light theme is vendored and wired to nothing, no data-theme attribute exists
 * anywhere in the app, and docs/contrast.md records that — so it is written for the day the
 * attribute arrives and verified by setting it by hand.
 *
 * The opacity is what the other three marks get for free from currentColor: they ink at
 * --text-meta, and a filter can only take this one to pure white or pure black. Composited over
 * the surfaces these actually sit on, the value that matches the label beside it is about 0.63
 * on dark and about 0.55 on light, so one number serves both. It is a visual match within a set
 * of four and nothing depends on it — the mark is decorative and duplicates a visible label — so
 * it carries no contrast requirement of its own.
 *
 * What the filter cannot do is follow the ink into the accent pill on the agent-juror page: the
 * three inline marks turn teal there with the label, because they are currentColor, and this one
 * stays neutral. On the roster, where every mark inks at --text-meta, all four agree. Worth
 * knowing before reaching for a filter to fix something else here — a CSS mask over
 * background-color: currentColor would take the accent, at the cost of being a mask.
 */
const Raster = styled.img`
  display: block;
  flex: none;
  width: ${({ theme }) => theme.space5};
  height: ${({ theme }) => theme.space5};
  filter: brightness(0) invert(1);
  opacity: 0.6;

  [data-theme="light"] & {
    filter: brightness(0);
  }
`;

/**
 * A burst of four strokes through one centre.
 *
 * No source URL, unlike the two below: this one and the Grok Bot mark arrived as paths on a sheet
 * the maintainer supplied, and that sheet was a scratch file. Ticket 26 copied the paths into
 * itself for exactly this reason, so the record of where they came from is the ticket.
 */
function ClaudeMark(): ReactElement {
  return (
    <Mark
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 3.4v17.2M3.4 12h17.2M5.9 5.9l12.2 12.2M18.1 5.9L5.9 18.1" />
    </Mark>
  );
}

/** A ring with two slashes across it. Same provenance as the mark above: ticket 26, not a URL. */
function GrokBotMark(): ReactElement {
  return (
    <Mark
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.4" strokeWidth="1.6" />
      <path d="M9.2 10.6 11 15.2" strokeWidth="3.2" />
      <path d="M15.4 8.6 17 12.3" strokeWidth="3.2" />
    </Mark>
  );
}

/**
 * The lobster, from https://agents.circle.com/assets/agents/open-claw.svg?v=3 — real vector,
 * 1194 bytes, reproduced here with its colour taken out.
 *
 * What came out: a red linearGradient filling the body and both claws, a red stroke on the two
 * antennae, and the eyes — two dark discs with teal pupils. The gradient and the stroke become
 * currentColor. The eyes are dropped rather than cut out of the silhouette with a mask, because
 * at the 12px this draws at their radius is 0.6px: two holes that small read as dirt on the
 * mark, not as eyes. What is left is the outline, which is what identifies it at this size.
 */
function OpenClawMark(): ReactElement {
  return (
    <Mark viewBox="0 0 120 120" fill="currentColor" aria-hidden="true">
      <path d="M60 10 C30 10 15 35 15 55 C15 75 30 95 45 100 L45 110 L55 110 L55 100 C55 100 60 102 65 100 L65 110 L75 110 L75 100 C90 95 105 75 105 55 C105 35 90 10 60 10Z" />
      <path d="M20 45 C5 40 0 50 5 60 C10 70 20 65 25 55 C28 48 25 45 20 45Z" />
      <path d="M100 45 C115 40 120 50 115 60 C110 70 100 65 95 55 C92 48 95 45 100 45Z" />
      <path
        d="M45 15 Q35 5 30 8M75 15 Q85 5 90 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </Mark>
  );
}

/**
 * The portrait, downscaled from
 * https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/light/hermesagent.png
 * — 640x640, palette with a tRNS chunk, so the ground is genuinely transparent and the filter
 * has only the artwork to act on. Vendored at 24px: twice the 12px it draws at.
 */
function HermesMark(): ReactElement {
  return <Raster src={hermesMark} alt="" aria-hidden="true" />;
}

/**
 * The stacks that have a mark, keyed by the label in the roster.
 *
 * Four and not seven, because agent jurors share stacks. Keyed on the label rather than on the
 * agent juror so that the next entry running an existing stack draws its mark with no edit here.
 */
const MARKS: Record<string, () => ReactElement> = {
  "claude -p": ClaudeMark,
  "Grok Bot": GrokBotMark,
  Hermes: HermesMark,
  OpenClaw: OpenClawMark,
};

/**
 * Whether a stack label has a mark.
 *
 * Exported for one test, and that test is the point of this function: a stack with no mark
 * renders its label alone, which is the correct fallback and therefore looks like nothing is
 * wrong. The roster grows, so the check is derived from `ROSTER` rather than from a count.
 */
export function hasStackIcon(label: string): boolean {
  return Object.hasOwn(MARKS, label);
}

/**
 * The mark for one stack, or nothing at all — never an empty box holding a gap open.
 *
 * Through `hasStackIcon` and not through a bare index, so the two are one predicate rather than
 * two that agree on every label anyone has tried. `MARKS` is an object literal and still carries
 * `Object.prototype`, so a stack labelled `toString` or `valueOf` indexes to a function: the
 * undefined check would pass it through and React would draw a prototype method into the pill.
 */
export function StackIcon({ stack }: { stack: Stack }): ReactElement | null {
  if (!hasStackIcon(stack.label)) return null;

  const Draw = MARKS[stack.label] as () => ReactElement;
  return <Draw />;
}
