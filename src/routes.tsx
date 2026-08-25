import { Route, Routes } from "react-router";
import { Shell } from "./chrome/Shell";
import type { DisputesView } from "./disputes/useDisputes";
import { AgentJurorsPage } from "./pages/AgentJurorsPage";
import { DisputesPage } from "./pages/DisputesPage";
import { MatrixPage } from "./pages/MatrixPage";
import { MethodPage } from "./pages/MethodPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import type { CourtPerformanceView } from "./performance/useCourtPerformance";
import type { RosterView } from "./roster/useRoster";

/**
 * Every route this dashboard has, under one shell.
 *
 * The shell is a layout route: nav, ground and the destinations, rendered once around whichever
 * view matched — including the 404, so a wrong URL is still recognisably this dashboard rather
 * than a bare error.
 *
 * The views take what they render as props, exactly as they did before there were routes:
 * `App` is the one place a hook reaches the network, and everything below here can be exercised
 * offline against hand-built data with no mock anywhere. That is also why this component takes
 * the three views rather than calling the hooks itself — a route table that fetched would put
 * a request behind every test that renders a link.
 *
 * Tickets 09 and 11 add `disputes/:disputeId` and `agent-jurors/:nickname` beneath the two
 * index routes, which is what the breadcrumb on those views points back to.
 */

export type DashboardRoutesProps = {
  roster: RosterView;
  disputes: DisputesView;
  performance: CourtPerformanceView;
};

export function DashboardRoutes({ roster, disputes, performance }: DashboardRoutesProps) {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route
          index
          element={<MatrixPage roster={roster} disputes={disputes} performance={performance} />}
        />
        <Route path="disputes" element={<DisputesPage disputes={disputes} />} />
        <Route path="agent-jurors" element={<AgentJurorsPage roster={roster} />} />
        <Route path="method" element={<MethodPage />} />
        {/* Netlify answers every unknown path with the app shell at HTTP 200, so this is the
            only thing that can tell a visitor the address is wrong. */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
