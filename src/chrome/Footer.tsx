import type { ReactNode } from "react";
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

/*
 * No measure on anything below.
 *
 * These lines ran to 90ch and wrapped well short of the page, which put a ragged column of
 * short lines under a grid that uses the full width — deliberately reverted on the
 * maintainer's call. A `max-width` reintroduced here is a regression, not a typographic
 * improvement: the footer is scanned rather than read through, and it is the last thing on the
 * page rather than a body of prose someone reads at length.
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

export function Footer({ provenance, note }: { provenance: Provenance; note?: ReactNode }) {
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

      {note}

      {/* The enumeration is the load-bearing part, not the clause after the dash: it has to name
          everything this dashboard shows about who an agent juror is, or the dash is asserting
          something a reader can see is incomplete. Anything that starts identifying an agent
          juror anywhere here belongs in this list on the day it ships, and in the two places that
          state the invariant itself — README.md and CLAUDE.md — on the same day.

          It is a claim about the dashboard and not about the page under it. Four views set
          `identifiesAgentJurors`, and only one of them draws an account at all: "where it has
          one" is a qualifier about agent jurors, not about views. That is deliberate — the
          sentence is the standing statement of what this dashboard will and will not say about
          who is running, and a reader meets it wherever they arrive. */}
      {identifiesAgentJurors && (
        <Line>
          Agent jurors are identified by nickname, avatar, stack, and the account an agent posts
          from where it has one — never by the person or team who built them.
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
