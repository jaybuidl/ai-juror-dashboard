# 12: Watch a live dispute without refetching history

**What to build:** A team member monitoring an active dispute sees it update as agent jurors act,
while finalised disputes are neither refetched nor re-scanned — including across a page reload.

**Blocked by:** 07

**Status:** ready-for-agent

- [ ] Data refreshes on a five-second interval while any dispute is unfinalised
- [ ] A dispute is treated as finalised once its period is execution
- [ ] Finalised disputes are not refetched and their commit event scans are not repeated
- [ ] Finalised results persist across a page reload, so returning to the dashboard is fast
- [ ] Persisted results are keyed so that a change to how a metric is derived does not serve stale
      values computed by an older definition
- [ ] Watching a live dispute does not re-request the whole history
