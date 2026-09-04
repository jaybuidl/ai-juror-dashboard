import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import styled, { css } from "styled-components";
import { useIsNarrow } from "../styles/breakpoints";
import { Lockup } from "./Lockup";

/**
 * The nav, built against `canvas/Main.dc.html:41-50` and, below the breakpoint,
 * `canvas/Mobile.dc.html:32-42`.
 *
 * Every destination here is a real route, and this file is the only place they are listed —
 * the route table renders these same paths, and a destination pointing nowhere would be a
 * click a visitor loses. Tickets 09 and 11 add views *under* these rather than beside them: a
 * dispute sits under the matrix and an agent juror under the agent-juror index, which is what
 * the breadcrumb says.
 *
 * The current destination is deliberately not a link. A link to the page you are already on is
 * a promise the browser cannot keep, and rendering it as text is also the clearest way to mark
 * it: `aria-current="page"`, a brighter ink and a rule under it, so the distinction survives a
 * reader who cannot separate the two colours.
 *
 * **The bar carries no read-only label**, and the invariant is not weakened by that. There was
 * one — a pill wide, the bare words folded — and the maintainer removed both, on the judgement
 * that the chrome was stating the invariant a third time. Where a reader meets it now is the
 * footer, which opens with it in full on every view, and the method page, which states it
 * again. Nothing here should be written as though this nav were that place.
 *
 * **Folded, the bar is still one line.** Ticket 15 left the narrow nav stacked over three rows,
 * which was legible and not final; ticket 16 does what the artboard shows. The lockup becomes
 * its own wordmark and the four destinations go behind one menu affordance.
 *
 * The destinations *fold* and are never dropped. A menu that hid a route on a phone would be a
 * route a phone visitor could not reach, which is the same failure ticket 15 refused when it
 * ruled that a nav entry needs an index or does not appear.
 */

export type Destination = {
  path: string;
  label: string;
};

/**
 * The four destinations, in the canvas's order.
 *
 * Disputes and agent jurors are here because this ticket gave each one an index to arrive at.
 * Until it did they were labels on an artboard with nowhere to go, and the rule was explicit:
 * either an index, or not shown at all.
 */
export const DESTINATIONS: readonly Destination[] = [
  { path: "/", label: "Matrix" },
  { path: "/disputes", label: "Disputes" },
  { path: "/agent-jurors", label: "Agent jurors" },
  { path: "/method", label: "Method" },
];

/**
 * Whether a destination is the one being looked at.
 *
 * A child route counts: a dispute at `/disputes/152` is under the disputes destination, and a
 * nav that went blank there would tell a visitor they had left the dashboard. `/` is the
 * exception — it prefixes everything, so it matches only itself.
 */
export function isCurrent(path: string, pathname: string): boolean {
  const here = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (path === "/") return here === "/";
  return here === path || here.startsWith(`${path}/`);
}

/* Full-bleed, so the rule under it crosses the whole page as it does on the artboard. */
const Bar = styled.nav`
  border-bottom: ${({ theme }) => theme.borderHairline};
`;

/* The contents, held to the same measure as every view's, so nav and page align. */
const Inner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space9};
  height: ${({ theme }) => theme.navHeight};
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.gutter};
  max-width: ${({ theme }) => theme.container};
`;

/* One line, at the artboard's 56px, and the gap closes to what a phone can spare. */
const NarrowInner = styled(Inner)`
  height: 56px;
  gap: ${({ theme }) => theme.space5};
`;

const home = css`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space2};
  color: ${({ theme }) => theme.textHeading};
  text-decoration: none;
`;

const HomeLink = styled(Link)`
  ${home}

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.focusRing};
    outline-offset: 4px;
  }
`;

const HomeMark = styled.span`
  ${home}
`;

const Destinations = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space9};
`;

const destination = css`
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  text-decoration: none;
  padding-bottom: ${({ theme }) => theme.space1};
  border-bottom: 1px solid transparent;
`;

const DestinationLink = styled(Link)`
  ${destination}
  color: ${({ theme }) => theme.textMeta};

  &:hover {
    color: ${({ theme }) => theme.textBody};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.focusRing};
    outline-offset: 3px;
  }
`;

const DestinationHere = styled.span`
  ${destination}
  color: ${({ theme }) => theme.textHeading};
  border-bottom-color: ${({ theme }) => theme.accent};
`;

const NarrowRight = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space5};
`;

/* The artboard's 30px box with a `≡` in it. A real button, because it does something. */
const MenuButton = styled.button`
  display: flex;
  width: 30px;
  height: 30px;
  flex: none;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.borderCardColor};
  border-radius: ${({ theme }) => theme.radiusChip};
  background: none;
  font: ${({ theme }) => theme.typeMonoSm};
  font-size: 13px;
  color: ${({ theme }) => theme.textMeta};
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.focusRing};
    outline-offset: 3px;
  }
`;

/* The panel the menu opens: the same four destinations, stacked, under the same rule the bar
   draws. Below the bar rather than over the page, so it pushes the hero down instead of
   covering it — nothing here is urgent enough to warrant a scrim. */
const MenuPanel = styled.div`
  display: flex;
  flex-direction: column;
  /* Shrink-wrapped, not stretched. The current destination is marked by a rule under it, and a
     stretched span draws that rule across the whole panel — which reads as a divider rather
     than as a mark on one word. It is right in the bar only because a row does not stretch. */
  align-items: flex-start;
  gap: ${({ theme }) => theme.space6};
  margin: 0 auto;
  padding: ${({ theme }) => `${theme.space6} ${theme.gutter} ${theme.space8}`};
  max-width: ${({ theme }) => theme.container};
  border-top: ${({ theme }) => theme.borderHairline};
`;

export function Nav() {
  const { pathname } = useLocation();
  const isNarrow = useIsNarrow();

  return isNarrow ? <FoldedNav pathname={pathname} /> : <WideNav pathname={pathname} />;
}

function WideNav({ pathname }: { pathname: string }) {
  return (
    <Bar aria-label="Dashboard">
      <Inner>
        <Home pathname={pathname} />
        <Destinations>
          {DESTINATIONS.map((destination) => (
            <DestinationItem key={destination.path} {...destination} pathname={pathname} />
          ))}
        </Destinations>
      </Inner>
    </Bar>
  );
}

/**
 * The folded bar: wordmark and menu.
 *
 * The panel closes on navigation, which is not a nicety — react-router does not unmount this
 * nav between routes, so a menu left open would stay open over the page the visitor just asked
 * for, and the first thing they would have to do on arriving is dismiss it. Escape closes it
 * too, because a disclosure that can only be dismissed by pointing at the thing that opened it
 * is one a keyboard user is stuck inside.
 */
function FoldedNav({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  // React's own way to reset state when a prop changes: remember the last path and adjust
  // during render, so the menu closes with the render that shows the new page rather than one
  // render after it.
  //
  // It was `open = openFor === pathname` and that was wrong in a way review caught and the
  // forward-navigation test could not: `openFor` was never cleared, so opening the menu at `/`,
  // going to `/method` and then coming Home again found `openFor` still `"/"` and the panel
  // open on arrival. Back did the same. What has to be watched is the path *changing*, not the
  // path matching.
  const [shownPath, setShownPath] = useState(pathname);
  if (shownPath !== pathname) {
    setShownPath(pathname);
    setOpen(false);
  }

  const button = useRef<HTMLButtonElement | null>(null);
  // Whether the panel was dismissed rather than navigated away from. Only a dismissal gets the
  // focus back: a navigation is already taking the reader somewhere, and `Shell` moves focus
  // into the new view, so grabbing it for a button in the old chrome would fight that.
  const dismissed = useRef(false);

  useEffect(() => {
    if (!open) return;

    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      dismissed.current = true;
      setOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  useEffect(() => {
    if (open || !dismissed.current) return;
    dismissed.current = false;

    /*
     * Escape unmounts the panel, and with it whichever of its four links had focus — so focus
     * fell to `<body>`, silently, at the top of the tab order. The comment above says Escape
     * exists so that a keyboard reader is not stuck inside the disclosure; without this it only
     * moved the problem one step later, because the reader is then somewhere they did not
     * choose with nothing on screen saying where. Focus belongs on the control that owns the
     * panel, which is also where a reader who opened it started.
     */
    button.current?.focus();
  }, [open]);

  return (
    <Bar aria-label="Dashboard">
      <NarrowInner>
        <Home pathname={pathname} wordmark />
        <NarrowRight>
          <MenuButton
            ref={button}
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? "Close the menu" : "Open the menu"}
            onClick={() => setOpen((was) => !was)}
          >
            <span aria-hidden="true">≡</span>
          </MenuButton>
        </NarrowRight>
      </NarrowInner>
      {open && (
        <MenuPanel id={panelId}>
          {DESTINATIONS.map((destination) => (
            <DestinationItem key={destination.path} {...destination} pathname={pathname} />
          ))}
        </MenuPanel>
      )}
    </Bar>
  );
}

/**
 * The lockup, and whether it is a link.
 *
 * On the matrix it is not, and `role="img"` is then load-bearing: an `aria-label` on a bare
 * span is ignored, and both of the lockup's children are `aria-hidden`, so without it the mark
 * would have no accessible name at all.
 */
function Home({ pathname, wordmark = false }: { pathname: string; wordmark?: boolean }) {
  return isCurrent("/", pathname) ? (
    <HomeMark role="img" aria-label="Kleros ×AI">
      <Lockup wordmark={wordmark} />
    </HomeMark>
  ) : (
    <HomeLink to="/" aria-label="Kleros ×AI — the matrix">
      <Lockup wordmark={wordmark} />
    </HomeLink>
  );
}

function DestinationItem({ path, label, pathname }: Destination & { pathname: string }) {
  return isCurrent(path, pathname) ? (
    <DestinationHere aria-current="page">{label}</DestinationHere>
  ) : (
    <DestinationLink to={path}>{label}</DestinationLink>
  );
}
