import {
  type ComponentProps,
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styled from "styled-components";
import { hostOf } from "../host";
import type { Justification } from "./justifications";

/**
 * One agent juror's published reasoning, reproduced.
 *
 * Reproduced is the operative word: this dashboard does not summarise, translate or rank
 * justifications, and the whole point of putting a panel's side by side is that a reader
 * compares them for themselves. What this component adds is the three things prose needs to be
 * *readable* in a column — Markdown rendering, a bound on its height, and a warning before a
 * link inside it takes you somewhere this repository does not control.
 *
 * Raw HTML is disabled, which is what `react-markdown` does when nothing enables it: there is
 * no `rehype-raw` here and there must not be. That is deliberately stricter than the Kleros
 * court frontend, which enables raw HTML and sanitises afterwards. The prose is written by
 * agents, published on chain by whoever ran them, and validated by nobody; a parser that never
 * builds the node is a smaller thing to be right about than a sanitiser that has to drop the
 * right ones.
 */

/**
 * How tall a column's prose may be before it is clipped.
 *
 * `canvas/Dispute.dc.html:22` fixes the body at 612px so five columns line up. Here it is a
 * *max* rather than a height: the artboard's five justifications are sample content of similar
 * length, and the real record runs from 232 characters to 7,079. A fixed height would pad the
 * short ones with as much empty space as the long ones are missing.
 */
const CLIPPED_HEIGHT = "612px";

const Body = styled.div<{ $clipped: boolean }>`
  position: relative;
  overflow: hidden;
  max-height: ${({ $clipped }) => ($clipped ? CLIPPED_HEIGHT : "none")};

  /* The system's prose, restated here because this is the one place on the dashboard where
     arbitrary Markdown lands and every element it can produce has to have somewhere to go.
     Anything not listed renders with the browser's default, which is legible if plain. */
  p,
  ul,
  ol,
  blockquote,
  pre,
  table {
    margin: 0 0 ${({ theme }) => theme.space5};
  }

  > :last-child {
    margin-bottom: 0;
  }

  p,
  li {
    font: ${({ theme }) => theme.typeBodySm};
    color: ${({ theme }) => theme.textBody};
    /* The font shorthand above resets the tabular figures base.css puts on body, and these
       justifications quote money, dates and section numbers constantly. Written without
       backticks: one inside a CSS comment ends this template literal, and the parse error
       then points hundreds of lines further down. */
    font-feature-settings: ${({ theme }) => theme.featureNumeric};
    text-wrap: pretty;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin: ${({ theme }) => `${theme.space6} 0 ${theme.space4}`};
    font: ${({ theme }) => theme.typeTitle3};
    letter-spacing: ${({ theme }) => theme.trackingTitle};
    color: ${({ theme }) => theme.textHeading};
  }

  > h1:first-child,
  > h2:first-child,
  > h3:first-child {
    margin-top: 0;
  }

  strong {
    color: ${({ theme }) => theme.textHeading};
  }

  ul,
  ol {
    padding-left: ${({ theme }) => theme.space6};
  }

  li {
    margin-bottom: ${({ theme }) => theme.space3};
  }

  blockquote {
    padding-left: ${({ theme }) => theme.space5};
    border-left: 2px solid ${({ theme }) => theme.lineStrongColor};
    color: ${({ theme }) => theme.textMeta};
  }

  code {
    font: ${({ theme }) => theme.typeMonoSm};
    font-feature-settings: ${({ theme }) => theme.featureMono};
    color: ${({ theme }) => theme.textHeading};
  }

  pre {
    padding: ${({ theme }) => theme.space5};
    border-radius: ${({ theme }) => theme.radiusChip};
    background-color: ${({ theme }) => theme.surfaceInset};
    /* A fenced block is the one thing here that cannot be reflowed, so it scrolls inside
       its own box rather than widening the column and the row behind it. */
    overflow-x: auto;
  }

  /* GFM tables are real in this record — dispute 154's justification compares three price
     feeds in one. Scrolls for the same reason a code fence does. */
  table {
    display: block;
    width: fit-content;
    max-width: 100%;
    overflow-x: auto;
    border-collapse: collapse;
    font: ${({ theme }) => theme.typeBodySm};
    font-feature-settings: ${({ theme }) => theme.featureNumeric};
    color: ${({ theme }) => theme.textBody};
  }

  th,
  td {
    padding: ${({ theme }) => `${theme.space3} ${theme.space4}`};
    border: ${({ theme }) => theme.borderHairline};
    text-align: left;
  }

  th {
    color: ${({ theme }) => theme.textHeading};
  }

  hr {
    margin: ${({ theme }) => `${theme.space6} 0`};
    border: 0;
    border-top: ${({ theme }) => theme.borderHairline};
  }

  img {
    max-width: 100%;
  }
`;

/* The artboard's gradient, which says "there is more" without a word. Decoration only — the
   control below it is what actually offers the rest, and it is a button rather than a hint. */
const Fade = styled.div`
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 96px;
  background: linear-gradient(180deg, transparent 0%, ${({ theme }) => theme.surfaceCard} 78%);
  pointer-events: none;
`;

const Link = styled.a`
  color: ${({ theme }) => theme.accent};
  text-decoration: underline;
  text-underline-offset: 2px;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.focusRing};
    outline-offset: 2px;
  }
`;

const Control = styled.button`
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.accent};
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  white-space: nowrap;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.focusRing};
    outline-offset: 3px;
  }
`;

/* Rose, and the one place on this view that colour is used for a warning. It is not a read
   that failed — nothing here is wrong — but it is the only thing on the page that can take a
   reader off it, and ADR-0006's second meaning for rose is exactly this: stop and look. */
const Warning = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space4};
  margin-top: ${({ theme }) => theme.space5};
  padding: ${({ theme }) => theme.space5};
  border: 1px solid ${({ theme }) => theme.lineRose};
  border-radius: ${({ theme }) => theme.radiusChip};
  background-color: ${({ theme }) => theme.washRose};
`;

const WarningText = styled.p`
  font: ${({ theme }) => theme.typeBodySm};
  color: ${({ theme }) => theme.textBody};
`;

const Destination = styled.span`
  display: block;
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  color: ${({ theme }) => theme.textHeading};
  overflow-wrap: anywhere;
`;

const WarningActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space6};
`;

/**
 * Whether the prose overflows the height it is given.
 *
 * Measured rather than guessed from a character count: how much fits depends on the column's
 * width, the reader's font size and what Markdown the prose used, and a 3,000-character
 * justification of short paragraphs is taller than one long one. A guess would put "Read all"
 * under prose that is already whole, which is a control that does nothing.
 *
 * The cap has to be **applied while this measures**, and that is the whole subtlety. Deciding
 * whether to clip and then clipping means `scrollHeight` and `clientHeight` are equal at the
 * moment of the test — the element is its full height because nothing has bounded it yet — so
 * the answer is always "it fits" and nothing ever clips. Dispute 154 holds a 7,079-character
 * justification, which is what made it obvious: the column ran five thousand pixels down the
 * page and stretched every other column beside it. So `collapsed` bounds the element
 * unconditionally and this reports whether the content exceeded that bound.
 *
 * Re-measured on resize, because the columns are a responsive grid and a narrower column is a
 * taller one.
 */
function useIsClipped(ref: React.RefObject<HTMLElement | null>, enabled: boolean): boolean {
  const [clipped, setClipped] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (element === null || !enabled) {
      setClipped(false);
      return;
    }

    const measure = () => setClipped(element.scrollHeight > element.clientHeight);
    measure();

    // Guarded: jsdom has no ResizeObserver, and neither does a browser old enough to matter
    // less than this feature. Without one the measurement simply does not repeat.
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, enabled]);

  return clipped;
}

/**
 * The Markdown component map and the plugin list, hoisted out of the render.
 *
 * They were inline object and array literals, which is the ordinary way to write this and was
 * wrong here for a reason that only surfaces once something holds a reference to the DOM. A new
 * function identity for `a` on every render is a new component *type* to React, so every anchor
 * in the prose was unmounted and remounted whenever this component rendered for any reason — a
 * state change, a parent re-render, ticket 12's five-second poll. Nothing looked wrong, because
 * the links were rebuilt identically. But a ref to one of them pointed at a detached node a
 * moment later, which is what stopped the interstitial handing focus back to the link it had
 * interrupted, and would equally have dropped a selection or an in-progress interaction.
 *
 * Neither closes over anything from the render, so hoisting costs nothing.
 */
const REMARK_PLUGINS = [remarkGfm];

const MARKDOWN_COMPONENTS = {
  // Rendered as a real anchor so it looks, focuses and reads like a link; the container's
  // handler is what stops it navigating. `rel` and `target` are set here rather than left to
  // the interstitial so that a reader who opens one in a new tab from the context menu gets
  // them too.
  a: ({ node: _node, ...props }: ComponentProps<"a"> & { node?: unknown }) => (
    <Link {...props} target="_blank" rel="noopener noreferrer nofollow ugc" />
  ),
};

export function JustificationProse({ justification }: { justification: Justification }) {
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const body = useRef<HTMLDivElement>(null);
  // The element is bounded whenever it is collapsed, whether or not anything overflows — see
  // `useIsClipped`. `overflows` is then a fact about the content rather than a decision about
  // it, and is what the fade and the control key on.
  const collapsed = !expanded;
  const overflows = useIsClipped(body, collapsed);

  /** The anchor whose navigation the panel is standing in for, and the panel itself. */
  const interrupted = useRef<HTMLAnchorElement | null>(null);
  const warning = useRef<HTMLDivElement | null>(null);

  /*
   * The panel takes focus when it opens and hands it back when it closes.
   *
   * It replaces a navigation the reader asked for, which makes it a question — and a question
   * has to arrive where the reader is standing. It renders after the whole prose body, so
   * leaving focus on the intercepted link meant a keyboard reader had to tab through the rest
   * of a justification, and every other link in it, to reach the Cancel button of a panel their
   * own keypress had just opened. Dispute 154's justification is 7,079 characters.
   *
   * Focus goes to the panel rather than to its first control so that the warning is read before
   * the choice it offers, which is the whole point of interrupting.
   */
  const dismiss = useCallback(() => setPending(null), []);

  useEffect(() => {
    if (pending !== null) {
      warning.current?.focus();
      return;
    }

    // Restoring focus has to happen *after* the panel is gone, not in the click handler that
    // dismisses it. Focus is on the panel at that moment, so returning it to the link first and
    // then unmounting the focused element leaves the document to fall back to <body> — the
    // reader is dropped at the top of the tab order by the very step meant to prevent that.
    // Written as an effect on `pending` so the two orderings cannot be got the wrong way round.
    const anchor = interrupted.current;
    interrupted.current = null;
    // Null on first render, which is what keeps this from stealing focus on arrival.
    if (anchor?.isConnected === true) anchor.focus();
  }, [pending]);

  /**
   * Every link in the prose, caught in one place.
   *
   * On the container rather than on each rendered anchor, so a link produced by any Markdown
   * construct is covered by the same handler — an autolink, a reference link and an inline one
   * are three different nodes and one interception.
   */
  const intercept = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const anchor = (event.target as HTMLElement).closest("a");
    const href = anchor?.getAttribute("href");
    if (anchor === null || href === null || href === undefined) return;

    // Remembered so the panel can put the reader back where they were. Captured here rather
    // than read from `document.activeElement` when the panel closes, because by then the click
    // may have moved focus and a pointer user never gave the anchor focus in the first place.
    interrupted.current = anchor;

    // Still swallow the click on a link that goes nowhere, and do not open a warning about it.
    // `react-markdown`'s URL sanitiser rewrites a blocked protocol to the **empty string**
    // rather than dropping the attribute, so `[click](javascript:alert(1))` in a justification
    // reaches here as `href=""` — a link the browser resolves to this very page. It is not a
    // hole; the sanitiser did its job. But warning about it would put a rose panel on screen
    // whose destination line is blank, whose host reads "not a link this page can read", and
    // whose "Open in a new tab" offers the dashboard back to the reader.
    event.preventDefault();
    if (href === "") return;

    setPending(href);
  }, []);

  return (
    <>
      {/* The click handler below adds no interactive surface of its own: it intercepts links
          that are already focusable and that already fire `click` on Enter, so there is no
          keyboard path that misses it and a key handler here would double-fire. */}
      <Body
        ref={body}
        $clipped={collapsed}
        onClick={intercept}
        // Set from what the prose was recognised as, so a screen reader pronounces a Spanish
        // justification as Spanish and the browser hyphenates it by the right rules. Absent
        // where nothing was recognised, which inherits the page's language rather than
        // asserting English over prose nobody identified.
        lang={justification.lang ?? undefined}
      >
        <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={MARKDOWN_COMPONENTS}>
          {justification.text}
        </ReactMarkdown>
        {overflows && collapsed && <Fade aria-hidden="true" />}
      </Body>

      {pending !== null && (
        <Warning
          ref={warning}
          /*
           * `alertdialog` and not `alert`. An alert is a live region and per ARIA should carry
           * no interactive content; this carries two controls and requires an answer, which is
           * what an alert dialog is for — announced on arrival like an alert, and focusable like
           * a dialog. Deliberately not modal: nothing behind it is disabled and the reader may
           * tab away and leave it standing, because the panel interrupts one link rather than
           * the page. That is why there is no focus trap here, and it is a decision rather than
           * an omission — `docs/accessibility.md` records it.
           */
          role="alertdialog"
          aria-label="Leaving this dashboard"
          tabIndex={-1}
          onKeyDown={(event) => {
            // Escape, for the same reason the folded nav has one: a panel that can only be
            // dismissed by finding its own button is one a keyboard reader is stuck inside.
            if (event.key === "Escape") dismiss();
          }}
        >
          <WarningText>
            This link was written by an agent juror inside its own justification. It is not part of
            this dashboard and nothing here has checked where it goes.
            {/* The host on its own line, and the whole URL beneath it. A link's *text* is written
                by the same agent that wrote the prose, so it is the one part of a justification
                that can say one thing and do another — and this view reproduces prose verbatim
                rather than rewriting it. */}
            <Destination>{hostOf(pending) ?? "Not a link this page can read"}</Destination>
          </WarningText>
          <Destination>{pending}</Destination>
          <WarningActions>
            {/* A real anchor, so the browser's own "open in new tab" and status bar work and
                the destination is visible before the click as well as after. */}
            <Link href={pending} target="_blank" rel="noopener noreferrer nofollow ugc">
              Open in a new tab ↗
            </Link>
            <Control type="button" onClick={dismiss}>
              Cancel
            </Control>
          </WarningActions>
        </Warning>
      )}

      {overflows && collapsed && (
        <Control type="button" onClick={() => setExpanded(true)}>
          Read all ↓
        </Control>
      )}
      {expanded && (
        <Control type="button" onClick={() => setExpanded(false)}>
          Show less ↑
        </Control>
      )}
    </>
  );
}
