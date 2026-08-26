# 20: Tell a harmless reconfiguration from a costly one

**What to build:** When court 34 is reconfigured, the live suite still fails — but the failure
says which kind of change it was, and a maintainer reading it knows whether a figure moved or
only an account went stale.

Today one `toEqual` over the whole parameter history answers two questions at once, and they
are not the same question. The first is whether the read still works: `KlerosCore.sol` has since
gained an `_eligibility` argument on both events, and a signature carrying it hashes to a
different topic, matches no log, and returns a court that was never configured — an empty
history that marks nothing and fails nowhere else. That is a real regression and it must stay
loud. The second is whether `/method`'s hand-written account of the configurations has drifted
from the chain. That is documentation upkeep. One assertion covering both means the failure text
cannot tell them apart, and the maintainer reads a diff to find out.

Ticket 19 is the case that shows why it matters. An evidence-only change moved no figure on any
rendered surface — `sameMeasuredWindows` excludes the evidence and appeal windows precisely
because nothing here is measured from them — and it still turned the live suite and the nightly
`live` job red. Court 34 is now a court that gets tweaked around demonstrations, so that is a
recurring red for something invisible. This repo already holds the principle that settles it,
one level down: a caveat that comes and goes teaches a reader to ignore caveats. A nightly job
that is habitually red is a job nobody reads, and the next failure it reports will be the
`_eligibility` one.

The fix is to **split the assertion, not to soften it**. Both halves still fail. A change to a
measured window — commit or vote — fails as the costly thing it is, because it makes latencies
either side of it incomparable and puts a marker on rows that did not carry one. A new
configuration that leaves both alone fails too, in its own assertion, worded as upkeep and
naming the fixture and `/method` as what to update. Nothing gets an exemption; what changes is
that the failure diagnoses itself.

Worth stating what is *not* wanted here, because it is the obvious next step and it is wrong: do
not make `/method` read its account from the model. `MethodPage`'s own doc comment records the
decision — the section is the destination of the matrix's `†` footnote, so it has to answer a
reader arriving on a cold load, before any read has returned. Prose that cannot wait on a fetch
is the point of it. The tripwire is what keeps that prose honest, which is why this ticket
sharpens the tripwire rather than removing the reason for one.

**Blocked by:** 19

**Design:** No artboard. This is the shape of a test failure, which nothing on the canvas
describes.

**Status:** ready-for-agent

- [ ] A change to the commit or vote window fails the live suite, in an assertion whose text says
      that figures either side of it are not comparable
- [ ] A new configuration that leaves both measured windows alone fails the live suite in a
      separate assertion, whose text names the fixture and `/method` as what to update
- [ ] An empty or short history — the redeployed-core and renamed-event case — still fails
      distinctly from both, and not as a silent pass
- [ ] The two failures are distinguishable from the CI log alone, without reading a diff of the
      history
- [ ] `court-parameters.integration.test.ts` still passes against the live court after ticket 19
- [ ] `/method` still states its account in prose, read from no model — the decision recorded in
      `MethodPage`'s doc comment is unchanged, and this ticket does not relitigate it
- [ ] Whatever this changes about how the tripwire is described in `README.md` and in ticket 08's
      file is corrected there
