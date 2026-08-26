import { createGlobalStyle } from "styled-components";

/**
 * What is left after `kleros-ai/tokens/base.css`.
 *
 * That file is the design system's reset and it owns the page outright: box-sizing, the body
 * background, colour, font and smoothing, `h1`–`h4`, `p`, `a`, `button`, `code, kbd, samp, pre`,
 * `:focus-visible` and `::selection`. Everything this file used to declare has been deleted rather
 * than left to win on load order — a duplicate that agreed today would go on winning silently the
 * day the system changed its mind.
 *
 * Four rules survive, each because the system has no opinion on it.
 */
export const GlobalStyle = createGlobalStyle`
  html {
    /* Nowhere in the design system, and worth keeping: it is what makes the scrollbars,
       the form controls and the caret dark. Losing it leaves light-mode chrome on an ink page. */
    color-scheme: dark;
  }

  body {
    min-height: 100dvh;

    /* No glow here. It used to paint --glow-violet as a background-image over base.css's flat
       --page, 720px from the top — and Shell.tsx's <Glow> paints the same gradient at the same
       size and position inside <Atmosphere>. Two identical translucent layers composite: a
       declared peak of a compounded to 1-(1-a)^2, so the 0.45 in the token rendered as 0.70 and
       nothing looked wrong because the result was simply a stronger glow. It mattered once the
       glow was measured as a text ground (ticket 18): the figure computed from the token was not
       the figure on the screen. One paint, in Shell, where it sits with the orbits it belongs to
       and inherits their aria-hidden. */
  }

  /* The focus ring is base.css's: outline: none plus a --ring-focus box-shadow, which is the
     system's look and is what ticket 18 will measure. Forced colours is the one place it fails —
     the browser drops box-shadows entirely there, and a ring that is only a shadow disappears. An
     outline is restored for that mode alone, so this is not a second ring competing with the
     first. */
  @media (forced-colors: active) {
    :focus-visible {
      outline: 2px solid CanvasText;
      outline-offset: 2px;
    }
  }
`;
