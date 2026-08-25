import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ThemeProvider } from "styled-components";
import fixture from "../disputes/court-34.fixture.json" with { type: "json" };
import templateFixture from "../disputes/court-34-templates.fixture.json" with { type: "json" };
import {
  type RawDisputeTemplate,
  templateFor,
  toDisputeTemplates,
} from "../disputes/dispute-templates";
import { type RawDispute, toDisputes } from "../disputes/disputes";
import type { DisputesView } from "../disputes/useDisputes";
import commitFixture from "../performance/court-34-commits.fixture.json" with { type: "json" };
import drawFixture from "../performance/court-34-draws.fixture.json" with { type: "json" };
import parameterFixture from "../performance/court-34-parameters.fixture.json" with {
  type: "json",
};
import {
  buildCourtPerformance,
  type RawCommitCast,
  type RawDraw,
} from "../performance/performance";
import type { CourtPerformanceView } from "../performance/useCourtPerformance";
import type { RawCourtParameters } from "../performance/windows";
import { ReadFailure, SOURCES } from "../read-failure";
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

/**
 * The sixteen templates the captured court joins to, from the same day's read of the DRT
 * subgraph.
 *
 * Real rather than hand-written, because what the views have to survive is what publishers
 * actually publish: dispute 159's category is the empty string on chain, and the choice names
 * a ruling card prints are whatever somebody typed into a JSON blob nothing validates.
 */
export const templates = toDisputeTemplates(templateFixture as RawDisputeTemplate[]);

/** The court as the dashboard holds it, read from the captured payload. */
export const disputes: DisputesView = {
  raw: fixture as RawDispute[],
  disputes: toDisputes(fixture as RawDispute[]),
  isLoading: false,
  error: null,
  readAt: READ_AT,
  isPaused: false,
  retry: () => {},
  slotsFor: (dispute) => {
    const template = templateFor(templates, dispute);
    return { title: template?.title, category: template?.category };
  },
  templateFor: (dispute) => templateFor(templates, dispute),
};

const built = buildCourtPerformance({
  disputes: fixture as RawDispute[],
  draws: drawFixture as RawDraw[],
  commits: commitFixture as RawCommitCast[],
  parameters: parameterFixture as RawCourtParameters[],
  roster: ROSTER,
  drawsReadAt: null,
});
if (!built.success) throw new Error(`${built.code}: ${built.message}`);

/** The matrix, measured from the same payload. */
export const measured: CourtPerformanceView = {
  performance: built.data,
  isLoading: false,
  error: null,
  commitError: null,
  parametersError: null,
  failure: null,
  readAt: READ_AT,
  isPaused: false,
  retry: () => {},
};

/** What the page has when the draws could not be read at all. */
export const unmeasured: CourtPerformanceView = {
  performance: null,
  isLoading: false,
  error: new ReadFailure("The core subgraph returned HTTP 503 Service Unavailable", {
    source: SOURCES.core,
    status: "HTTP 503",
  }),
  commitError: null,
  parametersError: null,
  failure: null,
  // The draws never landed at all, so this page has never been complete and the banner says
  // "Never" rather than dating it to the dispute read that did succeed.
  readAt: null,
  isPaused: false,
  retry: () => {},
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
  parameters: null,
  roster: ROSTER,
  drawsReadAt: null,
});
if (!building.success) throw new Error(`${building.code}: ${building.message}`);

/**
 * What the page has before either Arbitrum read lands: every subgraph measure, no commit
 * latency, and nothing marked as having run under a window the court has since changed.
 */
export const arbitrumPending: CourtPerformanceView = {
  performance: building.data,
  isLoading: false,
  error: null,
  commitError: null,
  parametersError: null,
  failure: null,
  readAt: READ_AT,
  isPaused: false,
  retry: () => {},
};

/**
 * The same court with both Arbitrum reads having failed rather than being in flight.
 *
 * A separate fixture and not a flag on the one above, for the reason `CLAUDE.md` records
 * against `RosterView`: `read` is false while the chain is being asked *and* after it refused,
 * so a caveat keyed on it alone announces a failure that has not happened on every cold load
 * and then retracts it. Only the error tells the two apart, and only a fixture carrying one
 * can prove the page does.
 */
export const arbitrumFailed: CourtPerformanceView = {
  ...arbitrumPending,
  commitError: new Error("HTTP request failed: 429 Too Many Requests"),
  parametersError: new Error("HTTP request failed: 429 Too Many Requests"),
  failure: null,
  readAt: READ_AT,
  isPaused: false,
  retry: () => {},
};

/**
 * A dispute the draw read could not have seen, and the moment that read landed.
 *
 * Hand-built, because no fixture here can hold one: every fixture is a single successful read,
 * and a payload captured in one moment cannot contain a dispute that post-dates it. This is the
 * drift `CLAUDE.md` records — react-query keeps the draws it already holds when a refetch fails,
 * so a fresh dispute list joins an old draw read and a dispute created since arrives with no
 * cells at all. Without the read moment those six blanks would say "not drawn".
 *
 * Dispute 163 was created at unix 1787340123; this one ten minutes later, in `evidence` with an
 * all-zero timeline — exactly how disputes 167–169 arrived on the day this was written.
 */
const DRAWS_READ_AT = 1787340123 * 1000;

const newcomer: RawDispute = {
  id: "170",
  disputeID: "170",
  period: "evidence",
  ruled: false,
  currentRuling: "0",
  createdAt: String(DRAWS_READ_AT / 1000 + 600),
  lastPeriodChange: String(DRAWS_READ_AT / 1000 + 600),
  currentRoundIndex: "0",
  rounds: [{ id: "170-0", timeline: ["0", "0", "0", "0"] }],
  templateId: null,
};

const driftedDisputes = [newcomer, ...(fixture as RawDispute[])];

/** The court as the dispute list holds it when one dispute is newer than the draw read. */
export const disputesWithNewcomer: DisputesView = {
  ...disputes,
  raw: driftedDisputes,
  disputes: toDisputes(driftedDisputes),
};

const drifted = buildCourtPerformance({
  disputes: driftedDisputes,
  draws: drawFixture as RawDraw[],
  commits: commitFixture as RawCommitCast[],
  // `null` rather than the captured history: nothing this fixture is about is a window, and an
  // unread history marks no row, which keeps the drift the only thing it demonstrates.
  parameters: null,
  roster: ROSTER,
  drawsReadAt: DRAWS_READ_AT,
});
if (!drifted.success) throw new Error(`${drifted.code}: ${drifted.message}`);

/**
 * What the page has when the disputes were re-read and the draws were not.
 *
 * Carries the draw read's failure as well as the drifted model, because the two arrive together:
 * the reason the draws are old is that re-reading them failed.
 */
export const staleDraws: CourtPerformanceView = {
  performance: drifted.data,
  isLoading: false,
  error: new ReadFailure("The core subgraph returned HTTP 502 Bad Gateway", {
    source: SOURCES.core,
    status: "HTTP 502",
  }),
  commitError: null,
  parametersError: null,
  failure: null,
  // An hour older than the dispute read beside it, which is the whole shape of the drift: the
  // banner has to date the page to *this* moment and not to the fresh half.
  readAt: READ_AT - 60 * 60 * 1000,
  isPaused: false,
  retry: () => {},
};

/** What every view has when the browser reports no connection: no error, and no read either. */
export const pausedDisputes: DisputesView = { ...disputes, isPaused: true };
export const pausedPerformance: CourtPerformanceView = { ...measured, isPaused: true };

/**
 * What the page has when every endpoint answered and the seam refused what they said.
 *
 * Distinct from `unmeasured`, and the distinction is the point: nothing failed to arrive, so a
 * banner wording this as an outage would send a reader to check a service that is up. The code
 * and the draw it names are what `useCourtPerformance` used to flatten into a sentence.
 */
export const refused: CourtPerformanceView = {
  performance: null,
  isLoading: false,
  error: new Error('MALFORMED_COURT_DATA: Draw sits in a round with an unreadable id: "163-x"'),
  commitError: null,
  parametersError: null,
  readAt: null,
  failure: {
    code: "MALFORMED_COURT_DATA",
    message: 'Draw sits in a round with an unreadable id: "163-x"',
    details: {},
  },
  isPaused: false,
  retry: () => {},
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
      <QueryClientProvider client={inertQueries()}>
        <MemoryRouter initialEntries={[path]}>
          <DashboardRoutes {...views} {...overrides} />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

/**
 * A query client that never fetches.
 *
 * `DisputePage` is the one route that reads something of its own — the dispute it shows is
 * named by the URL, which `App` cannot know — so rendering the route table now needs a client
 * in scope. `enabled: false` is what keeps `yarn test` network-free with no mock anywhere: the
 * route renders exactly as it does before its read lands, which is a state the view has to draw
 * correctly regardless.
 *
 * Anything asserting on what that read *returned* renders `DisputeView` directly and hands it
 * the answer, the same way every other view here is handed its data.
 */
function inertQueries(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { enabled: false, retry: false } } });
}
