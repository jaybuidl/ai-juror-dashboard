# 26: Agent identity presentation — handles and stack icons

**What to build:** The two agent-juror surfaces say a little more about who is running, without
saying anything about who built it.

Two additions, one ticket, because they touch the same type and the same two components. Splitting
them means two branches editing `agent-jurors.ts`, `Roster.tsx` and `AgentJurorPage.tsx`, and this
repo's § Traps has a long entry on what parallel branches over shared files produce.

**The handles.** Three of the seven agent jurors have an account of their own: baskerville
`@JurBaskerville`, blaise `@BlaiseBuidl`, grokleros `@Grokleros`. Capitalisation is as given and is
deliberate — it is display text, the same distinction the roster already draws between a nickname
that routes and keys, and a name that renders. Three of seven, so the field is optional, and it
appears on `/agent-jurors/:nickname` only: not on the roster list, not in the matrix, not in a
column header.

The invariant is the thing to be careful with. This dashboard identifies agent jurors "by nickname
and stack, never by the person who built them", and a social handle is the first field here that
could carry an operator rather than an agent. The field's doc comment has to say that it holds the
**agent's own** account and that an operator's account does not belong in it — recorded in the type,
because the next person adding a handle will read the type and not this ticket.

The link itself needs no new pattern. `AgentJurorPage.tsx:691-697` already renders an external link
in the same `Facts` row — `target="_blank"`, `rel="noopener noreferrer"`, an `↗` affordance — for
Arbiscan. Follow it, and do **not** put the justification interstitial in front of it: that
interstitial exists because justification prose is written by the agents, so its URLs are arbitrary
and unreviewed, whereas a handle here is hard-coded in this repo and reviewed in a pull request.
Extending a warning to content the repo itself controls teaches readers to click through warnings.

**The icons.** A small monochrome mark beside each stack label, on the roster list and on the agent
page. The roster names **four** distinct stacks and not six: OpenClaw (007, blaise), `claude -p`
(columbo), Hermes (daemonhill, aletheia, baskerville) and Grok Bot (grokleros, arriving in ticket
24). Whatever else the source sheet offers, four is what this dashboard needs.

Vendor them; do not hot-link. `img-src 'self' data: https:` would happily load the two remote ones,
because ENS avatars need arbitrary https hosts — so this is a decision rather than a constraint, and
the reasons are that the repo has **no** remote assets today and self-hosts its fonts and its design
system on purpose, that one of the two source URLs carries a `?v=3` cache-buster and is therefore
versioned and free to move, and that a third-party host sees a reader's address on every load of a
public page that may be cited in research. These will be the first image assets in the repo.

Three of the four can be inline SVG with `fill="currentColor"`, which inherits the theme for free:
the Claude mark for `claude -p`, the Grok Bot mark, and OpenClaw, whose source is real vector once
its red gradient is stripped. **Hermes has no vector source** — the lobehub SVG path 404s in both
light and dark, and only a PNG exists. Vendor that one as a 2× raster and monochrome it with a
*theme-aware* filter: `brightness(0)` on light, `brightness(0) invert(1)` on dark. The source sheet
uses the second of those unconditionally, which is correct only on a dark ground, and this repo
ships both themes with every ratio measured. Do not redraw Hermes by hand — an approximation of
someone's mark is worse than the mark. Record each source URL in a comment beside the asset.

The icon goes **beside** the stack label and never instead of it. Both render sites already carry a
version of that sentence — `Roster.tsx:170` and `AgentJurorPage.tsx:698` say the stack label "is a
fact about the roster and is still true when ENS is down" — and the same reasoning covers a mark
that might fail to draw. `aria-hidden` on the icon, the label unchanged beside it, so nothing about
the accessible name moves.

One trap from the source sheet, worth naming because it fails silently and only in production: it
pulls DM Mono from Google Fonts, which `style-src 'self' 'unsafe-inline'` and `font-src 'self'
data:` both block. Copied across, the type would fall back to a system font on the deployed site and
look perfect on every developer machine, because Vite dev and `yarn preview` send no CSP at all. Use
this repo's own type tokens and take nothing else from that file's styling.

**The four marks, so this ticket does not depend on a file outside the repo.** They came from a
sheet the maintainer supplied; two are remote and two are inline paths, reproduced here because the
sheet was a scratch file.

- **Claude** (for `claude -p`) — inline, `viewBox="0 0 24 24"`, `stroke-linecap="round"`,
  stroke-width 1.7: `M12 3.4v17.2M3.4 12h17.2M5.9 5.9l12.2 12.2M18.1 5.9L5.9 18.1`
- **Grok Bot** — inline, `viewBox="0 0 24 24"`, `stroke-linecap="round"`: a `circle` at 12,12 r 9.4
  stroke-width 1.6, plus `M9.2 10.6 11 15.2` and `M15.4 8.6 17 12.3` at stroke-width 3.2
- **OpenClaw** — `https://agents.circle.com/assets/agents/open-claw.svg?v=3` — real vector, 1194
  bytes, carrying a red `linearGradient` to strip
- **Hermes** — `https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/light/hermesagent.png`
  — PNG only; the matching `static-svg` paths 404 in both light and dark

**Blocked by:** 24

**Design:** `Juror.dc.html:52-66` draws the identity block this touches — avatar, nickname `h1`,
then a pill row whose first pill is the stack, followed by the ENS name, the short address and the
Arbiscan link. The artboard draws **no icon** and `/agent-jurors` has no artboard at all, so the
mark's size, placement and spacing are derived from the design system's own scale rather than cited
from a drawing. This is the § Traps rule about finding the artboard that draws the element in that
place: here there is none, and the honest move is to say so rather than to borrow one.

**Status:** ready-for-agent

- [ ] `AgentJuror` gains an optional handle field whose doc comment states it holds the agent's own
      account and never an operator's
- [ ] The three handles render on `/agent-jurors/:nickname` only, with capitalisation as given
- [ ] The handle links out with `target="_blank"` and `rel="noopener noreferrer"`, matching the
      Arbiscan link beside it, with no interstitial and a comment saying why the justification
      interstitial does not apply here
- [ ] An agent juror with no handle renders the row unchanged — no empty slot, no separator left
      behind
- [ ] Four stack icons are vendored into the repo, each with its source URL recorded beside it
- [ ] Claude, Grok Bot and OpenClaw are inline SVG using `currentColor`, with no hard-coded colour
- [ ] Hermes is a 2× raster monochromed by a theme-aware filter, correct on both themes
- [ ] `netlify.toml` is **unchanged**: nothing here needs a new host, and a vendored asset is
      `'self'`
- [ ] No font, stylesheet or script is taken from the source sheet — only the marks
- [ ] The icon renders beside the stack label on both `/agent-jurors` and `/agent-jurors/:nickname`,
      is `aria-hidden`, and changes no accessible name
- [ ] A stack with no icon renders the label alone rather than a gap
- [ ] Checked in a browser in **both** themes and at 390pt, since the filter and the alignment are
      layout and jsdom lays nothing out
