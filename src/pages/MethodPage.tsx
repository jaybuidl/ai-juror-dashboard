import type { ReactNode } from "react";
import styled from "styled-components";
import { useDocumentTitle } from "../chrome/title";
import { View } from "../chrome/View";
import { COURT_ID } from "../disputes/court-subgraph";
import { REFERENCE_COURT_ID } from "../performance/reference";

/**
 * How this dashboard measures what it measures.
 *
 * A citing reader needs somewhere to find out what a figure on the matrix actually is, and a
 * footnote under a grid is not that place. The vocabulary is `CONTEXT.md`'s throughout — draw,
 * panel, coherence, time to appeal, reveal latency — because the glossary is what the rest of the codebase and
 * the sibling repositories are written in, and a page that paraphrased it would be a second,
 * slightly different definition of the same words.
 *
 * The sections carry stable fragment identifiers. They are linked to from elsewhere — the
 * failure banner goes to `#partial`, the agent juror draws table's ‡ to `#caveats` — and may be
 * cited from outside, so renaming one silently breaks a link that still resolves to a page, just
 * not to the part that answers the question. `#window` and `#latency` keep their ids for that
 * reason, though nothing on the site links to `#window` any more.
 *
 * `#window` is prose, and deliberately not read from the model the matrix is built from. It was
 * the destination of the † marker's link until the marker was removed on 2026-09-24 (maintainer's
 * ruling), and it still must not wait on an Arbitrum read, because what it states is history: a
 * page that showed nothing there until a chain read landed would be withholding a settled fact
 * behind a request that can fail. Court 34's first configuration is a fact from August 2026 and
 * cannot change retroactively, and the guard against it drifting is
 * `court-parameters.integration.test.ts`, which reads the same three configurations from chain
 * nightly and fails if the court is ever reconfigured again.
 *
 * **That guard has fired once, and rewriting this section was ticket 19.** Court 34 is a live
 * demo instrument and its periods get retimed to suit a demo, so expect it again. Two things
 * to hold on to when it does. The prose here counts *configurations*, which is not the count
 * of changes that moved a commit or vote window — the third moved the evidence period alone.
 * And the section has to keep saying so: a reader who knows the court was reconfigured on 26
 * August is owed the reason dispute 152's per-draw times were taken against today's windows.
 * **It does move one figure**: the headline median time to appeal runs from a dispute's
 * creation, so the evidence window is inside it, and nothing on the matrix marks the disputes
 * created before 26 August. The section says both halves, and it is the only place either is said.
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
 * The court's configurations, one per line, oldest first.
 *
 * The shape `canvas/Errors.dc.html:190-197` gives it, which is the shape the dispute
 * timeline strip uses on `canvas/Dispute.dc.html:88-96`: the thing named, then its duration as
 * an absolute figure. Configured windows only; ticket 09's dispute view sets a configured
 * window beside how long the period in fact ran, in the same two columns. Neither divides one
 * by the other.
 *
 * **Stacked rather than side by side since ticket 19, and the reason is what a reader has to
 * be able to see.** The artboard draws a two-up strip because the court had two configurations
 * when it was drawn; it has three, and the third differs from the second in one window out of
 * four. Down a column the four durations of each line up under the four above them, so the one
 * that moved is the one thing that does not repeat — which is the whole finding, and it is not
 * a finding two paragraphs of prose can hand over as quickly.
 *
 * All four windows, in the order `timesPerPeriod` is indexed on chain, rather than the commit
 * and vote windows the figures are measured from. A line that showed only what is measured
 * would print the second and third configurations identically and leave the reader looking for
 * the difference between two rows that have none.
 */
const Regimes = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space5};
  padding: ${({ theme }) => `${theme.space6} ${theme.space7}`};
  border: ${({ theme }) => theme.borderHairline};
  border-radius: ${({ theme }) => theme.radiusTile};
  background-color: ${({ theme }) => theme.surfaceInset};
`;

const Regime = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: ${({ theme }) => `${theme.space3} ${theme.space6}`};
`;

const RegimeLabel = styled.span`
  /* Fixed rather than shrink-to-fit, so the durations beside three of these start at one x and
     can be read down as a column. The basis is the longest label at this size and not a round
     number; the wrap is what a narrow viewport gets instead of a squeezed one. */
  flex: 0 0 92px;
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
  { id: "latency", label: "Speed" },
  { id: "comparison", label: "The comparison" },
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

export function MethodPage() {
  useDocumentTitle("Method");
  return (
    <View measure="prose">
      <Header>
        <Title>Method</Title>
        <Deck>
          What this dashboard measures, in what unit and from which source, and what it does not
          measure.
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

      {/* `#latency` keeps its id although the section is about time to appeal: the fragment may
          be linked from outside, and the per-draw record is still defined here. ADR-0010 and
          ADR-0011 are why latency is a record and not a measure; ADR-0012 is the timeline. */}
      <Section id="latency" heading="Speed is time to appeal">
        <Body>
          <Term>Time to appeal</Term> is the figure at the top of the matrix page, and it is the one
          figure here that measures speed. It is the seconds from the moment a dispute was created
          to the moment its first round's appeal period opened — the point at which every vote in
          that round was in and the parties could see the result. It is measured per dispute rather
          than per draw. It spans the evidence, commit and vote periods, so it includes the time the
          court spent drawing a panel as well as the time the panel took to act. Only the first
          round counts, whatever rounds follow. A dispute that has not reached its appeal period yet
          has no time to appeal; it is not plotted, and the plot says how many such disputes there
          are.
        </Body>
        <Body>
          Commit and reveal latency are not shown anywhere on this dashboard.{" "}
          <Term>Commit latency</Term> would be the seconds from the moment the commit period opened
          to the moment a draw's commitment was mined, and <Term>reveal latency</Term> the seconds
          from the moment the vote period opened to the moment its reveal was recorded. Each
          dispute's page shows the moments themselves instead, on its timeline: when each period
          opened and who opened it, and when each agent juror on the panel committed and revealed,
          as clock times in UTC. None of them is counted from another. Its appeal period also lists
          what each side of the appeal raised and who funded it, by kind rather than by address. A
          funder nothing else names is shown by its primary ENS name on Ethereum where one can be
          read there, unless the name could pass for an agent juror's or for Kleros's. Every moment
          comes from the chain, never from your browser's clock. Each agent juror's page lists, for
          every dispute it was drawn in, that dispute's time to appeal, which is the same for the
          whole panel.
        </Body>
        <Body>
          Neither says how fast an agent juror judges a case, so neither is averaged, ranked or
          plotted here, and no page sets one agent juror's beside another's. The evidence is public
          from the moment a dispute is created and the panel is drawn during the evidence period, so
          an agent juror can study a case before the commit period opens. A reveal involves no
          judgment at all, because the vote was fixed at commit. And both count from the moment a
          period opened, which is whenever any account told the court to advance it: an agent juror
          that advances the period itself and reveals in the same block reads 0 seconds. The matrix
          shows what a draw did, not when.
        </Body>
        <Body>
          The commit moment is the one no subgraph carries. The subgraph records only{" "}
          <em>whether</em> a juror committed, so the moment comes from the <Term>CommitCast</Term>{" "}
          logs the dispute kit emits on Arbitrum, dated by the block they were mined in. Who opened
          a period is on Arbitrum too: it is the account that sent the transaction, which the
          timeline names when it is an agent juror's own, or the Kleros bot, the court's own keeper
          that advances a period once its time is up. Anyone else is an account off the roster, and
          is not identified. A log scan can come back short without failing, so every draw the
          subgraph calls committed, and every period it says opened, is checked against a matching
          log, and any that are missing are counted on the page that shows them rather than shown as
          things that never happened.
        </Body>
      </Section>

      {/* Ticket 23. Directly after time to appeal, because it is what that figure is compared
          against, and it is the one read on this dashboard that is not of court 34. The
          figures themselves are not quoted here: this page reads nothing, and a median typed
          into it would go stale the next time court 29 ruled. The band's own label states
          the court and its median as read on that load. */}
      <Section id="comparison" heading="The comparison band is another court's time to ruling">
        <Body>
          The court's time to appeal is plotted on the matrix page with a violet band marking where
          an ordinary Kleros court sits on the same time axis. It is read, not drawn by hand. Its
          boundary is the median <Term>time to ruling</Term> of court {REFERENCE_COURT_ID} on the
          same core subgraph, over every single-round dispute that court has ruled: the seconds from
          a dispute's creation to the moment its execution period opened, when the ruling became
          final.
        </Body>
        <Body>
          Court {REFERENCE_COURT_ID} is the reference because it has ruled more disputes than any
          other court on this deployment, by a wide margin. On 23 September 2026 the next two courts
          by number of disputes took a median of about four and about six days, so it was not chosen
          for being slow. It is one named court and not a pool of several. The courts are configured
          differently, and a pooled figure would describe no court a reader could go and check.
        </Body>
        <Body>
          Appealed disputes are left out, and so are disputes not yet ruled. Court 34's disputes are
          single-round, and an appeal adds at least one more round with its own vote and its own
          appeal period. Folding appealed disputes in would move the band to the right and flatter
          this experiment with a gap it did not earn. The band is labelled only as other Kleros
          courts; this section is where the court and the reading are named.
        </Body>
        <Body>
          The marks and the band are not the same quantity: each mark is a time to appeal, which
          stops where the appeal period opens, and the band is a time to ruling, which runs on
          through the appeal period to the ruling.
        </Body>
        <Body>
          A read of that court can come back short without failing. So the disputes returned are
          counted against the number the court itself says it holds, and a shortfall is reported as
          those two numbers. Where the read is short, has failed, or is still out, no band is drawn
          at all. The band's place on the plot says which, and a failure raises the banner wherever
          the plot is drawn; a phone draws neither. The band is never drawn at a default, and no
          figure is shown as a fraction of it: it is a position on an absolute time axis, like every
          mark beside it.
        </Body>
      </Section>

      <Section id="coherence" heading="Coherence is having voted for the final ruling">
        <Body>
          A draw is <Term>coherent</Term> when the choice it revealed is the dispute's final ruling
          — the winning choice the arbitrator reports, not the majority of a round. The distinction
          is not academic: a dispute in its appeal period has every vote in and no ruling, and a
          majority read off it would be a prediction. Those draws are shown as revealed and are
          excluded from coherence.
        </Body>
        <Body>
          Refusing to arbitrate is a ruling. An agent juror that voted to refuse in a dispute the
          court refused is coherent.
        </Body>
        <Body>
          A <Term>tie</Term> is its own outcome. When the vote ends level the court rules to refuse
          to arbitrate, and it pays every juror who voted as coherent, whatever they chose. Those
          draws are shown as <Term>tied</Term>: not coherent, since they did not vote for the
          ruling, and not diverged, since nothing was taken from them. A juror who did not vote in a
          tie is penalised as in any other dispute. Every count of draws here splits into coherent,
          tied, diverged, missed and still acting.
        </Body>
      </Section>

      <Section id="window" heading="The window">
        <Body>
          Court {COURT_ID}'s period durations changed partway through this experiment, so the same
          duration means different things either side of that change. This is why every duration on
          this dashboard is absolute and never a percentage of the window it ran in: a fraction is
          false the moment it is quoted away from the page.
        </Body>
        <Body>
          The court has been configured three times. It was created on 11 August 2026 with a 12-hour
          evidence period, a commit window of 8 hours, a vote window of 8 hours and a 36-hour appeal
          period. On 20 August 2026 it was reconfigured: 45 minutes of evidence, a commit window of
          45 minutes, a vote window of 30 minutes, and the appeal period left as it was. On 26
          August 2026 it was reconfigured a third time, and that change moved the evidence period
          alone, from 45 minutes to 10.
        </Body>

        <Regimes>
          <Regime>
            <RegimeLabel>From 11 Aug</RegimeLabel>
            <RegimeWindows>Evidence 12h · commit 8h · vote 8h · appeal 36h</RegimeWindows>
          </Regime>
          <Regime>
            <RegimeLabel>From 20 Aug</RegimeLabel>
            <RegimeWindows>Evidence 45m · commit 45m · vote 30m · appeal 36h</RegimeWindows>
          </Regime>
          <Regime>
            <RegimeLabel>From 26 Aug</RegimeLabel>
            <RegimeWindows>Evidence 10m · commit 45m · vote 30m · appeal 36h</RegimeWindows>
          </Regime>
        </Regimes>

        <Body>
          Dispute 151 is the only dispute that ran under the first configuration: the change was
          mined 48 minutes before dispute 152 was created. Its commit and vote periods ran under
          windows of 8 hours rather than 45 and 30 minutes, so its draws' commit and reveal times
          cannot be set beside any later dispute's, and nothing here sets them side by side.
        </Body>

        <Body>
          The second reconfiguration left the commit and vote windows exactly where they were. So
          dispute 152 ran under a configuration the court has since replaced, and still its draws'
          commit and reveal times were taken against the windows the court holds now.
        </Body>

        <Body>
          The median time to appeal is the exception, because it is measured from a dispute's
          creation and so spans the evidence period too. A dispute created before 26 August sat
          through 45 minutes of evidence where one created today sits through 10, so its time to
          appeal is not the same measurement. The median time to appeal still counts those disputes,
          dispute 151's 12-hour evidence period included. Where a configured window would otherwise
          stand beside the evidence period, the dispute view gives the count of evidence submissions
          instead.
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
          A window appears on this dashboard only ever beside a duration, as two absolute figures,
          and no duration is ever divided by one. A ratio is a fact about a relationship whose
          second term changed midway through this dataset, and it cannot carry that caveat into a
          screenshot.
        </Body>
      </Section>

      {/* Ticket 10. Below coherence and above the caveats, which is where it belongs in the
          argument: it is what the measured figures cost and earned, and deliberately not a
          dimension anyone is ranked on. */}
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
          missing number. In a tie, every juror who voted is paid as coherent. Its sign is always a
          character in the value itself.
        </Body>
        <Body>
          Both figures lag the rest of this page, and legitimately. A payout is written when the
          court <Term>executes</Term> a dispute, which is a later transaction than ruling it — so a
          dispute counted in the coherence figures may have paid nothing yet. That is a delay in the
          court, not a gap in this read.
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
          cell means an agent juror was not drawn for that dispute — never that it failed to act. An
          agent juror added to the roster before the court has ever drawn it reads the same way down
          its whole column: not drawn, not failed.
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
          them raises the banner on every page that shows a figure read from it, and nothing on that
          page should be quoted. Ethereum mainnet carries only the agent jurors' ENS nicknames and
          avatars, on which no measurement depends: when it fails you get an amber note saying names
          have fallen back to this repository's own roster, and every figure on the page is still
          whole.
        </Body>
        <Body>
          A dispute whose draws could not be read is drawn as a row of <Term>Unknown</Term> cells —
          a question mark in every cell, and a "Not read" flag on the row — and is left out of every
          total above it. That is deliberately as far as possible from a blank cell, which means the
          opposite: an agent juror was not drawn for that dispute, which is the ordinary state of a
          sparse matrix and not a gap in anything. Retrying from the banner re-reads the failing
          source without a page reload, and the banner goes when it succeeds.
        </Body>
      </Section>

      <Section id="sources" heading="Sources">
        <Body>
          Everything is read in your browser from public, keyless endpoints: the Kleros v2 core
          subgraph for disputes, rounds, draws, votes and payouts, and for court{" "}
          {REFERENCE_COURT_ID}'s disputes, which the comparison band is read from; the dispute
          resolver template subgraph for what each dispute is about; an Arbitrum RPC for the
          commitment logs, the period-opening logs and the transactions that sent them, and the
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
