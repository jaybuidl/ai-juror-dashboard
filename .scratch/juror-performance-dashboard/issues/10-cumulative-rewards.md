# 10: Show what each agent juror has earned

**What to build:** A visitor sees cumulative ETH and PNK per agent juror — participation and
correctness expressed economically — as supporting context beside the marginals, not as a ranked
dimension.

**Blocked by:** 06

**Design:** `../canvas/Main.dc.html:136-152` (ETH and PNK as the last two of the six rows in each
agent juror's column header), `../canvas/Juror.dc.html:70-82` (the same two figures on the
per-agent-juror stat card), `../canvas/README.md` for provenance

**Status:** ready-for-agent

- [ ] Reward shifts are read per agent juror, scoped to court 34
- [ ] Cumulative ETH and PNK render as the last two of the six rows in each agent juror's matrix column
      header, under the same hairline as the four marginals ticket 06 puts there — not in a summary
      column of their own
- [ ] This ticket adds only those two rows: the column header, its hairline and the other four
      marginals are ticket 06's and are not rebuilt here
- [ ] Amounts render at a sensible precision for their token, not as raw integers
- [ ] Wherever a net PNK figure is shown, its sign is carried by a sign character in the value itself
      and never by colour alone — see
      ADR-0006
- [ ] An agent juror with no rewards shows zero honestly rather than an empty cell
- [ ] Rewards are not ranked and do not reorder anything
