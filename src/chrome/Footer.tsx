import styled from "styled-components";
import { formatReadAt, type Provenance } from "./provenance";

/**
 * The provenance footer, built against `canvas/Main.dc.html:225-227`.
 *
 * It opens with the read-only statement, and then says what the figures above it rest on: what
 * was measured, which disputes were read and when, and anything on screen that is not a read.
 * Every line is rendered text — never a `title`, never a hover — because a caveat a reader has
 * to uncover is not a visible one (`CLAUDE.md`).
 *
 * The mockup's "these values are sampled" disclaimer is deliberately not carried across: none
 * of this product's figures are sampled. What replaces it is the line between what has been
 * read and what has not, which is the sentence a citing reader actually needs.
 */

const Bar = styled.footer`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space5};
  margin-top: ${({ theme }) => theme.space11};
  padding-top: ${({ theme }) => theme.space7};
  padding-bottom: ${({ theme }) => theme.space10};
  border-top: ${({ theme }) => theme.borderHairline};
`;

const Line = styled.p`
  max-width: 90ch;
  font: ${({ theme }) => theme.typeBodySm};
  font-feature-settings: ${({ theme }) => theme.featureNumeric};
  color: ${({ theme }) => theme.textMeta};
`;

/** The one sentence that is the same on every view, because the invariant is. */
const ReadOnly = styled(Line)`
  color: ${({ theme }) => theme.textBody};
`;

const Caveats = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space3};
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Caveat = styled.li`
  display: flex;
  gap: ${({ theme }) => theme.space4};
  max-width: 90ch;
  font: ${({ theme }) => theme.typeBodySm};
  /* The shorthand above resets it, and these carry counts — "5 of 16 titles", "Dispute 155". */
  font-feature-settings: ${({ theme }) => theme.featureNumeric};
  color: ${({ theme }) => theme.textMeta};

  &::before {
    content: "◇";
    flex: none;
    color: ${({ theme }) => theme.stateWork};
  }
`;

export function Footer({ provenance }: { provenance: Provenance }) {
  const { measures, read, readAt, caveats, identifiesAgentJurors } = provenance;

  return (
    <Bar>
      <ReadOnly>
        Read only. This dashboard observes and reports; it never votes, stakes, holds a key, or
        connects a wallet.
      </ReadOnly>

      <Line>{measures}</Line>

      <Line>
        {read === null ? (
          // Deliberately not "the read failed": a view can carry no dispute figure because it
          // has none to carry — the method page is prose — and the footer is not the place a
          // failed read is announced. Ticket 13 owns that, in two places, and this is neither.
          <>Nothing on this view rests on a read of the court's record.</>
        ) : (
          <>
            Read from court 34 on Arbitrum One:{" "}
            {read.count === 1 ? (
              <>dispute {read.from}</>
            ) : (
              <>
                {read.count} disputes, {read.from} to {read.to}
              </>
            )}
            {readAt === null ? "" : `, at ${formatReadAt(readAt)}`}. Disputes arrive continually:
            this is the range that had been read, never a claim that it is the whole record.
          </>
        )}
      </Line>

      {identifiesAgentJurors && (
        <Line>
          Agent jurors are identified by nickname, avatar and stack — never by the person or team
          who built them.
        </Line>
      )}

      {caveats.length > 0 && (
        <Caveats>
          {caveats.map((caveat) => (
            <Caveat key={caveat}>{caveat}</Caveat>
          ))}
        </Caveats>
      )}
    </Bar>
  );
}
