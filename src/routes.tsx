import { Route, Routes } from "react-router";
import { Shell } from "./chrome/Shell";
import type { DisputesView } from "./disputes/useDisputes";
import { AgentJurorPage } from "./pages/AgentJurorPage";
import { AgentJurorsPage } from "./pages/AgentJurorsPage";
import { DisputePage } from "./pages/DisputePage";
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
 * Ticket 09 added `disputes/:disputeId` beneath the dispute index, which is what the breadcrumb
 * on that view points back to and what keeps "Disputes" marked in the nav while you are on it.
 * Ticket 11 adds `agent-jurors/:nickname` on the same terms.
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
        {/* Nested under the index rather than beside it, so the breadcrumb's parent and the
            URL's parent are the same thing. `DisputePage` reads the id from the path and does
            its own per-dispute read; everything else it renders is already held above. */}
        <Route
          path="disputes/:disputeId"
          element={<DisputePage roster={roster} disputes={disputes} performance={performance} />}
        />
        <Route path="agent-jurors" element={<AgentJurorsPage roster={roster} />} />
        {/* Nested under the index for the reason `disputes/:disputeId` is: the breadcrumb's
            parent and the URL's parent are then the same thing, and `isCurrent` keeps "Agent
            jurors" marked in the nav while you are on one of them. Unlike that route this one
            reads nothing of its own — ticket 06 computed every figure it shows — so it takes
            the same three views the matrix does and starts no query. */}
        <Route
          path="agent-jurors/:nickname"
          element={<AgentJurorPage roster={roster} disputes={disputes} performance={performance} />}
        />
        <Route path="method" element={<MethodPage />} />
        {/* Netlify answers every unknown path with the app shell at HTTP 200, so this is the
            only thing that can tell a visitor the address is wrong. */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
