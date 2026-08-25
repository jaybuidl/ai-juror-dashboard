import type { ReactNode } from "react";
import styled from "styled-components";
import { narrow } from "../styles/breakpoints";
import { Footer } from "./Footer";
import type { Provenance } from "./provenance";

/**
 * One view: its content, and the footer saying what that content rests on.
 *
 * Every route renders through this, which is what makes "every view ends with the same
 * provenance footer" structural rather than a habit — a view that forgot would have no frame
 * and no measure either, and would look wrong immediately.
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
  measure = "wide",
  children,
}: {
  provenance: Provenance;
  measure?: "wide" | "prose";
  children: ReactNode;
}) {
  return (
    <Frame $measure={measure}>
      <Main>{children}</Main>
      <Footer provenance={provenance} />
    </Frame>
  );
}
