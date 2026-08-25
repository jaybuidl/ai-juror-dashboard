import styled from "styled-components";

/**
 * Read by a screen reader, drawn for nobody.
 *
 * The keys, glyphs and markers beside a figure on this page are shorthand for people who can see
 * the legend a few lines above them. Shared rather than redeclared per module because the matrix
 * and its column headers sit inside one table: two copies would be two chances for one of them
 * to lose `white-space: nowrap` and start collapsing a screen reader's only label into the
 * layout it is hidden from.
 */
export const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
  /* Refused rather than inherited, because the elements this sits inside are very often the ones
     carrying a decorative one: every key and label on this page is an uppercased mono chip. Some
     screen readers announce uppercased text letter by letter, so a hidden label nested in one
     comes out as "M-E-D-I-A-N R-E-V-E-A-L" — the announcement made worse by the element that
     exists to make it better, and unreachable any other way because the visible abbreviation
     beside it is aria-hidden. A transform is a fact about how text is drawn, and nothing here
     is drawn. */
  text-transform: none;
`;
