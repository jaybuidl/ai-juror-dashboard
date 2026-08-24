# 09: Read a whole panel's reasoning about one dispute, side by side

**What to build:** A visitor clicks a dispute and reads every panel member's justification next to
each other, at its own URL they can paste into a chat. Comparing how different stacks reasoned about
identical evidence is the thing this experiment exists to show.

**Blocked by:** 04, 05

**Status:** ready-for-agent

- [ ] Each dispute has its own route, linkable and reloadable
- [ ] The view shows the dispute's title, question and ruling, and every draw in the panel
- [ ] Justifications render side by side rather than one at a time
- [ ] Justifications render as Markdown with GitHub-flavoured extensions
- [ ] Raw HTML is disabled at the parser — deliberately stricter than the Kleros court frontend, which
      enables it and sanitises afterwards
- [ ] A link inside a justification warns before navigating away
- [ ] A draw with no justification says so, rather than rendering as empty space
- [ ] Justifications not written in English render correctly
- [ ] Long justifications remain readable; the longest in the data is nearly five thousand characters
