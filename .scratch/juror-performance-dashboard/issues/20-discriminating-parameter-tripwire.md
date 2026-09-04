---
status: done
blocked_by: ["19"]
---

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

**Design:** No artboard. This is the shape of a test failure, which nothing on the canvas
describes.

- [x] A change to the commit or vote window fails the live suite, in an assertion whose text says
      that figures either side of it are not comparable
- [x] A new configuration that leaves both measured windows alone fails the live suite in a
      separate assertion, whose text names the fixture and `/method` as what to update
- [x] An empty or short history — the redeployed-core and renamed-event case — still fails
      distinctly from both, and not as a silent pass
- [x] The two failures are distinguishable from the CI log alone, without reading a diff of the
      history
- [x] `court-parameters.integration.test.ts` still passes against the live court after ticket 19
- [x] `/method` still states its account in prose, read from no model — the decision recorded in
      `MethodPage`'s doc comment is unchanged, and this ticket does not relitigate it
- [x] Whatever this changes about how the tripwire is described in `README.md` and in ticket 08's
      file is corrected there

## What was built

`measuredRegimes` in `src/performance/windows.ts` — the court's configurations folded into the
stretches over which its **commit and vote** windows held, dated from the change that opened each
rather than from any later one that restated it. That fold is the whole discrimination: a
configuration leaving both alone disappears into the one before it, so an assertion over the result
is blind to exactly the change that moves no figure.

The live file now divides three ways, and its doc comment tells a CI reader to take the red names
in order and stop at the first: the read broke, a figure moved, an account went stale. Each
assertion also carries a message saying what to do about it. `sameMeasuredWindows` was not touched
— it is still the one place that says which windows are measured, and the fold compares through it
rather than restating the pair.

The behaviour that cannot be triggered on the live chain is proved offline instead: seven tests in
`windows.test.ts` run a synthetic fourth configuration of each kind past the fold. A throwaway
harness over the three assertions confirmed the four cases before it was deleted — today all green;
an evidence-only fourth, upkeep alone; a commit or a vote window moved, comparability **and**
upkeep; an empty history, the read and not a silent pass.

Left alone deliberately: ticket 08's account of "exactly two assertions", which is a true record of
the 2026-08-26 failure and got a Comments entry instead; and `MethodPage`, which this ticket had no
reason to open.

## What review caught

Four findings, all in the triage guidance rather than in the fold, and the guidance is the thing
this ticket exists to deliver — so all four are fixed here.

**The names it told a reader to match did not match the tests.** The header called case 3 "the two
`…the fixture and /method describe` assertions"; only one test carried that phrase. A maintainer
grepping the header for the red name they saw would have found nothing, which is the "distinguishable
from the CI log alone" criterion failing in the one place it is read.

**The list said three assertions and there were four.** `reports no configuration that repeats the
one before it` appeared in no entry, and it is the only assertion that catches a duplicated
`CourtModified` log. Confirmed against the fixture with a throwaway: a duplicate leaves the length
assertion green — there are still three configurations — and leaves comparability green, because the
fold swallows a repeat by design. A reader following the old guidance would have stopped at case 3
and recaptured the fixture **with the duplicate in it**, then written it into `/method`. Both lists
now name it, in case 1, and say why the ordering is what protects against this.

**`MeasuredRegime` restates the measured pair by hand** while the fold delegates to
`sameMeasuredWindows`. A third window added there and not here would split a regime correctly and
print two entries differing only in `from` — a live failure whose diff shows no cause. Carried as a
TRAP on the type.

**`measuredRegimes` is not the marker's rule**, and nothing should later wire it up as one:
`buildCourtPerformance` compares each dispute against the windows the court holds *now*, by value,
while this folds consecutive regimes only. They agree today and would part the moment the court
restored a window it had abandoned. Both are right about their own question; the doc comment now
says so.
