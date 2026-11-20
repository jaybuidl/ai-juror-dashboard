import styled from "styled-components";
import { VisuallyHidden } from "../styles/hidden";
import type { Figure } from "./cell";

/**
 * A figure's text, and the mark a self-opened reveal carries beside it (ADR-0010).
 *
 * The mark is shorthand for sighted readers who have the legend; the sentence beside it is what
 * a screen reader hears, so the fact never rests on the arrow or on a `title`. The separating
 * space is a text node outside the hidden span, because an accessible name trims each element's
 * own contribution.
 */
export function FigureText({ figure }: { figure: Figure }) {
  if (figure.openedPeriod !== true) return <>{figure.text}</>;

  return (
    <>
      {figure.text}
      <OpenedMark aria-hidden="true">↥</OpenedMark>{" "}
      <VisuallyHidden>
        opened the vote period itself, so measured from when the period could open
      </VisuallyHidden>
    </>
  );
}

const OpenedMark = styled.span`
  margin-inline-start: 0.15em;
`;
