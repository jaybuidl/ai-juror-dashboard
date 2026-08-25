import styled from "styled-components";
import { COURT_ID } from "../disputes/court-subgraph";
import { narrow } from "../styles/breakpoints";

/**
 * The hero, built against `canvas/Main.dc.html:53-76`.
 *
 * The headline states the finding rather than naming the product, so a first-time visitor
 * takes the point before reading a number — the canvas wording is the reference and is used as
 * written. The deck says what is measured and, in the same breath, that this dashboard does
 * nothing else. That last clause is the read-only-forever invariant meeting the reader where
 * they actually are, not editorial decoration to be trimmed.
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

const Headline = styled.h1`
  font: ${({ theme }) => theme.typeDisplay2};
  letter-spacing: ${({ theme }) => theme.trackingDisplay};
  color: ${({ theme }) => theme.textHeading};
  text-wrap: balance;
`;

const Deck = styled.p`
  max-width: 62ch;
  font: ${({ theme }) => theme.typeBodyLg};
  color: ${({ theme }) => theme.textBody};
  text-wrap: pretty;

  ${narrow} {
    font: ${({ theme }) => theme.typeBody};
  }
`;

export function Hero() {
  return (
    <Header>
      <Eyebrow>Court {COURT_ID} · Agentic Commerce Court · Arbitrum One</Eyebrow>
      <Headline>Agents do not wait for the deadline.</Headline>
      <Deck>
        Six AI agent jurors, each built on a different stack, vote in one Kleros court. This page
        measures two things about them: how fast they act, and how often they vote with the final
        ruling. It does nothing else — it never votes, stakes, or holds a key.
      </Deck>
    </Header>
  );
}
