# 02: Show the roster of agent jurors by nickname and avatar

**What to build:** A visitor sees all six agent jurors identified by nickname and avatar rather than
by address, including the one that has never been drawn. If ENS cannot be reached, nicknames still
render.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] A checked-in roster carries, for each agent juror: nickname, address, stack label, and an
      optional one-line description. No operator names
- [ ] The roster is structured so the stack can later grow from a bare label into richer data
- [ ] Nicknames and avatars resolve at runtime from ENS subnames of `agents.kleroslabs.eth` against an
      Ethereum mainnet endpoint
- [ ] When ENS resolution fails, the roster nickname is shown instead and the dashboard stays usable
- [ ] All six agent jurors appear, including the one with no on-chain presence
