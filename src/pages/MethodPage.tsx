import type { ReactNode } from "react";
import styled from "styled-components";
import type { Provenance } from "../chrome/provenance";
import { View } from "../chrome/View";
import { COURT_ID } from "../disputes/court-subgraph";

/**
 * How this dashboard measures what it measures.
 *
 * A citing reader needs somewhere to find out what a figure on the matrix actually is, and a
 * footnote under a grid is not that place. The vocabulary is `CONTEXT.md`'s throughout — draw,
 * panel, coherence, reveal latency — because the glossary is what the rest of the codebase and
 * the sibling repositories are written in, and a page that paraphrased it would be a second,
 * slightly different definition of the same words.
 *
 * The sections carry stable fragment identifiers. They are linked to from elsewhere — the
 * matrix's window footnote goes to `#window` — so renaming one silently breaks a link that
 * still resolves to a page, just not to the part that answers the question.
 *
 * `#window` is the one section this ticket does not write: the two period regimes as absolute
 * durations are ticket 08's, from the court's own parameter history. Until that lands the
 * section says so outright, so the footnote's link never arrives at an empty anchor.
 */

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space5};
`;

const Title = styled.h1`
  font: ${({ theme }) => theme.typeDisplay2};
  letter-spacing: ${({ theme }) => theme.trackingDisplay};
  color: ${({ theme }) => theme.textHeading};
`;

const Deck = styled.p`
  font: ${({ theme }) => theme.typeBodyLg};
  color: ${({ theme }) => theme.textBody};
`;

const Contents = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space6};
  padding: ${({ theme }) => `${theme.space6} 0`};
  border-top: ${({ theme }) => theme.borderHairline};
  border-bottom: ${({ theme }) => theme.borderHairline};

  a {
    font: ${({ theme }) => theme.typeMonoSm};
    letter-spacing: ${({ theme }) => theme.trackingMono};
    text-transform: uppercase;
    text-decoration: none;
    color: ${({ theme }) => theme.textMeta};
  }

  a:hover {
    color: ${({ theme }) => theme.accent};
  }
`;

const Block = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space5};
  /* So a heading arrived at by fragment is not flush against the top of the viewport. */
  scroll-margin-top: ${({ theme }) => theme.space9};
`;

const Heading = styled.h2`
  font: ${({ theme }) => theme.typeTitle1};
  letter-spacing: ${({ theme }) => theme.trackingTitle};
  color: ${({ theme }) => theme.textHeading};
`;

const Body = styled.p`
  color: ${({ theme }) => theme.textBody};
`;

const Term = styled.span`
  font-family: ${({ theme }) => theme.fontMono};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  color: ${({ theme }) => theme.textHeading};
`;

/** The section that is not written yet: quiet, and explicit about why. */
const Pending = styled.p`
  padding: ${({ theme }) => `${theme.space5} ${theme.space6}`};
  border-left: 2px solid ${({ theme }) => theme.stateIdle};
  background-color: ${({ theme }) => theme.surfaceInset};
  color: ${({ theme }) => theme.textMeta};
`;

const SECTIONS: readonly { id: string; label: string }[] = [
  { id: "unit", label: "The unit" },
  { id: "latency", label: "Latency" },
  { id: "coherence", label: "Coherence" },
  { id: "window", label: "The window" },
  { id: "caveats", label: "Caveats" },
  { id: "sources", label: "Sources" },
];

function Section({ id, heading, children }: { id: string; heading: string; children: ReactNode }) {
  return (
    <Block id={id} aria-labelledby={`${id}-heading`}>
      <Heading id={`${id}-heading`}>{heading}</Heading>
      {children}
    </Block>
  );
}

const provenance: Provenance = {
  measures:
    "Nothing on this page is a measurement. It is the account of how the figures elsewhere on this dashboard are arrived at.",
  read: null,
  readAt: null,
  caveats: [
    "The account of the court's period durations is not written yet, and the section below says so rather than leaving the gap to be inferred.",
  ],
  identifiesAgentJurors: false,
};

export function MethodPage() {
  return (
    <View provenance={provenance} measure="prose">
      <Header>
        <Title>Method</Title>
        <Deck>
          What this dashboard measures, in what unit, from which source — and what it does not
          measure, which on a page that may be cited matters just as much.
        </Deck>
      </Header>

      <Contents aria-label="On this page">
        {SECTIONS.map(({ id, label }) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </Contents>

      <Section id="unit" heading="The unit is the draw">
        <Body>
          A <Term>draw</Term> is one agent juror's involvement in one dispute, however many vote IDs
          it holds. That is the unit everything here is counted and measured in. An agent juror
          reasons once per dispute and acts once per period, so a draw holding three vote IDs is one
          data point and not three — across the first thirteen disputes, 61 vote IDs were 44 draws.
        </Body>
        <Body>
          A <Term>panel</Term> is everyone the court drew for one dispute, counted the same way. It
          is a fact about the court rather than about this dashboard's roster: a juror outside the
          roster gets no column in the matrix and is still counted in the panel.
        </Body>
      </Section>

      <Section id="latency" heading="Latency is seconds from the moment a period opened">
        <Body>
          <Term>Reveal latency</Term> is the number of seconds from the moment the vote period
          opened to the moment that draw's reveal was recorded. Both moments come from the chain's
          own record — the round's timeline and the justification published with the reveal — and
          neither is read from the browser's clock. A page that decided a juror had missed a
          deadline by consulting your clock would say different things in different timezones.
        </Body>
        <Body>
          <Term>Commit latency</Term> is the same measure for the commit, and this dashboard does
          not show it yet: commit timestamps are not in the subgraph at all and have to be read from
          the chain's logs.
        </Body>
        <Body>
          Latency is never shown as a fraction of a period's window — not in a cell, not in a total,
          not anywhere. See the window, below.
        </Body>
      </Section>

      <Section id="coherence" heading="Coherence is having voted for the final ruling">
        <Body>
          A draw is <Term>coherent</Term> when the choice it revealed is the dispute's final ruling
          — the winning choice the arbitrator reports, not the majority of a round. The distinction
          is not academic: a dispute in its appeal period has every vote in and no ruling, and a
          majority read off it would be a prediction. Those draws are shown as revealed, and are
          excluded from coherence while still counting toward latency.
        </Body>
        <Body>
          Refusing to arbitrate is a ruling. An agent juror that voted to refuse in a dispute the
          court refused is coherent.
        </Body>
      </Section>

      <Section id="window" heading="The window">
        <Body>
          Court {COURT_ID}'s period durations changed partway through this experiment, so the same
          latency means different things either side of that change. This is why every figure on
          this dashboard is an absolute duration and never a percentage of the window it ran in: a
          fraction is false the moment it is quoted away from the page.
        </Body>
        <Pending>
          The two period regimes — which disputes ran under which, as absolute durations read from
          the court's own parameter history — are not written here yet. That account is ticket 08's,
          and until it lands this section says so rather than leaving you to infer what is missing.
        </Pending>
      </Section>

      <Section id="caveats" heading="Caveats carried by the figures">
        <Body>
          A dispute decided by a <Term>panel of one</Term> makes coherence tautological: a lone
          juror is automatically the majority, so the draw tells you nothing about whether it was
          right. Such disputes are counted, and marked wherever they are counted.
        </Body>
        <Body>
          The matrix is sparse, and that is its normal state. Jurors are drawn at random, so a blank
          cell means an agent juror was not drawn for that dispute — never that it failed to act.
          One agent juror has never been drawn at all.
        </Body>
        <Body>
          Nothing here is sampled or estimated. Where a figure could not be read it is absent and
          said to be absent, and where a source failed the page says so where the figure would have
          been.
        </Body>
      </Section>

      <Section id="sources" heading="Sources">
        <Body>
          Everything is read in your browser from public, keyless endpoints: the Kleros v2 core
          subgraph for disputes, rounds, draws and votes; the dispute resolver template subgraph for
          what each dispute is about; and Ethereum mainnet for the agent jurors' ENS names and
          avatars. There is no backend, no database and no stored copy — a reload reads again.
        </Body>
        <Body>
          This dashboard is read-only forever. It has no wallet, holds no key, and can neither vote
          nor stake; the browser policy it ships under would break loudly if it tried.
        </Body>
      </Section>
    </View>
  );
}
