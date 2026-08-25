import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router";
import { ThemeProvider } from "styled-components";
import { useDisputes } from "./disputes/useDisputes";
import { useCourtPerformance } from "./performance/useCourtPerformance";
import { queryClient } from "./query-client";
import { useRoster } from "./roster/useRoster";
import { DashboardRoutes } from "./routes";
import { GlobalStyle } from "./styles/global";
import { theme } from "./styles/theme";

/**
 * Composition root: providers, and the one place a hook reaches the network.
 *
 * The views take what they render as props, so the whole dashboard can be exercised offline
 * against hand-built data. That split is what keeps `yarn test` network-free without a mock
 * anywhere — see README.md § Conventions.
 *
 * The reads happen here rather than per route on purpose: one court read feeds the matrix, the
 * dispute index and the totals above them, and moving to another view must not re-read what is
 * already held. The router is a `BrowserRouter` because these are real URLs — a pasted link has
 * to resolve, and the SPA fallback in `netlify.toml` is what makes that work in production.
 */
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        <BrowserRouter>
          <ConnectedDashboard />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function ConnectedDashboard() {
  const roster = useRoster();
  const disputes = useDisputes();
  const performance = useCourtPerformance(disputes);

  return <DashboardRoutes roster={roster} disputes={disputes} performance={performance} />;
}
