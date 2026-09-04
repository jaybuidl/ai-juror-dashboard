import { Fragment, type ReactNode } from "react";
import { Link } from "react-router";
import styled from "styled-components";
import { Notice } from "../chrome/Failure";
import { VisuallyHidden } from "../styles/hidden";
import { type Tone, toneInk, toneLine } from "../styles/tones";
import type { Dispute, Ruling } from "./disputes";

/**
 * The row header from `canvas/Main.dc.html:156-173`: two lines, the core dispute ID
 * leading the first and everything else on the second.
 *
 * Styled against the Kleros ×AI tokens. The markup was written structural — spacing and
 * hierarchy, no invented colour values — so that adopting them was the token swap it was
 * meant to be. Colours follow `canvas/Main.dc.html:161-166` element for element.
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
  color: ${({ theme }) => theme.textHeading};
`;

const Lede = styled.p`
  margin: 0;
  max-width: 68ch;
  color: ${({ theme }) => theme.textBody};
`;

const Rows = styled.ul`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: ${({ theme }) => theme.borderHairline};
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

/*
 * `minmax(0, 1fr)` and not `1fr`: a grid track's minimum is `auto`, which is the content's
 * own minimum, so a `1fr` track grows to fit the longest title instead of clipping it —
 * the title never truncates and the row overflows sideways. It is the usual way
 * `text-overflow: ellipsis` fails inside a grid, and it fails without a console warning.
 */
/*
 * Two lines, or one.
 *
 * The compact form is ticket 17's, for a matrix past forty rows: the second line goes, taking the
 * category and the ruling with it, and what was on it that a compacted grid still needs — the
 * pills, and the commit figure the cell gave up — moves to the end of the first. One row rather
 * than a second component, so the id column, the clipping and the separator logic cannot fork.
 *
 * A third track rather than letting the details wrap: `auto` sizes to what is in them, and the
 * title beside it gives up the space.
 *
 * **The title's floor is not decoration.** An `auto` track takes its content's width before a
 * `1fr` sibling gets anything, so with `minmax(0, 1fr)` the title measured zero pixels wide in a
 * browser and every compact row was a dispute id, a pill and no subject — the same shape as the
 * `text-overflow` failure above, and just as invisible to jsdom. `TITLE_FLOOR` is what the title
 * keeps whatever else is on the line; the details give up the rest and clip.
 */
const TITLE_FLOOR = "7rem";

const Row = styled.li<{ $compact?: boolean }>`
  /* The containing block for the ID link's stretched target, described on DisputeId. Without a
     positioned ancestor that overlay resolves against the page and covers the viewport. */
  position: relative;
  display: grid;
  grid-template-columns: ${({ $compact }) =>
    $compact === true
      ? `${ID_COLUMN} minmax(${TITLE_FLOOR}, 1fr) minmax(0, auto)`
      : `${ID_COLUMN} minmax(0, 1fr)`};
  align-items: baseline;
  column-gap: 10px;
  row-gap: 6px;
  padding: ${({ $compact }) => ($compact === true ? "8px 4px" : "12px 4px")};
  border-bottom: ${({ theme }) => theme.borderHairline};

  /* The row is the target, so the row is what answers the pointer. Without this the only
     feedback is the ID underlining itself, a long way from wherever along the row the reader
     is actually pointing, which reads as nothing happening at all. */
  &:hover {
    background-color: ${({ theme }) => theme.surfaceRaised};
  }
`;

/*
 * The row's identity, and the way into the dispute itself.
 *
 * A link on the ID rather than on the title, because every row has an ID and not every row has
 * a title: a dispute whose template did not resolve, or never had one, would otherwise be the
 * one row a reader could not open. Ticket 04 built a counted notice precisely so an untitled
 * row stays a first-class row, and an unreachable one would undo that.
 *
 * One link per row. Making the title a second link to the same place would give a screen-reader
 * user two indistinguishable destinations on every row of a list forty rows long.
 *
 * Which leaves the pointer with a target the width of three digits. The ID is what the link is
 * *named* by, for the two reasons above; it is not what the reader aims at. A stretched
 * pseudo-element gives it the row's whole area without adding an element, a second name, or a
 * second tab stop — the pattern the phone's card has shipped since ticket 16, applied one
 * breakpoint up so that the two layouts open a dispute the same way.
 */
const DisputeId = styled(Link)`
  grid-column: 1;
  grid-row: 1;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.8125rem;
  /* Tabular figures so the column of IDs reads as a column, not as ragged text. */
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: ${({ theme }) => theme.accent};
  text-decoration: none;

  /* Stretched over the row, not over the matrix. Inside the matrix DisputeRow is rendered into
     the row header cell, which is a positioned ancestor away, so the target stops at the end of
     that cell and every measurement beside it stays unclickable and keeps its own meaning. */
  &::after {
    content: "";
    position: absolute;
    inset: 0;
  }

  &:hover {
    text-decoration: underline;
  }

  /* The ring belongs on the area that answers the click rather than on the three digits that
     name it. Both halves of the system's ring have to go for that: base.css gives every
     focusable an outline of none and a --ring-focus box-shadow, so suppressing the outline
     alone leaves the shadow drawing a second, smaller ring around the digits inside the one on
     the overlay. Two rings, one focus. View.tsx records the same trap from the other side. */
  &:focus-visible {
    outline: none;
    box-shadow: none;
  }

  &:focus-visible::after {
    outline: 2px solid ${({ theme }) => theme.focusRing};
    outline-offset: -2px;
  }

  /* Room for the matrix's frozen column header, which is the one thing that can sit on top of
     this link. Past forty disputes that header is sticky, and tabbing down the dispute column
     scrolls each link flush to the top of the scrollport — underneath it. The focus ring is
     then drawn behind an opaque header and a keyboard reader loses their place with nothing on
     screen to say where it went (WCAG 2.4.11). Costless on the standalone dispute index, where
     nothing is sticky and nothing scrolls this into view.

     **This number is a measurement of another component, and nothing checks it.** It was 8rem
     against a header that measured about 146px, so it was already 18px short, and ticket 29 took
     the header to 197.84px at 1440x900 and made the shortfall 70. What that looked like: every
     link focused by Shift+Tab parked at exactly its own scroll-margin-top, 128px, and the row is
     21px tall — so the whole link and its entire ring sat inside the header's band. Not
     marginally behind it; wholly behind it. Measured in Chrome on 2026-09-04, walking sixteen
     links up the column with the header stuck.

     It is 13rem for the 197.84px header plus about 10px of daylight. **A floor, not a
     derivation**: no element declares the column header's height — it is whatever an avatar, a
     nickname, a stack label and three figures come to — so there is nothing here to derive this
     from and no offline test that can see it. jsdom lays nothing out, and a programmatic
     call to focus does not even reproduce the defect in a real browser: Chrome centres the element
     for that and only sequential focus navigation parks it against the margin. So this is
     verified by a person pressing Shift+Tab, or it is not verified. **Change what the column
     header contains and this has to be measured again.** */
  scroll-margin-top: 13rem;
`;

/*
 * One line, clipped with an ellipsis, per `Main.dc.html:162`. Every row then keeps the
 * same height whatever its title, which is what lets the list scan as a column — court
 * 34's titles run from "x402 escrow dispute" to a two-clause question about a tailored
 * jacket. The full text stays reachable through the `title` attribute below.
 *
 * `min-height` is what makes "whatever its title" include having none. The element is
 * rendered even when the slot is empty, so a dispute with no template — or one whose
 * title has not arrived yet — holds the same line as a titled row instead of collapsing
 * onto the smaller dispute ID beside it. Without both, every row on the page shifts
 * upward the moment the titles land, and untitled rows stay permanently shorter.
 */
const TITLE_LINE_HEIGHT = 1.35;

const Title = styled.span`
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
  font-weight: 600;
  line-height: ${TITLE_LINE_HEIGHT};
  min-height: ${TITLE_LINE_HEIGHT}em;
  color: ${({ theme }) => theme.textHeading};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  color: ${({ theme }) => theme.textMeta};
`;

/* The same details, on the first line, where the compact form has no second one. Nothing here
   may wrap — not the row, and not the text inside a pill: a label broken across two lines reads
   as a rendering fault, and two lines is the one thing the compact row exists to avoid. */
const InlineDetails = styled.div`
  grid-column: 3;
  grid-row: 1;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.textMeta};

  > * {
    white-space: nowrap;
  }
`;

/* The panel, as the dense artboard draws it: a plain right-aligned label rather than a pill
   (`MatrixDense.dc.html:91`). It keeps its ink, so a panel of one still reads amber, and the
   words are `panelPillOf`'s either way. */
const PanelLabel = styled.span<{ $tone?: Tone }>`
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme, $tone }) => ($tone === undefined ? theme.textPending : toneInk(theme, $tone))};
`;

const Separator = styled.span`
  color: ${({ theme }) => theme.textPending};
`;

/* The artboard gives the category and the ruling each their own label span rather than
   letting them sit as loose text between separators. Kept, because it is also what makes
   each of them addressable — to a test, and to ticket 18's accessibility work. */
const Detail = styled.span`
  letter-spacing: 0.04em;
`;

/**
 * The row's pill, and the only one: a caller fills the slot with content, never with a second
 * pill. `$tone` is how a filled slot carries a state colour — an amber lone-panel flag is the
 * same amber as an amber cell — and an untoned pill is the quiet default the panel size uses.
 */
export const Pill = styled.span<{ $tone?: Tone }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 7px;
  border: 1px solid
    ${({ theme, $tone }) =>
      $tone === undefined ? theme.borderCardHoverColor : toneLine(theme, $tone)};
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.6875rem;
  /* Declared, not inherited. The family here is mono, so the figures should be the mono set —
     but nothing above sets it: base.css puts the mono features on its own mono classes and the
     numeric set on body, and this element matches neither. Inherited, the elapsed time in
     ticket 12's live pill would render with a plain zero beside slashed ones everywhere else.
     No font shorthand is used above, so this is the declaration rather than a re-declaration. */
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme, $tone }) => ($tone === undefined ? "inherit" : toneInk(theme, $tone))};
`;

const Empty = styled.p`
  margin: 0;
  max-width: 68ch;
  color: ${({ theme }) => theme.textBody};
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
  /** The state colour the panel pill carries. Amber marks a panel of one. */
  panelTone?: Tone;
  /** The state colour the flag pill carries, where a flag applies. */
  flagTone?: Tone;
  /**
   * A figure about this dispute, filled only where the row is the compact form's.
   *
   * Ticket 17's: past forty rows the matrix's cells drop their commit line, and the median over
   * the row's own draws lands here instead — the one thing the compact row gains for the second
   * line it loses. Empty at the comfortable density, where every cell carries its own commit
   * figure and a row-level median would be a seventh reading of the same draws.
   */
  measure?: ReactNode;
};

/**
 * What came back when the disputes' subjects were read.
 *
 * A count and not an error, because the likeliest failure throws nothing: a reindexing
 * template subgraph answers 200 with an empty list, and a lagging one answers with part
 * of it. Both leave rows untitled, and a row missing its title is indistinguishable from
 * a dispute that never had one unless the page says which happened.
 */
export type DisputeTitleRead = {
  /** Disputes that carry a template, and so should resolve a title. */
  expected: number;
  /** Of those, how many the template subgraph actually returned. */
  resolved: number;
  /** True while the read is in flight; nothing is missing until it settles. */
  isLoading: boolean;
  /**
   * When the titles on screen landed, in epoch milliseconds, or `null` before any have.
   *
   * So a view whose failing half is the template read can date itself by *that* read rather than
   * by the dispute read that worked — the same reason the matrix takes the older of its two.
   * `null` also covers having nothing to ask for: with no template ids the query never runs.
   */
  readAt: number | null;
};

export type DisputeListView = {
  disputes: readonly Dispute[];
  isLoading: boolean;
  /** Non-null when the court could not be read. The rows already held are kept. */
  error: Error | null;
  /**
   * How the read of what these disputes are *about* went, counted rather than caught.
   * Separate from `error` because the two say different things: the list is whole here,
   * and only its titles are missing.
   */
  titles?: DisputeTitleRead;
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

/**
 * One dispute's row header: the same block whether it leads a list or a matrix row.
 *
 * `as` exists because the matrix hangs its cells off this row, and a matrix row header is a
 * table cell rather than a list item. The grid, the reserved slots and the separator logic
 * belong to the row rather than to the list — restating them in `Matrix.tsx` is how the two
 * would drift, and ticket 04 fills the same slots for both.
 */
export function DisputeRow({
  dispute,
  slots,
  as = "li",
  compact = false,
}: {
  dispute: Dispute;
  slots: DisputeRowSlots;
  as?: "li" | "div";
  /**
   * Whether this row is drawn in ticket 17's compact form: one line, no category and no ruling,
   * and the `measure` slot at the end of it.
   *
   * The same flag the compact cell and the compact column header read, threaded from the one
   * place it is decided. What the compact row loses is closed and is exactly this: nothing else
   * about it changes, including which pills it wears and in what order.
   */
  compact?: boolean;
}) {
  // Collected in the order the artboard puts them, then joined with separators, so an
  // unfilled slot takes its separator with it and leaves no trace.
  const details: { key: string; node: ReactNode }[] = [];
  // The category and the ruling are the second line's content, and the compact row has no second
  // line. Neither is lost to the reader: both are on that dispute's own view, which the id links
  // to, and the ruling is what the coherence state in every cell of the row is measured against.
  if (!compact && isFilled(slots.category)) {
    details.push({ key: "category", node: <Detail>{slots.category}</Detail> });
  }
  if (!compact) {
    details.push({ key: "ruling", node: <Detail>{rulingLabel(dispute.ruling)}</Detail> });
  }
  if (isFilled(slots.panel)) {
    details.push({
      key: "panel",
      node: compact ? (
        <PanelLabel $tone={slots.panelTone}>{slots.panel}</PanelLabel>
      ) : (
        <Pill $tone={slots.panelTone}>{slots.panel}</Pill>
      ),
    });
  }
  if (isFilled(slots.flag)) {
    details.push({ key: "flag", node: <Pill $tone={slots.flagTone}>{slots.flag}</Pill> });
  }
  if (compact && isFilled(slots.measure)) {
    details.push({ key: "measure", node: slots.measure });
  }

  // The clipped title is unreadable past the row's width, so the full text goes on the
  // element as well. Only when it is genuinely a string: the slot takes any ReactNode,
  // and a `title` attribute stringified from an element would read as "[object Object]".
  // A tooltip is a weak affordance and ticket 18 owns the accessible treatment; this is
  // the part that need not wait for it.
  const titleText = typeof slots.title === "string" ? slots.title : undefined;

  const Details = compact ? InlineDetails : SecondLine;

  return (
    <Row as={as} $compact={compact}>
      {/* `title` and deliberately not `aria-label`. An `aria-label` here would be the link's
          accessible name *and* the only thing it contributed to the name of the element around
          it — which in the matrix is a `rowheader`, whose name is designed to start with the
          dispute ID. Naming the link "Dispute 163" renamed 27 matrix rows as a side effect.
          The text content is the name; the tooltip is the extra context. */}
      <DisputeId to={`/disputes/${dispute.id}`} title={`Dispute ${dispute.id}`}>
        {dispute.id}
      </DisputeId>
      {/* A separator that exists only in the accessible name. The id and the title sit in
          separate grid tracks with a `column-gap` between them, and a gap contributes nothing
          to an accessible name — so dispute 151 announced as "151x402 escrow dispute", one
          run-on string, and the matrix's own tests had to find rows by title because there was
          no word boundary after the id to match on. It cannot go inside the link: the link's
          name is the bare id by design, and anything added there renames the `rowheader` around
          it and every cell that answers to it (see the note above). So it goes between them. */}
      <VisuallyHidden>{", "}</VisuallyHidden>
      {/* Always rendered, empty or not — see `Title`. An empty one holds the line so the
          row does not change height when a title arrives or fails to. */}
      <Title title={titleText}>{isFilled(slots.title) ? slots.title : null}</Title>
      {/* The same details either way, and the same separators: what the compact form changes is
          which of them are collected above and which line they sit on, never how they read. */}
      <Details>
        {details.map((detail, index) => (
          <Fragment key={detail.key}>
            {/* The middot is drawn and the comma is heard. Accessible-name computation
                concatenates adjacent nodes and normalises the whitespace out from between them,
                so without this the second line announced as "EscrowRuling 1Panel 2" — three
                facts as one word. The visible separator cannot do the job, because "·" spoken is
                "middle dot" on every screen reader that says it at all. */}
            {index > 0 && (
              <>
                <Separator aria-hidden="true">·</Separator>
                <VisuallyHidden>{", "}</VisuallyHidden>
              </>
            )}
            {detail.node}
          </Fragment>
        ))}
      </Details>
    </Row>
  );
}

export function DisputeList({ disputes, isLoading, error, titles, slotsFor }: DisputeListView) {
  const missingTitles =
    titles === undefined || titles.isLoading ? 0 : titles.expected - titles.resolved;

  return (
    <Section aria-labelledby="disputes-heading">
      <Heading id="disputes-heading">The disputes</Heading>
      <Lede>
        Every dispute in court 34, newest first. This is the court's record only — no latency,
        coherence or draw has been measured from it yet.
      </Lede>

      {error !== null && (
        // Rose: the list may be short, which is a missing row rather than a missing label.
        <Notice $tone="rose" role="status">
          The court's disputes could not be read, so this list may be incomplete or out of date.
          Nothing here should be taken as the full record.
        </Notice>
      )}

      {/* Worth saying rather than leaving to be noticed. A row with no title is exactly
          what a dispute that never had one looks like, so an unannounced gap here would
          quietly reclassify disputes as untitled. The list itself is whole, and this says
          only what is missing — with the count, because "some" and "all" are different
          claims and the partial case is the one a lagging subgraph produces. */}
      {missingTitles > 0 && (
        // Rose too, and this is the one the two tiers argue over. Ticket 13's first criterion
        // makes a missing title quiet — it changes a label, not a number — while the ticket's
        // own source list and the canvas's rule panel both put the template subgraph in the loud
        // set, with ENS as the single exception. Those two win, per CLAUDE.md on the canvas.
        <Notice $tone="rose" role="status">
          {titles?.resolved === 0
            ? "What these disputes are about could not be read, so the rows below are identified by ID alone. The list itself is complete; only the titles are missing."
            : `${missingTitles} of these ${titles?.expected} disputes could not have their subject read, so those rows are identified by ID alone. The list itself is complete.`}
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
