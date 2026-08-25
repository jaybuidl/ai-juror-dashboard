import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "styled-components";
import { Dashboard } from "./Dashboard";
import { useDisputes } from "./disputes/useDisputes";
import { queryClient } from "./query-client";
import { useRoster } from "./roster/useRoster";
import { GlobalStyle } from "./styles/global";
import { theme } from "./styles/theme";

/**
 * Composition root: providers, and the one place a hook reaches the network.
 *
 * Dashboard itself takes what it renders as props, so the whole page can be exercised
 * offline against hand-built data. That split is what keeps `yarn test` network-free
 * without a mock anywhere — see README.md § Conventions.
 */
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        <ConnectedDashboard />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function ConnectedDashboard() {
  return <Dashboard roster={useRoster()} disputes={useDisputes()} />;
}
