import type { ReactNode } from "react";
import styled from "styled-components";
import { COMFORTABLE_GRID_MIN_PX, narrow } from "../styles/breakpoints";
import { DegradedPanel, FailureBanner } from "./Failure";
import { Footer } from "./Footer";
import { type Failures, NO_FAILURES } from "./failures";
import type { Provenance } from "./provenance";

/** How wide a view may be. See the note on `measure` below. */
export type Measure = "wide" | "prose" | "grid";

/**
 * One view: what could not be read, its content, and the footer saying what that content rests on.
 *
 * Every route renders through this, which is what makes "every view ends with the same
 * provenance footer" structural rather than a habit — a view that forgot would have no frame
 * and no measure either, and would look wrong immediately. Ticket 13's banner is mounted the
 * same way and for the same reason: "once in a banner at the top of the page" is a claim about
 * every view, so a page that failed to render one has to be impossible rather than merely
 * unusual. It draws nothing when nothing is wrong, so mounting it costs a healthy page nothing.
 *
 * `failures` defaults to none, which is what the method page and the 404 pass — neither carries
 * a figure, and the 404 in particular must never look like a failure state: Netlify answers
 * every unknown path with the app shell at HTTP 200, and that view's whole job is to say the
 * address is wrong and nothing failed to load.
 *
 * `measure` is how wide the view is allowed to be, and there are three answers because there are
 * three kinds of page here. "prose" is for a page that is read rather than scanned — the method
 * page, where 1200px is prose nobody finishes. "wide" is the 1200px default. "grid" is wider
 * still and belongs to exactly one view: the matrix declares a 440px row header and a 148px column
 * per agent juror, and at "wide" the page had 1104px of content to give it, so it scrolled
 * sideways in its own box on every desktop. The width is derived from that measurement rather than
 * chosen — the grid's own minimum plus the gutters either side of it — so it cannot drift from the
 * grid it exists to fit, and it widened on its own the day the roster gained a seventh entry
 * (ticket 24), because `COMFORTABLE_GRID_MIN_PX` did.
 */

const Frame = styled.div<{ $measure: Measure }>`
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  margin: 0 auto;
  padding: ${({ theme }) => `${theme.space11} ${theme.gutter} 0`};
  max-width: ${({ theme, $measure }) => {
    if ($measure === "prose") return theme.containerNarrow;
    /* border-box is global, so this includes the gutters rather than adding to them — the
       distinction between a page that fits and one that scrolls sideways. */
    if ($measure === "grid") return `calc(${COMFORTABLE_GRID_MIN_PX}px + 2 * ${theme.gutter})`;
    return theme.container;
  }};

  ${narrow} {
    padding-top: ${({ theme }) => theme.space9};
  }
`;

const Main = styled.main`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${({ theme }) => theme.space10};

  ${narrow} {
    gap: ${({ theme }) => theme.space9};
  }

  /* box-shadow, not outline. The design system's focus ring is "outline: none" plus a
     --ring-focus box-shadow, so suppressing the outline here suppressed nothing at all — and
     Chrome matches :focus-visible on a scripted focus when the last interaction was a keyboard
     one, which is exactly how a reader arrives: Enter on a nav link. A 2px cyan halo would then
     be drawn around the entire view on every navigation. Nothing is suppressed for a pointer or
     for a keyboard landing on a real control; this is a container that takes focus so the view
     is read from its start, and a box around the whole page says a control is focused when none
     is. */
  &:focus-visible {
    outline: none;
    box-shadow: none;
  }
`;

export function View({
  provenance,
  failures = NO_FAILURES,
  measure = "wide",
  footerNote,
  children,
}: {
  provenance: Provenance;
  failures?: Failures;
  measure?: Measure;
  /**
   * One caveat a view may put in the footer rather than in its own body, above the identity
   * line. It is a node and not a string because the only thing passing one is a component
   * shared with another layout — see `Footer`'s note on where this sits and why.
   */
  footerNote?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Frame $measure={measure}>
      {/*
        `tabIndex={-1}` so `Shell` can move focus here after a route change. Not reachable by
        Tab — a negative index is programmatic focus only — so it costs no tab stop, and the
        ring is suppressed below because a container focused by script is not a control anyone
        pointed at and drawing a 2px cyan box around the whole view would say it was.
      */}
      <Main tabIndex={-1}>
        <FailureBanner failures={failures} />
        {/* Below the banner and above the content, in the same place on every view — so the
            reader learns one location for "something is not right here" and the two tiers are
            told apart by how they look rather than by where they turn up. */}
        {failures.degraded.map((read) => (
          <DegradedPanel key={read.source.name} heading={read.heading}>
            {read.what}
          </DegradedPanel>
        ))}
        {children}
      </Main>
      <Footer provenance={provenance} note={footerNote} />
    </Frame>
  );
}
