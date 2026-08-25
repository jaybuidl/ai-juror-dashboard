import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ThemeProvider } from "styled-components";
import fixture from "../disputes/court-34.fixture.json" with { type: "json" };
import { type RawDispute, toDisputes } from "../disputes/disputes";
import type { DisputesView } from "../disputes/useDisputes";
import commitFixture from "../performance/court-34-commits.fixture.json" with { type: "json" };
import drawFixture from "../performance/court-34-draws.fixture.json" with { type: "json" };
import {
  buildCourtPerformance,
  type RawCommitCast,
  type RawDraw,
} from "../performance/performance";
import type { CourtPerformanceView } from "../performance/useCourtPerformance";
import { ROSTER } from "../roster/agent-jurors";
import { rosterIdentity } from "../roster/ens";
import type { RosterView } from "../roster/useRoster";
import { DashboardRoutes, type DashboardRoutesProps } from "../routes";
import { theme } from "../styles/theme";

/**
 * The court, as every view test renders it.
 *
 * Shared because the same captured payload now feeds four routes, and four copies of this
 * setup would be four chances for one of them to drift into testing a court the others do not
 * have. It is the same fixture the seam's own tests read: one successful read of a working
 * court, captured from Goldsky.
 *
 * The failure shapes below are hand-built for the same reason `CLAUDE.md` gives — every fixture
 * in this repository is a read that worked, so no fixture can hand you a read that did not.
 */

/**
 * What the page has once ENS has been tried and answered for nobody.
 *
 * Deliberately split from `resolvingRoster` below. `isResolvedFromEns` is false in both states —
 * while the mainnet lookup is out, and after it failed — and a caveat keyed on that flag alone
 * announces a failure that has not happened yet on every cold load. One fixture covering both
 * would make that untestable, which is how it survived review the first time.
 */
export const unresolvedRoster: RosterView = {
  entries: ROSTER.map((agentJuror) => ({ agentJuror, identity: rosterIdentity(agentJuror) })),
  isResolving: false,
  isResolvedFromEns: false,
};

/** What the page has while the ENS lookup is still out: the same rows, and nothing decided. */
export const resolvingRoster: RosterView = {
  entries: ROSTER.map((agentJuror) => ({ agentJuror, identity: rosterIdentity(agentJuror) })),
  isResolving: true,
  isResolvedFromEns: false,
};

/** What the page has once ENS answers for everyone. */
export const resolvedRoster: RosterView = {
  entries: ROSTER.map((agentJuror) => ({
    agentJuror,
    identity: {
      address: agentJuror.address,
      nickname: agentJuror.nickname,
      avatarUrl: `https://euc.li/${agentJuror.nickname}.agents.kleroslabs.eth`,
      resolvedFromEns: true,
    },
  })),
  isResolving: false,
  isResolvedFromEns: true,
};

/** A fixed moment, so the footer's read time is not a moving target in a test. */
export const READ_AT = Date.UTC(2026, 7, 25, 5, 12, 0);

/** The court as the dashboard holds it, read from the captured payload. */
export const disputes: DisputesView = {
  raw: fixture as RawDispute[],
  disputes: toDisputes(fixture as RawDispute[]),
  isLoading: false,
  error: null,
  readAt: READ_AT,
};

const built = buildCourtPerformance({
  disputes: fixture as RawDispute[],
  draws: drawFixture as RawDraw[],
  commits: commitFixture as RawCommitCast[],
  roster: ROSTER,
});
if (!built.success) throw new Error(`${built.code}: ${built.message}`);

/** The matrix, measured from the same payload. */
export const measured: CourtPerformanceView = {
  performance: built.data,
  isLoading: false,
  error: null,
  commitError: null,
};

/** What the page has when the draws could not be read at all. */
export const unmeasured: CourtPerformanceView = {
  performance: null,
  isLoading: false,
  error: new Error("Core subgraph returned HTTP 503 Service Unavailable"),
  commitError: null,
};

/**
 * The same court with the commit log read still out — which is every cold load, because the
 * chain answers slower than the subgraph and the matrix deliberately does not wait for it.
 *
 * `commits: null` and not `[]`: the two are different states and the page says different things
 * about them. This is the one the merge of tickets 07 and 15 newly made reachable — a provenance
 * footer built when commit latency was unread has to say something else once it is read, and
 * something else again while the reading is in flight.
 */
const building = buildCourtPerformance({
  disputes: fixture as RawDispute[],
  draws: drawFixture as RawDraw[],
  commits: null,
  roster: ROSTER,
});
if (!building.success) throw new Error(`${building.code}: ${building.message}`);

/** What the page has before the commitments land: every other measure, and no commit latency. */
export const commitsPending: CourtPerformanceView = {
  performance: building.data,
  isLoading: false,
  error: null,
  commitError: null,
};

export const views: DashboardRoutesProps = {
  roster: resolvedRoster,
  disputes,
  performance: measured,
};

/**
 * Render the whole dashboard at one URL.
 *
 * Through the router rather than by rendering a page component directly: the shell, the nav and
 * the footer are as much a part of what a route renders as its content is, and a test that
 * skipped them could not tell that a view had lost its chrome.
 */
export function renderAt(path: string, overrides: Partial<DashboardRoutesProps> = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[path]}>
        <DashboardRoutes {...views} {...overrides} />
      </MemoryRouter>
    </ThemeProvider>,
  );
}
