import type { ReactNode } from "react";
import styled from "styled-components";
import { narrow } from "../styles/breakpoints";
import { DegradedPanel, FailureBanner } from "./Failure";
import { Footer } from "./Footer";
import { type Failures, NO_FAILURES } from "./failures";
import type { Provenance } from "./provenance";

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
 * `measure` is for pages that are read rather than scanned. The matrix wants the full 1200px;
 * the method page is prose, and prose set to 1200px is prose nobody finishes.
 */

const Frame = styled.div<{ $measure: "wide" | "prose" }>`
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  margin: 0 auto;
  padding: ${({ theme }) => `${theme.space11} ${theme.gutter} 0`};
  max-width: ${({ theme, $measure }) =>
    $measure === "prose" ? theme.containerNarrow : theme.container};

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
`;

export function View({
  provenance,
  failures = NO_FAILURES,
  measure = "wide",
  children,
}: {
  provenance: Provenance;
  failures?: Failures;
  measure?: "wide" | "prose";
  children: ReactNode;
}) {
  return (
    <Frame $measure={measure}>
      <Main>
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
      <Footer provenance={provenance} />
    </Frame>
  );
}
