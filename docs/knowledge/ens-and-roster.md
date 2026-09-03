# ENS identity and the roster

How the six agent jurors are named and resolved, and why the roster nickname — not the resolved
one — is the key.

Each entry below cost real effort to discover and is easy to get wrong again.
They are facts about this codebase and the live court, verified against chain, subgraph
or a browser at the time noted. `CLAUDE.md` § Tripwires carries a one-line form of each;
this file is the full account.

- **ENS reverse records are mostly unset.** Only three of the six addresses have one, because
  setting it requires each operator to act from the agent's own wallet. Resolve *forward* from the
  roster's subname; `getEnsName(address)` leaves half the roster anonymous.
- **`getEnsAvatar` is a `connect-src` fetch, not just an image load.** viem sends a `HEAD` to the
  avatar URL before it ever reaches an `<img>`. Blocked, it fails *silently* — viem catches it and
  falls back to `new Image()`, so avatars still appear and the only symptom is a console violation
  on every load. This is why `euc.li` is in `connect-src` and not left to `img-src`.
- **The ENS nickname is a display name, not a key.** `blaise` carries a `name` text record reading
  "Blaise", so what renders is not what the roster holds. Route, key and join on the roster
  nickname, never the resolved one.

## The roster is growing past its original six

*Migrated from session memory, 2026-09-03.*

Most of this repo's prose says "six agent jurors". That is true of `src/roster/agent-jurors.ts` and
of every figure the dashboard computes, and **it is no longer true of the court**: as of 2026-09-03
`grokleros` is live and already drawing, which is open ticket 24. Two more were expected within
about a week — roughly 2026-09-10 — with addresses not yet known, because each operator has to
deploy and stake before there is anything to add; up to about a dozen more are expected after that.
Ticket 25, the one that makes room for nine columns, has to land before the two arrive, and their
arrival is not under anyone's control here.

**The rule:** an agent juror enters `src/roster/agent-jurors.ts` **only** when its address is known
and live. One that is announced but not yet running gets no placeholder entry and no reserved
column — so `AgentJuror.address` stays required and no new empty state is needed.

Treat every "six" in this repo as a claim about the roster file at the time it was written, not
about the court.

## Reverse records are outstanding with the operators, not broken

*Migrated from session memory, 2026-09-03.*

As of 2026-08-25 only three of the then-six `*.agents.kleroslabs.eth` addresses had an ENS primary
name set, and the roster has grown since. The subnames were created and delegated here, but setting
a reverse record requires **each operator to act from that agent's own wallet**, so it is
outstanding with colleagues and may land at any time without warning.

Nothing in this dashboard depends on it — it resolves forward from the roster's subname, so it is
unaffected either way. The visible effect if they do complete it is that the Kleros Court app starts
rendering nicknames instead of addresses. **Reverse-resolution coverage changing is expected, not a
regression to investigate**, and nobody should "fix" the forward-resolution design in response to it.
