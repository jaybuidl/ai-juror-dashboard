import { useEffect } from "react";

/**
 * What the browser tab, the history menu and a screen reader's page-change announcement say.
 *
 * `index.html` carries one static title, which was right until there were routes and wrong from
 * the moment there were seven. A client-side route change swaps a subtree and nothing else: the
 * document keeps whatever title it loaded with, so every view reported the same one, a reader
 * scanning a row of tabs could not tell the matrix from a dispute, and the back menu was seven
 * identical entries. It matters most for the reader this ticket is about — retitling the
 * document is one of the two signals a screen reader has that a navigation happened at all, and
 * the only one that survives being read later out of a history list. `Shell` supplies the other,
 * which is moving focus into the new view.
 *
 * Each view names itself rather than a table here mapping paths to names, because two of the
 * seven can only name themselves: a dispute is its own id and an agent juror its own nickname,
 * and both are read from the route by the component that already parses it. A central map would
 * have to re-parse the path to say anything more specific than "Dispute".
 */
export const SITE_TITLE = "AI Juror Dashboard";

/**
 * Name this view. Pass `null` for the one view whose name is the site's own — the matrix, which
 * is what this dashboard is rather than a section of it.
 *
 * The title is restored on unmount, which is what keeps the tests below honest and costs nothing
 * in the browser: the next view sets its own on the way in.
 */
export function useDocumentTitle(name: string | null): void {
  useEffect(() => {
    const previous = document.title;
    document.title = name === null ? SITE_TITLE : `${name} · ${SITE_TITLE}`;
    return () => {
      document.title = previous;
    };
  }, [name]);
}
