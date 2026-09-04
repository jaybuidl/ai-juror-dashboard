import styled from "styled-components";
import { COURT_ID } from "../disputes/court-subgraph";

/**
 * The hero, built against `canvas/Main.dc.html:53-76` and, below the breakpoint,
 * `canvas/Mobile.dc.html:44-52`.
 *
 * The headline states the finding rather than naming the product, so a first-time visitor
 * takes the point before reading a number — the canvas wording is the reference and is used as
 * written. The deck says what is measured and, in the same breath, that this dashboard does
 * nothing else. That last clause is the read-only-forever invariant meeting the reader where
 * they actually are, not editorial decoration to be trimmed.
 *
 * The phone artboard drops the deck and shortens the eyebrow, and neither drop costs a measured
 * fact. The eyebrow keeps the court number and the chain, which are what locate the data, and
 * loses the court's *name*, which is the one segment a reader can lose without losing the
 * scope. The deck's read-only clause is the one thing in it that could not simply go: it
 * survives in the nav's own read-only label, which is why that label is not the element that
 * gives way for width when the nav folds.
 *
 * The headline is the same sentence at a smaller size, never a shortened or a different one.
 * A hero that said something else on a phone would be a second claim about this court.
 */

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space6};
`;

const Eyebrow = styled.p`
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textMeta};
`;

/* No narrow rule, deliberately. `--type-display-2` is 800 clamp(32px, 4.4vw, 54px), so at the
   390pt artboard it already resolves to 32px at the weight the artboard sets it in — the
   token's own clamp is the reduction, and a second rule here would be a second opinion about
   the same headline. */
const Headline = styled.h1`
  font: ${({ theme }) => theme.typeDisplay2};
  letter-spacing: ${({ theme }) => theme.trackingDisplay};
  color: ${({ theme }) => theme.textHeading};
  text-wrap: balance;
`;

const Deck = styled.p`
  /* No measure. The deck takes the body's width — about 145 characters a line at this size,
     past the 45-75 that suits a page read through, and set that way on the maintainer's call
     after 62ch and then 1000px: it is three sentences under a full-width headline, read in one
     glance, and any narrower column left a ragged edge against the full-width strip and legend
     below it. Not rendered at all below the narrow breakpoint, so this is a desktop measure or
     none. */
  font: ${({ theme }) => theme.typeBodyLg};
  color: ${({ theme }) => theme.textBody};
  text-wrap: pretty;
`;

export function Hero({ narrow: isNarrow = false }: { narrow?: boolean }) {
  return (
    <Header>
      <Eyebrow>
        Court {COURT_ID} · {isNarrow ? "" : "Agentic Commerce Court · "}Arbitrum One
      </Eyebrow>
      <Headline>Kleros AI Agent Jurors Dashboard</Headline>
      {/* Absent below the breakpoint rather than hidden there: the artboard drops it, and every
          measured fact in it survives elsewhere — the read-only clause in the nav's label, and
          what this page measures on the method page, one tap away in that same nav. It used to
          point at the caveat card further down this page; that card is gone, because all seven
          of its claims were the method page's said a second time. */}
      {/* No count in this sentence, deliberately: the roster gains entries, this deck has no
          roster to read one off, and the number carries no argument here — the matrix's own
          "drawn" tile states it against the roster's length a screenful below. */}
      {!isNarrow && (
        <Deck>
          Independent AI agent jurors, each built on a different stack, vote in one Kleros court.
          This page measures two things about them: how fast they act, and how often they vote with
          the final ruling. It does nothing else — it never votes, stakes, or holds a key.
        </Deck>
      )}
    </Header>
  );
}
