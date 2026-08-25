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
 * `#window` is prose, and deliberately not read from the model the matrix is built from. It is
 * the destination of the † marker's link, so it has to answer on a cold load, and a section
 * that waited on an Arbitrum read would show a reader arriving from that link the very absence
 * they came to have explained. What it states is history — court 34's first configuration is
 * a fact from August 2026 and cannot change retroactively — and the guard against it drifting
 * is `court-parameters.integration.test.ts`, which reads the same two configurations from
 * chain nightly and fails if the court is ever reconfigured again. The *marker*, and the
 * durations quoted beside the matrix, do come from that read.
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

/**
 * The two configurations, side by side.
 *
 * The shape `canvas/Errors.dc.html:190-197` gives it, which is the shape the dispute
 * timeline strip uses on `canvas/Dispute.dc.html:88-96`: the thing named, then its duration as
 * an absolute figure. Two configured windows here; ticket 09's dispute view sets a configured
 * window beside how long the period in fact ran, in the same two columns. Neither divides one
 * by the other.
 */
const Regimes = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space8};
  padding: ${({ theme }) => `${theme.space6} ${theme.space7}`};
  border: ${({ theme }) => theme.borderHairline};
  border-radius: ${({ theme }) => theme.radiusTile};
  background-color: ${({ theme }) => theme.surfaceInset};
`;

const Regime = styled.div`
  flex: 1 1 200px;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space3};
`;

const RegimeLabel = styled.span`
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textMeta};
`;

const RegimeWindows = styled.span`
  font: ${({ theme }) => theme.typeMono};
  /* TRAP: the shorthand above resets the tabular digits base.css puts on the body, and this
     is a row of durations meant to line up against the row beside it. */
  font-feature-settings: ${({ theme }) => theme.featureMono};
  color: ${({ theme }) => theme.textHeading};
`;

const SECTIONS: readonly { id: string; label: string }[] = [
  { id: "unit", label: "The unit" },
  { id: "latency", label: "Latency" },
  { id: "coherence", label: "Coherence" },
  { id: "window", label: "The window" },
  { id: "caveats", label: "Caveats" },
  { id: "partial", label: "Partial reads" },
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
    // The one thing on this page that could go stale: it states what court 34 was configured
    // with, and the court could be reconfigured a third time. Saying which date the account is
    // true as of is what lets a reader who finds a third configuration know this page missed it.
    "The two configurations named under the window are court 34's as of 25 August 2026, read from its parameter history on that date. The matrix itself reads that history on every load; this account does not.",
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
          <Term>Commit latency</Term> is the same measure for the commit: seconds from the moment
          the commit period opened to the moment that draw's commitment was mined. It is measured
          from its own period, so a cell's reveal figure is not the time since its commit — the two
          are two durations, not a duration and a total.
        </Body>
        <Body>
          It is the one figure here that no subgraph carries. The subgraph records only{" "}
          <em>whether</em> a juror committed and never when, so the moment comes from the{" "}
          <Term>CommitCast</Term> logs the dispute kit emits on Arbitrum, dated by the block they
          were mined in. Because a log scan can come back short without failing, every draw the
          subgraph calls committed is checked against a matching log, and any that are missing are
          counted and stated above the matrix rather than shown as commitments that never happened.
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
        <Body>
          The court has been configured twice. It was created on 11 August 2026 with a 12-hour
          evidence period, a commit window of 8 hours, a vote window of 8 hours and a 36-hour appeal
          period. On 20 August 2026 it was reconfigured: 45 minutes of evidence, a commit window of
          45 minutes, a vote window of 30 minutes, and the appeal period left as it was.
        </Body>

        <Regimes>
          <Regime>
            <RegimeLabel>Dispute 151</RegimeLabel>
            <RegimeWindows>Commit 8h · vote 8h</RegimeWindows>
          </Regime>
          <Regime>
            <RegimeLabel>152 onward</RegimeLabel>
            <RegimeWindows>Commit 45m · vote 30m</RegimeWindows>
          </Regime>
        </Regimes>

        <Body>
          Dispute 151 is the only dispute that ran under the first configuration: the change was
          mined 48 minutes before dispute 152 was created. So it is the one row of the matrix
          carrying a <Term>†</Term>, and the marker travels with every figure it touches rather than
          sitting on the row alone — an aggregate that counts that dispute is marked too.
        </Body>

        <Body>
          Which configuration applies is read from the court's own history — the{" "}
          <Term>CourtCreated</Term> and <Term>CourtModified</Term> events on Arbitrum — and never
          from what the court is configured with today. It is resolved period by period rather than
          once per dispute, because the court reads its own durations at the moment it passes a
          period: a dispute created under one configuration and passed into its commit period under
          the next ran the later commit window, whatever its creation date suggests.
        </Body>

        <Body>
          A window appears on this dashboard only ever beside a duration, as two absolute figures. A
          latency is never divided by one, in a cell, in a total, or anywhere else — a ratio is a
          fact about a relationship whose second term changed midway through this dataset, and it
          cannot carry that caveat into a screenshot.
        </Body>
      </Section>

      {/* Ticket 10. Below coherence and above the caveats, which is where it belongs in the
          argument: it is what the two measured dimensions cost and earned, and deliberately not
          a third dimension anyone is ranked on. */}
      <Section id="rewards" heading="What each agent juror has earned">
        <Body>
          Each column header also states what that agent juror has been paid: cumulative ETH and net
          PNK, summed over every dispute the court has executed. These are context beside the
          measures rather than a dimension anyone is ranked on, and nothing on this dashboard is
          ordered by them.
        </Body>
        <Body>
          The ETH is the arbitration fee, and the court pays it <Term>per vote ID</Term> rather than
          per draw — an agent juror holding two of a dispute's three coherent vote IDs earns two
          thirds of that dispute's pot, so a payout is often a fraction of the fee rather than a
          multiple of it. The PNK is a redistribution and not an issuance: it is taken from the
          jurors who diverged or failed to reveal and handed to those who voted with the ruling, so
          it nets to zero across the court and a negative figure is a real loss rather than a
          missing number. Its sign is always a character in the value itself.
        </Body>
        <Body>
          Both figures lag the rest of this page, and legitimately. A payout is written when the
          court <Term>executes</Term> a dispute, which is a later transaction than ruling it — so a
          dispute counted in the coherence figures may have paid nothing yet. That is a delay in the
          court, not a gap in this read, and the footer says how many draws the two figures cover.
        </Body>
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

      {/* Where the failure banner's "What this means" arrives. It answers the question a reader
          asks at the moment a rose banner appears over figures they were about to quote, which is
          a different question from what any one figure means — hence its own section rather than
          a paragraph under Caveats. */}
      <Section id="partial" heading="Partial reads, and what a banner over these figures means">
        <Body>
          Every figure here is read live in your browser from four public endpoints, and any of them
          can fail or answer short. When one does, this dashboard says so twice: in the place where
          the missing figure would have been, and once in a banner across the top of the page. It
          never fills the gap in — what could not be read is shown as unknown, never as zero and
          never as nothing at all.
        </Body>
        <Body>
          The distinction the banner draws is between a failure that changes a number and one that
          changes only a label. The core subgraph, the template subgraph and the Arbitrum endpoint
          carry figures, or the identity of the rows those figures sit in, so a failure of any of
          them raises the banner and nothing on the page should be quoted. Ethereum mainnet carries
          only the agent jurors' ENS nicknames and avatars, on which no measurement depends: when it
          fails you get an amber note saying names have fallen back to this repository's own roster,
          and every figure on the page is still whole.
        </Body>
        <Body>
          A dispute whose draws could not be read is drawn as a row of <Term>Unknown</Term> cells —
          a question mark and the words "not read" in every slot where a figure belongs — and is
          left out of every total above it. That is deliberately as far as possible from a blank
          cell, which means the opposite: an agent juror was not drawn for that dispute, which is
          the ordinary state of a sparse matrix and not a gap in anything. Retrying from the banner
          re-reads the failing source without a page reload, and the banner goes when it succeeds.
        </Body>
      </Section>

      <Section id="sources" heading="Sources">
        <Body>
          Everything is read in your browser from public, keyless endpoints: the Kleros v2 core
          subgraph for disputes, rounds, draws, votes and payouts; the dispute resolver template
          subgraph for what each dispute is about; an Arbitrum RPC for the commitment logs and the
          court's own parameter history; and Ethereum mainnet for the agent jurors' ENS names and
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
