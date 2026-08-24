# 08: Make the court's parameter change visible and correctly handled

**What to build:** A visitor sees how much of the available window each agent juror used, computed
against the parameters that were actually in force for that dispute — and sees clearly that one
dispute ran under a different regime. This dashboard is public and may be cited in research, so a
figure computed silently across two different period regimes would be misleading. See ADR-0001.

**Blocked by:** 07

**Status:** ready-for-agent

- [ ] The court's parameter history is read from chain events rather than from its current parameters
- [ ] Each dispute resolves the period durations that were in force when it ran
- [ ] Each cell can show, secondary to the latency itself, how much of that dispute's window was used
- [ ] The dispute that ran under the pre-modification parameters is visibly marked in the matrix, with
      an explanation reachable from the marker
- [ ] A percentage may legitimately exceed one hundred, since a period can run past its deadline before
      anyone closes it; this renders honestly rather than being clamped
- [ ] Tested against fixtures covering both parameter regimes
