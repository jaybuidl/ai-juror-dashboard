# 02: Show the roster of agent jurors by nickname and avatar

**What to build:** A visitor sees all six agent jurors identified by nickname and avatar rather than
by address, including the one that has never been drawn. If ENS cannot be reached, nicknames still
render.

**Blocked by:** 01

**Status:** done

- [x] A checked-in roster carries, for each agent juror: nickname, address, stack label, and an
      optional one-line description. No operator names
- [x] The roster is structured so the stack can later grow from a bare label into richer data
- [x] Nicknames and avatars resolve at runtime from ENS subnames of `agents.kleroslabs.eth` against an
      Ethereum mainnet endpoint
- [x] When ENS resolution fails, the roster nickname is shown instead and the dashboard stays usable
- [x] All six agent jurors appear, including the one with no on-chain presence

## Comments

### Built, 2026-08-25

**Done. All six agent jurors render by nickname and avatar, verified in a real browser under the
shipped CSP.** `src/roster/` holds the roster, the ENS reader and the view; `Dashboard` was split
out of `App` so the page can be rendered offline from hand-built data.

**Who the six actually are.** No document in this repo named them, so they were established from
chain and cross-checked two ways — each forward-resolves from its ENS subname on mainnet, and five
of the six appear as drawn jurors in court 34 in the core subgraph. The live integration test
asserts that agreement on every run, because a roster address that drifts from the subname it
claims would attribute one agent juror's latency and coherence to another.

`daemonhill` was the awkward one: the ENS subgraph has no label for it and it is not
NameWrapper-wrapped, so the label is not recoverable by the usual routes. It was read out of the
text of its own avatar record and then confirmed against the on-chain labelhash —
`keccak256("daemonhill")` matches exactly. Not a guess.

**Decisions worth knowing before the next ticket:**

- **Forward resolution only.** Only three of the six addresses have a reverse ENS record; the
  operators never finished the "Set as Primary Name" step. `getEnsName(address)` would leave half
  the roster anonymous, so the roster holds the subname and records are read off it.
- **`euc.li` is in `connect-src`, not just `img-src`, and this is not optional.** viem's
  `getEnsAvatar` sends a `HEAD` to the avatar URL before it ever reaches an `<img>`. Blocked, it
  fails *quietly*: viem catches it and falls back to `new Image()`, so avatars still appear and the
  only trace is a console violation on every load. Verified by A/B against a local server serving
  the exact policy — six `connect-src` violations without the host, zero with it.
- **The mainnet endpoint is `ethereum-rpc.publicnode.com`**, behind `VITE_MAINNET_RPC_URL`. Two
  alternatives fail in ways worth remembering: `rpc.ankr.com/eth` now needs an API key, and
  `cloudflare-eth.com` answers ordinary calls but reverts inside the ENS universal resolver — it
  looks healthy right up until a name is resolved. `eth.drpc.org` and `eth.merkle.io` both work.
- **`@tanstack/react-query` was introduced here**, with one client and per-hook tuning, matching the
  Kleros court frontend. ENS uses a one-hour `staleTime`.
- **Components take what they render as props.** `App` is the composition root and the only place a
  hook touches the network. Without that split, `render(<App />)` in the offline suite would fire a
  real ENS request.
- **The stack labels came from the repo owner**, not from any source that can be re-derived. Two are
  corroborated elsewhere (`blaise`/OpenClaw, `daemonhill`/Hermes); the rest rest on that alone.

**Traps for later tickets:**

- **The ENS nickname is a display name, not a key.** `blaise` has a `name` text record reading
  "Blaise", so the page shows a capitalised nickname while the roster's is lowercase. Ticket 11
  routes on `/juror/:nickname` — it must route on the *roster* nickname, or the URL changes
  depending on whether ENS answered.
- **The design canvas in `.scratch/.../canvas/` carries invented agent data.** Its nicknames
  (`agent007`, `daemon`), its draw counts and its stack assignments are all placeholder fiction and
  contradict the chain. Take the layout from it, never the data.
- **Court 34 has moved past the documented range.** The core subgraph now returns disputes 151–166,
  where `CLAUDE.md` § Verified constants and the spec both say 151–163. The documented counts are
  still right *for their range* — re-checked, 151–163 is still 61 votes collapsing to 44 draws — but
  ticket 03 will see sixteen disputes, not thirteen. Not corrected here; it is a domain-doc change.
- **The bundle is now 573 kB (192 kB gzipped)**, almost all viem. Fine for now, worth a look before
  launch. Dropping `normalize()` would save ~25 kB gzipped but removes a guard on non-ASCII
  nicknames, so it was kept.

**Incidental:** `biome.json` now excludes `.scratch`. The design agent's canvas files landed there
as untracked HTML and Biome was failing the repo's lint hook on template syntax it cannot parse.
