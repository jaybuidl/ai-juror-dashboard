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

const Ground = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  overflow: hidden;
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

  useEffect(() => {
    if (hash !== "") {
      previous.current = pathname;
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target !== null && typeof target.scrollIntoView === "function") {
        target.scrollIntoView();
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
  }, [pathname, hash, navigationType]);
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
