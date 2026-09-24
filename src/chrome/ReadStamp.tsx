import styled from "styled-components";
import { narrow } from "../styles/breakpoints";
import { formatReadAt, type Provenance } from "./provenance";

/**
 * Which disputes this view was read from, and when — one line at the top of the view.
 *
 * All that survives of the provenance footer, which the maintainer removed on 2026-09-24: its
 * other lines were deleted, not moved. Styled as the hero's eyebrow is, so it reads as metadata
 * rather than as a claim. It names no court: the hero's eyebrow does that.
 *
 * Renders nothing where the view rests on no read.
 */

/* Pulled up against whatever follows it: the view's column gap would otherwise leave a line of
   metadata floating a full section away from the content it dates. Each half is kept whole so a
   narrow screen breaks at the separator and nowhere else. */
const Stamp = styled.p`
  margin-bottom: ${({ theme }) => `calc(${theme.space6} - ${theme.space10})`};
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  text-align: right;
  color: ${({ theme }) => theme.textMeta};

  ${narrow} {
    margin-bottom: ${({ theme }) => `calc(${theme.space6} - ${theme.space9})`};
  }

  > span {
    white-space: nowrap;
  }
`;

export function ReadStamp({ provenance }: { provenance: Provenance }) {
  const { read, readAt } = provenance;
  if (read === null) return null;

  return (
    <Stamp>
      <span>
        {read.count === 1
          ? `Read dispute ${read.from}`
          : `Read ${read.count} disputes, ${read.from}–${read.to}`}
      </span>
      {readAt !== null && (
        <>
          {" · "}
          <span>{formatReadAt(readAt)}</span>
        </>
      )}
    </Stamp>
  );
}
