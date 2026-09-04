import { useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigationType } from "react-router";
import styled from "styled-components";
import { Nav } from "./Nav";

/**
 * The shell every view sits inside: the ground it is lit on, the nav, and the view itself.
 *
 * A view reached from a pasted link has to be recognisably part of this dashboard rather than
 * a fragment of one, which is what this file is for — one nav, one read-only statement, one
 * set of destinations, whichever route the visitor arrived at.
 *
 * The footer is not here. It says what the figures *on this view* rest on, so it is composed
 * per view and rendered by `View`, one layer down.
 *
 * Built against the ground and nav of `canvas/Main.dc.html:34-50`.
 */

/*
 * `clip` where there is a `clip`, and `hidden` where there is not.
 *
 * The two clip identically. They differ in one thing that has nothing to do with clipping:
 * `overflow: hidden` makes an element a scroll container — scrollable programmatically even
 * where nothing overflows — and a `position: sticky` descendant sticks to its nearest scroll
 * container rather than to the page. This element wraps every view, so `hidden` here meant no
 * sticky element anywhere in this dashboard could ever stick: ticket 17's frozen column header
 * would scroll away with the rows, silently, with nothing in the console and nothing a jsdom
 * test could see.
 *
 * Behind `@supports` rather than declared outright, because an unsupported `overflow: clip` is
 * dropped whole and leaves this element clipping nothing at all — and what it is clipping is a
 * 1,560px decorative orbit and a matrix wider than the page. Safari below 16 is where that
 * lands. Losing the freeze there is a reduction; letting the page scroll sideways is the one
 * thing this repo says a layout must never do.
 */
const Ground = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  overflow: hidden;

  @supports (overflow: clip) {
    overflow: clip;
  }
`;

/**
 * The violet glow and the two orbit rings: decoration, and nothing else.
 *
 * `pointer-events: none` and `aria-hidden`, because nothing here carries a figure, a label, or
 * the contrast anything else depends on — remove the whole layer and the page still reads.
 */
const Atmosphere = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
`;

const Glow = styled.div`
  position: absolute;
  inset: 0 0 auto 0;
  height: 720px;
  background: ${({ theme }) => theme.glowViolet};
`;

const Orbit = styled.div`
  position: absolute;
  border: 1px solid ${({ theme }) => theme.orbitLine};
  border-radius: 50%;
`;

const OrbitLeft = styled(Orbit)`
  left: -240px;
  top: -520px;
  width: 1560px;
  height: 1560px;
`;

const OrbitRight = styled(Orbit)`
  right: -560px;
  top: -180px;
  width: 1180px;
  height: 1180px;
  opacity: 0.6;
`;

const Content = styled.div`
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
`;

/**
 * What a hash in the URL does.
 *
 * `/method#window` is a real destination — the matrix's window footnote links exactly there —
 * and a router that only swapped the component would leave the reader at the top of a long
 * page wondering which part was meant. On a plain route change the page returns to the top,
 * because a visitor arriving at the method page from halfway down the matrix should not land
 * halfway down the method page.
 *
 * Both calls are guarded: `scrollIntoView` does not exist in jsdom, and scrolling to the top
 * is skipped when the page is already there — which is always, under a test.
 */
function useScrollForLocation(): void {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  const previous = useRef(pathname);
  // False for the first effect run only. `previous` cannot answer this — it is seeded with the
  // current path, so a first render and a same-path hash change look identical to it.
  const settled = useRef(false);

  useEffect(() => {
    if (hash !== "") {
      previous.current = pathname;
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target !== null && typeof target.scrollIntoView === "function") {
        target.scrollIntoView();
      }
      /*
       * And focus the section, not just scroll to it.
       *
       * These are not exotic links: `/method#window` from the stat tiles, the matrix's window
       * footnote and every marked marginal figure; `/method#caveats` from the lone-panel marks;
       * `/method#partial` from the failure banner. Every one changes the route, which unmounts
       * the link that was activated — so an early return here, before the focus move below,
       * dropped the reader on `<body>`: the exact defect this effect was extended to fix,
       * reintroduced on the links most likely to be followed by someone reading carefully.
       *
       * The target rather than `<main>`, because a hash names a part of a page and scrolling
       * there while reading from the top is the same mismatch one step along. `tabindex="-1"`
       * is set here rather than in the markup so that every id addressable by a hash gets it
       * without each view having to remember.
       *
       * Gated on `settled` and not on the pathname changing: the method page's own contents
       * list is seven same-page anchors, and following one of those wants the section focused
       * every bit as much as arriving from another view does. What must not happen is a focus
       * grab on *first* render, where the visitor typed the URL and focus belongs to the
       * browser's chrome.
       */
      if (settled.current && target instanceof HTMLElement) {
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus();
      }
      return;
    }

    // Only on an actual move forward between views. On first render the visitor is already
    // where they asked to be, and on a `POP` — back or forward — the browser is restoring the
    // position they left, which is the one thing this must not undo: a reader who followed the
    // matrix's window footnote to /method and pressed Back wants the footnote, not the top of
    // a long grid.
    if (previous.current === pathname || navigationType === "POP") {
      previous.current = pathname;
      return;
    }
    previous.current = pathname;

    const scrolled = document.scrollingElement?.scrollTop ?? 0;
    if (scrolled > 0) window.scrollTo({ top: 0 });

    /*
     * And take the reader with it. A route change here swaps a subtree and nothing else, so a
     * keyboard or screen-reader user is left focused on a link inside a document that no longer
     * exists — or, once React unmounts it, on `<body>`, which is the top of the tab order and
     * tells them nothing about where they have arrived. A real page load would have put them at
     * the start of the new document; this does the same thing.
     *
     * `<main>` and not the heading, because focusing the landmark starts the reading at the top
     * of the view and leaves the heading to be announced as part of it. It runs under the same
     * two guards as the scroll above, and for the same reasons: not on first render, where the
     * visitor is already where they asked to be and focus belongs to the browser's own chrome;
     * and not on `POP`, where the browser is restoring a position the reader chose.
     *
     * The other half of the announcement is `useDocumentTitle`, which each view calls for
     * itself. Neither half is enough alone: a title change is what a reader hears on arrival
     * and reads back out of a history menu, and this is what decides where they are standing
     * once they get there.
     *
     * `preventScroll`, and it is not optional. Focusing an element also asks the browser to
     * scroll it into view, and `<main>` deliberately does not start at the top of the document
     * — the nav is 68px plus a hairline and `View`'s frame adds 48px of padding above it. So
     * the default undid the `scrollTo` three lines up and left the reader 117px down with the
     * header off screen, on every single navigation. Where the page should sit is decided
     * above; this line moves focus and nothing else. Nothing in the offline suite can see any
     * of this: jsdom has no layout, so both the scroll and its undoing are invisible there.
     */
    const main = document.querySelector("main");
    if (main instanceof HTMLElement) main.focus({ preventScroll: true });
  }, [pathname, hash, navigationType]);

  // After every run, including the ones that returned early.
  useEffect(() => {
    settled.current = true;
  });
}

export function Shell() {
  useScrollForLocation();

  return (
    <Ground>
      <Atmosphere aria-hidden="true">
        <Glow />
        <OrbitLeft />
        <OrbitRight />
      </Atmosphere>
      <Content>
        <Nav />
        <Outlet />
      </Content>
    </Ground>
  );
}
