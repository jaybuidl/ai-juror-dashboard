import styled from "styled-components";
import { type Tone, toneInk } from "../styles/tones";

/**
 * What the glyphs mean, in the one place both layouts read it from.
 *
 * Lifted out of `Matrix.tsx` by ticket 16. The phone replaces the grid with one card per
 * dispute and the states travel with it unchanged — the glyph, the word and the tone are
 * ADR-0006's, not the table's — so a second copy of this list would be a second vocabulary,
 * and the layout a reader happened to open would decide which one they learned.
 *
 * The legend is a decoder and never the carrier: a state is legible from its own glyph and its
 * own word, and this exists so a reader meeting `∅` for the first time has somewhere to look.
 */

export const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space8};
  padding: ${({ theme }) => `${theme.space5} ${theme.space7}`};
  border: ${({ theme }) => theme.borderHairline};
  border-radius: ${({ theme }) => theme.radiusTile};
  background-color: ${({ theme }) => theme.surfaceInset};
`;

export const LegendGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space8};
`;

export const LegendItem = styled.span<{ $tone?: Tone }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space3};
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme, $tone }) => ($tone === undefined ? theme.textMeta : toneInk(theme, $tone))};
`;

/* The blank position's mark, at legend size and in the grid. 3px of quiet: it holds the layout's
   rhythm and says nothing, because nothing happened and nothing was expected. The phone's card
   collapses an undrawn agent juror to exactly this, in exactly that agent juror's slot, so
   absence still reads as absence at 390pt. */
export const Dot = styled.span`
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.textPending};
`;

/**
 * The five states and the blank, in one group.
 *
 * `unknown` is named only when one is on screen. A legend entry for a state the record does not
 * contain teaches a reader to look for a failure that is not there — and this is the entry a
 * reader would most readily mistake for one of the others.
 */
export function StateLegend({ unknown }: { unknown: boolean }) {
  return (
    <LegendGroup>
      <LegendItem $tone="pass">
        <span aria-hidden="true">✓</span>Coherent
      </LegendItem>
      <LegendItem $tone="work">
        <span aria-hidden="true">✕</span>Diverged
      </LegendItem>
      <LegendItem $tone="fail">
        <span aria-hidden="true">∅</span>No vote
      </LegendItem>
      <LegendItem $tone="live">
        <span aria-hidden="true">⋯</span>Acting
      </LegendItem>
      {unknown && (
        <LegendItem $tone="fail">
          <span aria-hidden="true">?</span>Unknown
        </LegendItem>
      )}
      <LegendItem>
        <Dot aria-hidden="true" />
        Not drawn
      </LegendItem>
    </LegendGroup>
  );
}
