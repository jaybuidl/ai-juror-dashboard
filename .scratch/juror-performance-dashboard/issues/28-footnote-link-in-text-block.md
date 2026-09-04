# 28: The footnote link is not distinguishable without colour

**What to build:** One WCAG 1.4.1 violation, live on `/` today, found by an axe audit run while
verifying ticket 27 and deliberately left out of that ticket's diff.

`Footnotes.tsx:170` ends the window footnote with a link:

```tsx
Latency is held and shown as an absolute duration everywhere on this page, and never as a
fraction of the window it ran in.{" "}
<Link to="/method#window">What that means for these figures</Link>.
```

It is a link inside a block of body text, distinguished from the prose around it **only** by
colour: `#4ddfd8` against `#b9b5cc`, which is **1.21:1** where the rule wants 3:1, and it carries
no underline, no weight change and no other non-colour cue. So a reader who does not separate those
two hues has nothing telling them the sentence ends in a link. axe reports it as
`link-in-text-block`, serious, one node.

The fix is small and the choice is the ticket: an underline on the link is the ordinary answer and
the one the rule's own guidance names. Whatever is chosen has to hold in **both** themes, which
means it goes through `docs/contrast.md` rather than being eyeballed — that file records every
ratio in the repo and its two exemptions, and a third exemption is a decision, not an edit.

**Why it is a ticket rather than a line in ticket 27.** Ticket 27 was four tripwire defects with a
scoped diff; `Footnotes.tsx` is not in it. Recording this only in that ticket's comments would have
hidden it, because a closed ticket drops out of the `grep -L` over the status line that is how this
repo enumerates open work — so the finding would have been invisible to the tracker the moment it
was written down. (Do not quote the closed-status string verbatim in a ticket body, incidentally:
that same grep matches it anywhere in the file, and this ticket hid itself once before the sentence
was reworded.) Found by `/code-review`
over ticket 27's diff.

**Worth knowing about the audit that found it.** The same run reports 187 further `color-contrast`
nodes that are **`incomplete`, not violations** — axe could not resolve the background behind them
because of gradients and overlaps. Do not read that number as 187 defects, and do not "fix" them.
The counts on `/` at 1440 were: 1 violation, 1 incomplete rule (187 nodes), 28 passes, 32
inapplicable.

Ticket 18's sweep reported zero violations on seven routes, and `1904247` records that. The link
itself predates that sweep, but the footnote's surrounding prose was reworked afterwards in
`9e69dc8`, `cf72fea` and `269d49b` — the sparsity note moving into the footer. Whether that is what
turned a standalone link into a text-block link is **not** established; it is the first thing to
check, because if it is, the same move may have done it elsewhere.

**Blocked by:** none

**Design:** No artboard. This is conformance against WCAG 1.4.1 and against `docs/contrast.md`,
not against a drawing.

**Status:** ready-for-agent

- [ ] The link is distinguishable from its surrounding prose without relying on colour
- [ ] The chosen cue holds in both themes, and `docs/contrast.md` records the ratio or the
      exemption — a third exemption is argued there, not assumed here
- [ ] An axe run at `wcag2a,wcag2aa` on `/` returns **zero** violations, reported with the counts
      rather than as "clean"
- [ ] Every other route is checked for the same shape — a link ending a sentence of body prose —
      rather than only the one axe happened to name
- [ ] Whether `9e69dc8` and its neighbours introduced this is answered either way, and if they did,
      the other prose they moved is checked too
- [ ] `docs/accessibility.md` stops reading as though the sweep left nothing behind, and says what
      this was and when it was found
- [ ] No `incomplete` axe node is "fixed" — they are gradient and overlap backgrounds, and the
      distinction between incomplete and violation is stated wherever the run is reported
