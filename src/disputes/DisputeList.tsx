import { Fragment, type ReactNode } from "react";
import styled from "styled-components";
import type { Dispute, Ruling } from "./disputes";

/**
 * The row header from `canvas/Main.dc.html:156-173`: two lines, the core dispute ID
 * leading the first and everything else on the second.
 *
 * Styled against the placeholder Court palette in `src/styles/theme.ts`. Ticket 14
 * adopts the Kleros ×AI tokens, so the markup here is kept structural — spacing and
 * hierarchy, no invented colour values — to keep that a token swap rather than a rewrite.
 */

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Heading = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
`;

const Lede = styled.p`
  margin: 0;
  max-width: 68ch;
  color: ${({ theme }) => theme.secondaryText};
`;

const Notice = styled.p`
  margin: 0;
  max-width: 68ch;
  padding: 12px 16px;
  border: 1px solid ${({ theme }) => theme.warning};
  border-radius: 8px;
  color: ${({ theme }) => theme.warning};
  font-size: 0.875rem;
`;

const Rows = styled.ul`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid ${({ theme }) => theme.stroke};
`;

/**
 * A two-column grid rather than two stacked flex lines, so the second line starts where
 * the title starts without either of them naming a width.
 *
 * The artboard hits that alignment with a fixed 30px id column and a matching 40px
 * indent below it (`Main.dc.html:161-166`). Restating the same measurement in two places
 * is what the grid removes: the id column is declared once, and both the title and the
 * second line sit in the column beside it. It also survives what the fixed pair would
 * not — core dispute IDs are global across every court, so a four-digit ID is a matter
 * of time, and it widens the column here instead of overflowing it.
 */
const ID_COLUMN = "2.5rem";

const Row = styled.li`
  display: grid;
  grid-template-columns: ${ID_COLUMN} 1fr;
  align-items: baseline;
  column-gap: 10px;
  row-gap: 6px;
  padding: 12px 4px;
  border-bottom: 1px solid ${({ theme }) => theme.stroke};
`;

const DisputeId = styled.span`
  grid-column: 1;
  grid-row: 1;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.8125rem;
  /* Tabular figures so the column of IDs reads as a column, not as ragged text. */
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: ${({ theme }) => theme.secondaryText};
`;

const Title = styled.span`
  grid-column: 2;
  grid-row: 1;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
  overflow-wrap: anywhere;
`;

const SecondLine = styled.div`
  /* Row 2 explicitly, not by auto-placement: without it, a row whose title slot is
     still unfilled would let the second line rise into row 1 beside the id. */
  grid-column: 2;
  grid-row: 2;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.secondaryText};
`;

const Separator = styled.span`
  color: ${({ theme }) => theme.stroke};
`;

/* The artboard gives the category and the ruling each their own label span rather than
   letting them sit as loose text between separators. Kept, because it is also what makes
   each of them addressable — to a test, and to ticket 18's accessibility work. */
const Detail = styled.span`
  letter-spacing: 0.04em;
`;

const Pill = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 7px;
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Empty = styled.p`
  margin: 0;
  max-width: 68ch;
  color: ${({ theme }) => theme.secondaryText};
`;

/**
 * The positions on the second line that later tickets fill. Reserved here so that
 * filling one moves nothing: ticket 04 supplies `title` and `category`, ticket 05
 * `panel` and `flag`. Every one is optional, and an absent slot takes its separator
 * with it rather than leaving a dangling middot that would read as a failed load.
 */
export type DisputeRowSlots = {
  title?: ReactNode;
  category?: ReactNode;
  panel?: ReactNode;
  flag?: ReactNode;
};

export type DisputeListView = {
  disputes: readonly Dispute[];
  isLoading: boolean;
  /** Non-null when the court could not be read. The rows already held are kept. */
  error: Error | null;
  /** How a later ticket supplies the reserved slots for one dispute. */
  slotsFor?: (dispute: Dispute) => DisputeRowSlots;
};

/**
 * What the court decided, in words.
 *
 * A dispute with no ruling yet reads as pending and never as a blank: an empty cell
 * where a ruling belongs is indistinguishable from one that failed to load. Choice 0 is
 * a refusal to arbitrate — a decision the court reached, not an absence of one — so it
 * is worded rather than rendered as "Ruling 0".
 */
export function rulingLabel(ruling: Ruling): string {
  switch (ruling.state) {
    case "pending":
      return "Pending";
    case "refused":
      return "Refuse to arbitrate";
    case "ruled":
      return `Ruling ${ruling.choice}`;
  }
}

/**
 * Whether a slot a later ticket owns actually has something in it.
 *
 * `undefined` is not the only way a slot arrives empty. These are `ReactNode`s fed from
 * subgraph fields, where "no value" is just as likely to be `null` or `""` — a dispute
 * whose DRT record carries no category, say. Any of them must take the slot's separator
 * with it, or the row grows the dangling middot this layout exists to avoid.
 */
function isFilled(slot: ReactNode): boolean {
  return slot !== undefined && slot !== null && slot !== false && slot !== "";
}

function DisputeRow({ dispute, slots }: { dispute: Dispute; slots: DisputeRowSlots }) {
  // Collected in the order the artboard puts them, then joined with separators, so an
  // unfilled slot takes its separator with it and leaves no trace.
  const details: { key: string; node: ReactNode }[] = [];
  if (isFilled(slots.category)) {
    details.push({ key: "category", node: <Detail>{slots.category}</Detail> });
  }
  details.push({ key: "ruling", node: <Detail>{rulingLabel(dispute.ruling)}</Detail> });
  if (isFilled(slots.panel)) details.push({ key: "panel", node: <Pill>{slots.panel}</Pill> });
  if (isFilled(slots.flag)) details.push({ key: "flag", node: <Pill>{slots.flag}</Pill> });

  return (
    <Row>
      <DisputeId>{dispute.id}</DisputeId>
      {isFilled(slots.title) && <Title>{slots.title}</Title>}
      <SecondLine>
        {details.map((detail, index) => (
          <Fragment key={detail.key}>
            {index > 0 && <Separator aria-hidden="true">·</Separator>}
            {detail.node}
          </Fragment>
        ))}
      </SecondLine>
    </Row>
  );
}

export function DisputeList({ disputes, isLoading, error, slotsFor }: DisputeListView) {
  return (
    <Section aria-labelledby="disputes-heading">
      <Heading id="disputes-heading">The disputes</Heading>
      <Lede>
        Every dispute in court 34, newest first. This is the court's record only — no latency,
        coherence or draw has been measured from it yet.
      </Lede>

      {error !== null && (
        <Notice role="status">
          The court's disputes could not be read, so this list may be incomplete or out of date.
          Nothing here should be taken as the full record.
        </Notice>
      )}

      {disputes.length > 0 ? (
        <Rows>
          {disputes.map((dispute) => (
            <DisputeRow key={dispute.id} dispute={dispute} slots={slotsFor?.(dispute) ?? {}} />
          ))}
        </Rows>
      ) : (
        error === null && (
          // Not "the court is empty": a successful read that returns nothing is not
          // evidence of an empty court. A resyncing subgraph, a VITE_CORE_SUBGRAPH_URL
          // pointed at a still-indexing deployment and a changed court id all land here
          // with HTTP 200 and zero rows, and this page may be cited.
          <Empty>
            {isLoading
              ? "Reading the court…"
              : "The subgraph returned no disputes for court 34. That is what was read, not a finding that the court has held none."}
          </Empty>
        )
      )}
    </Section>
  );
}
