import { Link, useLocation } from "react-router";
import styled, { css } from "styled-components";
import { narrow } from "../styles/breakpoints";
import { Lockup } from "./Lockup";

/**
 * The nav, built against `canvas/Main.dc.html:41-50`.
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
 * The read-only pill is not a control. It is the invariant from `CLAUDE.md` — this dashboard
 * never votes, stakes, holds a key or connects a wallet — restated where a visitor meets the
 * page, and it is a `<span>` so that nothing about it invites a click.
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

  ${narrow} {
    height: auto;
    flex-direction: column;
    align-items: flex-start;
    gap: ${({ theme }) => theme.space5};
    padding: ${({ theme }) => `${theme.space6} ${theme.gutter}`};
  }
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

  ${narrow} {
    flex-wrap: wrap;
    gap: ${({ theme }) => theme.space6};
  }
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

const ReadOnly = styled.span`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => `${theme.space3} ${theme.space5}`};
  border: 1px solid ${({ theme }) => theme.borderCardColor};
  border-radius: ${({ theme }) => theme.radiusChip};
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textMeta};
`;

export function Nav() {
  const { pathname } = useLocation();
  const atMatrix = isCurrent("/", pathname);

  return (
    <Bar aria-label="Dashboard">
      <Inner>
        {/* On the matrix the lockup is not a link, and `role="img"` is then load-bearing: an
            `aria-label` on a bare span is ignored, and both of the lockup's children are
            `aria-hidden`, so without it the mark would have no accessible name at all. */}
        {atMatrix ? (
          <HomeMark role="img" aria-label="Kleros ×AI">
            <Lockup />
          </HomeMark>
        ) : (
          <HomeLink to="/" aria-label="Kleros ×AI — the matrix">
            <Lockup />
          </HomeLink>
        )}
        <Destinations>
          {DESTINATIONS.map(({ path, label }) =>
            isCurrent(path, pathname) ? (
              <DestinationHere key={path} aria-current="page">
                {label}
              </DestinationHere>
            ) : (
              <DestinationLink key={path} to={path}>
                {label}
              </DestinationLink>
            ),
          )}
          {/* A statement, not a control: no button, no toggle, nothing focusable. */}
          <ReadOnly>Read only</ReadOnly>
        </Destinations>
      </Inner>
    </Bar>
  );
}
