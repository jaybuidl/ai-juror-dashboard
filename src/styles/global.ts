import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html {
    color-scheme: dark;
  }

  body {
    margin: 0;
    min-height: 100dvh;
    background-color: ${({ theme }) => theme.lightBackground};
    color: ${({ theme }) => theme.primaryText};
    /* System stack only. Nothing here loads a webfont, so naming one would be a
       silent no-op; the ticket that adds one must also widen style-src and font-src
       in netlify.toml, or the browser will block it. */
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
      Arial, sans-serif;
    font-size: 16px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  /* Latency figures sit in a dense grid from ticket 05 onward: tabular digits keep
     columns of numbers aligned regardless of which digits they contain. */
  :where(code, kbd, samp, pre) {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    font-variant-numeric: tabular-nums;
  }

  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.lavenderPurple};
    outline-offset: 2px;
  }
`;
