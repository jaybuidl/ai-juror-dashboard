import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { ReactNode } from "react";
import { BrowserRouter } from "react-router";
import { ThemeProvider } from "styled-components";
import { useDisputes } from "./disputes/useDisputes";
import { useCourtPerformance } from "./performance/useCourtPerformance";
import {
  dashboardPersister,
  PERSISTED_MAX_AGE_MS,
  PERSISTED_MODEL_VERSION,
  rederive,
  shouldPersistQuery,
  stripDerived,
} from "./persistence";
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
    <QueryProviders>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        <BrowserRouter>
          <ConnectedDashboard />
        </BrowserRouter>
      </ThemeProvider>
    </QueryProviders>
  );
}

/**
 * The query client, with the court's finalised record restored from the last visit where the
 * browser will hold it.
 *
 * Two providers rather than one because persistence is genuinely optional: a browser that will
 * not store anything gets the plain client and re-reads the court, which is what every load did
 * before ticket 12. Nothing downstream can tell the difference, and no state lives only in the
 * cache — `persistence.ts` says what is kept and why it is safe to keep it.
 */
function QueryProviders({ children }: { children: ReactNode }) {
  const persister = dashboardPersister();

  if (persister === null) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: PERSISTED_MAX_AGE_MS,
        // Bumping this discards every restored entry, which is the point: it is how a change
        // to a stored value's *shape* stops today's code reading yesterday's.
        buster: PERSISTED_MODEL_VERSION,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.state.status === "success" && shouldPersistQuery(query.queryKey),
          // Payloads go to storage; anything modelled from one does not. See `persistence.ts`.
          serializeData: stripDerived,
        },
        hydrateOptions: {
          // And it is rebuilt here by today's code, which is what keeps a changed derivation
          // from being served out of a cache written under the old one.
          defaultOptions: { deserializeData: rederive },
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

function ConnectedDashboard() {
  const roster = useRoster();
  const disputes = useDisputes();
  const performance = useCourtPerformance(disputes);

  return <DashboardRoutes roster={roster} disputes={disputes} performance={performance} />;
}
