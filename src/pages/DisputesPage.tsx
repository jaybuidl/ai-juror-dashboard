import styled from "styled-components";
import { type Failures, olderOf, present } from "../chrome/failures";
import type { Provenance } from "../chrome/provenance";
import { rangeOf } from "../chrome/provenance";
import { View } from "../chrome/View";
import { DisputeList } from "../disputes/DisputeList";
import type { DisputesView } from "../disputes/useDisputes";
import { failureOf, SOURCES } from "../read-failure";

/**
 * The dispute index: every dispute the court has held that this dashboard has read.
 *
 * It exists because the nav names a disputes destination and ticket 15's rule was that a
 * destination either goes somewhere real or is not shown. It is also the parent the breadcrumb
 * on ticket 09's per-dispute view will point back to.
 *
 * Nothing here is measured. The list is the record of what the court holds — id, title,
 * category, period and ruling — and the footer says so, because a page of disputes sitting
 * inside a dashboard about latency invites the assumption that something on it is a latency.
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

/**
 * What could not be read here — the same two tiers as the matrix, over one fewer source.
 *
 * This view reads no draws and no commitments, so a failure of either costs it nothing and it
 * says nothing about them. A banner that named an Arbitrum outage above a page with no commit
 * latency on it would be a caveat about something the reader cannot see.
 */
function failuresOf(disputes: DisputesView): Failures {
  const titles = disputes.titles;
  const missing = titles === undefined || titles.isLoading ? 0 : titles.expected - titles.resolved;

  return {
    blocking: present(
      failureOf(
        disputes.error,
        SOURCES.core,
        "The court's disputes could not be read, so the list below is whatever was already held rather than the court as it stands.",
      ),
      missing > 0
        ? {
            source: SOURCES.templates,
            status: titles?.resolved === 0 ? "No templates" : "Short read",
            what: `${missing} of ${titles?.expected} dispute subjects could not be read, so those rows are identified by their dispute ID alone.`,
          }
        : null,
    ),
    degraded: [],
    offline: disputes.isPaused,
    // The older of the two reads behind this page, for the same reason the matrix takes the
    // older of its own: the failing half here is usually the template read, and dating the page
    // by the dispute read that succeeded would put "Last complete read: 3s ago" under "Part of
    // this page could not be read" — the reassurance the banner exists to withhold.
    //
    // Only when there is a shortfall to date, though. With every title in hand the template read
    // is not a second condition on completeness, and folding in its moment unconditionally would
    // report "Never" on a perfectly whole page whose disputes simply carry no templates.
    lastCompleteRead:
      missing > 0 ? olderOf(disputes.readAt, titles?.readAt ?? null) : disputes.readAt,
    retry: disputes.retry,
  };
}

function provenanceOf(disputes: DisputesView): Provenance {
  const caveats: string[] = [];

  if (disputes.error !== null) {
    caveats.push("The court could not be re-read on this load, so this list may be out of date.");
  }

  const titles = disputes.titles;
  if (titles !== undefined && !titles.isLoading && titles.resolved < titles.expected) {
    caveats.push(
      `${titles.expected - titles.resolved} of ${titles.expected} titles did not come back from the template subgraph. A dispute with no title here is identified by its ID.`,
    );
  }

  caveats.push(
    "Titles and categories are written by whoever created the dispute and are not validated by anything before publication.",
  );

  return {
    measures:
      "Nothing on this page is a measurement. Each row is what the court's own record says about one dispute: its ID, what it is about, the period it is in and how it was ruled.",
    read: rangeOf(disputes.disputes.map((dispute) => dispute.id)),
    readAt: disputes.readAt,
    caveats,
    identifiesAgentJurors: false,
  };
}

export function DisputesPage({ disputes }: { disputes: DisputesView }) {
  return (
    <View provenance={provenanceOf(disputes)} failures={failuresOf(disputes)}>
      {/* The title, and nothing under it: `DisputeList` carries its own heading and lede, and a
          deck here would say the same sentence twice on a page that may be cited. What this
          route adds beyond the component is the URL and the footer's provenance. */}
      <Header>
        <Title>Disputes</Title>
      </Header>
      <DisputeList {...disputes} />
    </View>
  );
}
