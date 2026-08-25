import { type ReactNode, useEffect, useState } from "react";
import { Link } from "react-router";
import styled from "styled-components";
import { formatAgo } from "../read-failure";
import type { Failures } from "./failures";

/**
 * The designed failure state, in the two tiers `Errors.dc.html` draws.
 *
 * Built against `canvas/Errors.dc.html:43-162`. One module because the two tiers are one
 * decision — which of them a failure gets is the whole content of ticket 13's rule — and because
 * before this file there were three separately-defined Notice components in three files, each
 * added by a ticket that never met the others. They said the same thing three ways.
 *
 * One deliberate departure from the artboard: the banner's badge is a rose dot and not the
 * glyph drawn at `:45`. That glyph is the one Cell.dc.html:140 reserves for a draw that failed
 * to act and says is used nowhere else, so copying it here would put the loudest cell state's
 * mark on a banner about a network. Recorded in canvas/README.md § Known defects; the unread
 * cell's own mark is correct as drawn and is used as drawn.
 */

/* ─── the blocking banner ──────────────────────────────────────────────────────────────── */

const Banner = styled.section`
  display: flex;
  gap: ${({ theme }) => theme.space7};
  align-items: flex-start;
  width: 100%;
  padding: ${({ theme }) => theme.cardPadLg};
  border: 1px solid ${({ theme }) => theme.lineRose};
  border-radius: ${({ theme }) => theme.radiusCard};
  background-color: ${({ theme }) => theme.washRose};
  box-shadow: ${({ theme }) => theme.shadowCard};
`;

/* The artboard's 44px tile. A dot rather than a glyph, for the reason in the module comment. */
const BannerMark = styled.span`
  display: flex;
  width: 44px;
  height: 44px;
  flex: none;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme }) => theme.lineRose};
  border-radius: ${({ theme }) => theme.radiusTile};

  &::before {
    content: "";
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: ${({ theme }) => theme.stateFail};
  }
`;

const BannerBody = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${({ theme }) => theme.space5};
  min-width: 0;
`;

const BannerHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space4};
`;

const Pill = styled.span`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => `${theme.space2} ${theme.space3}`};
  border: 1px solid ${({ theme }) => theme.lineRose};
  border-radius: ${({ theme }) => theme.radiusChip};
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.stateFail};
`;

const BannerHeading = styled.h2`
  font: ${({ theme }) => theme.typeTitle2};
  letter-spacing: ${({ theme }) => theme.trackingTitle};
  color: ${({ theme }) => theme.textHeading};
`;

const BannerText = styled.p`
  max-width: 76ch;
  font: ${({ theme }) => theme.typeBodySm};
  /* The sentences below count disputes and name HTTP statuses, and the shorthand above has
     just reset the tabular figures base.css puts on body. */
  font-feature-settings: ${({ theme }) => theme.featureNumeric};
  color: ${({ theme }) => theme.textBody};
`;

const Facts = styled.dl`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => `${theme.space4} ${theme.space8}`};
  margin: 0;
`;

const Fact = styled.div`
  display: inline-flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space3};
`;

const FactKey = styled.dt`
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textPending};
`;

const FactValue = styled.dd<{ $alarm?: boolean }>`
  margin: 0;
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  color: ${({ theme, $alarm }) => ($alarm === true ? theme.stateFail : theme.textBody)};
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space7};
`;

const actionInk = `
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-decoration: none;
`;

const Retry = styled.button`
  ${actionInk}
  padding: 0;
  border: 0;
  background: none;
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.accent};
  cursor: pointer;

  &:focus-visible {
    outline: ${({ theme }) => theme.focusRing};
    outline-offset: 3px;
  }
`;

const Explain = styled(Link)`
  ${actionInk}
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.accent};
`;

/**
 * How long ago the last complete read was, kept current without a reload.
 *
 * The one clock read on this page, and it is deliberately here rather than in the model: the
 * seam consults no clock and neither does anything it returns, so the age of a read is computed
 * at the moment it is drawn. It ticks because the figure is only useful while it is true — a
 * banner that said "12s ago" for the whole afternoon a tab was left open would be worse than
 * saying nothing, since it reads as freshness.
 */
function Ago({ at }: { at: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return <>{formatAgo(at, now)}</>;
}

/**
 * The rose banner, at the top of any view whose figures are incomplete.
 *
 * Renders nothing at all when nothing is wrong, which is what lets every view mount it
 * unconditionally: "every read that fails says so in a banner at the top of the page" is then a
 * property of the layout rather than something each page has to remember.
 *
 * `role="alert"` and not `role="status"`: the local notices are status, this is the one thing on
 * the page a reader must not miss, and the whole ticket is about the difference.
 */
export function FailureBanner({ failures }: { failures: Failures }) {
  const { blocking, offline, lastCompleteRead, retry } = failures;
  if (blocking.length === 0 && !offline) return null;

  return (
    <Banner role="alert" aria-labelledby="failure-heading">
      <BannerMark aria-hidden="true" />
      <BannerBody>
        <BannerHead>
          <Pill>Incomplete</Pill>
          <BannerHeading id="failure-heading">
            Part of this page could not be read. Do not cite these figures.
          </BannerHeading>
        </BannerHead>

        {offline ? (
          <BannerText>
            This browser reports no network connection, so nothing on this page is being read at
            all. What is below is whatever was already held, from whenever it was last read — not
            the court as it stands.
          </BannerText>
        ) : (
          <BannerText>
            {blocking.map((read) => read.what).join(" ")} What could not be read is unknown — not
            zero, and not absent. Every figure on this page is computed from what did load, and is
            labelled as partial wherever it appears.
          </BannerText>
        )}

        <Facts>
          {blocking.map((read) => (
            <Fact key={read.source.name}>
              <FactKey>Source</FactKey>
              <FactValue>{read.source.name}</FactValue>
              <FactKey>Status</FactKey>
              {/* Never invented. A DNS failure, a CORS rejection and a blocked request all
                  arrive with no status at all, and "HTTP 0" would be a fact nothing measured. */}
              <FactValue $alarm>{read.status ?? "No response"}</FactValue>
            </Fact>
          ))}
          <Fact>
            <FactKey>Last complete read</FactKey>
            {/* `aria-live="off"` inside a `role="alert"` region, which is assertive: the banner is
                announced in full when it appears, and this subtree's once-a-second tick is then
                not re-announced. Without it a screen-reader user on a partial page has the age
                interrupt whatever else they are listening to, every second, for as long as the
                banner is up — an accessibility failure introduced by a figure meant to help. It
                still ticks visually, which is the whole point of it. */}
            <FactValue aria-live="off">
              {lastCompleteRead === null ? "Never" : <Ago at={lastCompleteRead} />}
            </FactValue>
          </Fact>
        </Facts>

        <Actions>
          {retry !== null && (
            <Retry type="button" onClick={retry}>
              Retry ↵
            </Retry>
          )}
          <Explain to="/method#partial">What this means ↗</Explain>
        </Actions>
      </BannerBody>
    </Banner>
  );
}

/* ─── the degraded panel ───────────────────────────────────────────────────────────────── */

const Panel = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space5};
  padding: ${({ theme }) => `${theme.space7} ${theme.space8}`};
  border: 1px solid ${({ theme }) => theme.lineAmber};
  border-radius: ${({ theme }) => theme.radiusCard};
  background-color: ${({ theme }) => theme.washAmber};
`;

const PanelLabel = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space3};
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.stateWork};
`;

const PanelHeading = styled.h3`
  font: ${({ theme }) => theme.typeTitle3};
  letter-spacing: ${({ theme }) => theme.trackingTitle};
  color: ${({ theme }) => theme.textHeading};
`;

const PanelBody = styled.p`
  max-width: 68ch;
  font: ${({ theme }) => theme.typeBodySm};
  color: ${({ theme }) => theme.textBody};
`;

/**
 * The amber panel: something could not be read and no figure depends on it.
 *
 * Ticket 14 built the first of these in `Roster.tsx` against `Errors.dc.html:142`, having first
 * built it in no state colour at all — which came out quieter than the prose it interrupts, and
 * `CLAUDE.md` forbids that of a caveat. This is that panel, lifted rather than reinvented, so
 * the roster card and every later one are the same component.
 */
export function DegradedPanel({
  heading,
  children,
  footer,
}: {
  heading: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Panel role="status">
      <PanelLabel>
        <span aria-hidden="true">◇</span>
        Degraded, not broken
      </PanelLabel>
      <PanelHeading>{heading}</PanelHeading>
      <PanelBody>{children}</PanelBody>
      {footer}
    </Panel>
  );
}

/* ─── the local notice ─────────────────────────────────────────────────────────────────── */

/**
 * What a failure says in the place where the missing figure would have been.
 *
 * The other half of "every read that fails says so twice". Rose where the failure costs a
 * figure, amber where it costs only a label — the same rule the two tiers above encode, at the
 * scale of one section rather than one page.
 */
export const Notice = styled.p<{ $tone: "rose" | "amber" }>`
  max-width: 68ch;
  margin: 0;
  padding: ${({ theme }) => `${theme.space4} ${theme.space6}`};
  border: 1px solid
    ${({ theme, $tone }) => ($tone === "rose" ? theme.lineRose : theme.lineAmber)};
  border-radius: ${({ theme }) => theme.radiusTile};
  background-color: ${({ theme, $tone }) => ($tone === "rose" ? theme.washRose : theme.washAmber)};
  font: ${({ theme }) => theme.typeBodySm};
  /* Every one of these counts something: disputes, titles, commitments. */
  font-feature-settings: ${({ theme }) => theme.featureNumeric};
  color: ${({ theme }) => theme.textBody};
`;
