# 11: Look at one agent juror on its own

**What to build:** A visitor clicks an agent juror and sees its own performance and which stack it
runs, at its own linkable URL.

**Blocked by:** 02, 06, 10

**Status:** ready-for-agent

- [ ] Each agent juror has its own route, linkable and reloadable
- [ ] The view shows nickname, avatar, address and stack, with the one-line description where present
- [ ] It shows that agent juror's own metrics: latencies, coherence, draws and cumulative rewards
- [ ] It lists the disputes that agent juror was drawn in, each linking to the dispute view
- [ ] The agent juror that has never been drawn renders with an honest empty state rather than an error
- [ ] The view is structured so deferred telemetry could later join it without rearrangement
