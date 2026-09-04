import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { describe, expect, it } from "vitest";
import { theme } from "../styles/theme";
import { renderAt } from "../test/court";
import { ROSTER, type Stack } from "./agent-jurors";
import { hasStackIcon, StackIcon } from "./StackIcon";

function drawn(stack: Stack) {
  return render(
    <ThemeProvider theme={theme}>
      <StackIcon stack={stack} />
    </ThemeProvider>,
  );
}

describe("the stack marks", () => {
  /**
   * The one that matters, and the reason `hasStackIcon` is exported at all.
   *
   * The roster grows, and a stack arriving without a mark is the silent failure here: the label
   * renders alone, which is the *correct* fallback and therefore looks like nothing is wrong.
   * Derived from `ROSTER` rather than from a list of four, so the eighth agent juror's stack is
   * what fails this rather than a number nobody updated.
   */
  it("has a mark for every stack the roster names", () => {
    for (const { stack } of ROSTER) {
      expect(hasStackIcon(stack.label), `no mark for ${stack.label}`).toBe(true);
    }
  });

  it("draws nothing for a stack it has no mark for, rather than a gap", () => {
    const { container } = drawn({ label: "A stack nobody has vendored" });

    expect(container).toBeEmptyDOMElement();
  });

  it("draws nothing for a stack named after something on Object.prototype", () => {
    // Contrived as a stack label, and the point is not the label: `hasStackIcon` and `StackIcon`
    // have to be one predicate. A bare index into the mark table returns a function here, which
    // the undefined check waves through and React renders into the pill, while `hasStackIcon`
    // correctly says there is no mark — the two disagreeing on the one input that separates them.
    for (const label of ["toString", "constructor", "valueOf", "hasOwnProperty"]) {
      expect(hasStackIcon(label), label).toBe(false);
      expect(drawn({ label }).container, label).toBeEmptyDOMElement();
    }
  });

  it("takes no colour of its own, so the theme inks it", () => {
    // The three inline marks only. The raster beside them cannot use `currentColor` and is
    // monochromed by a filter instead — which is the whole reason it is singled out here.
    for (const label of ["claude -p", "Grok Bot", "OpenClaw"]) {
      const { container } = drawn({ label });
      const svg = container.querySelector("svg");

      expect(svg, label).not.toBeNull();
      expect(svg?.outerHTML, label).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(svg?.outerHTML, label).not.toMatch(/\brgba?\(|\burl\(#/);
    }
  });

  it("says nothing to a screen reader, because the label beside it already does", () => {
    for (const { stack } of ROSTER) {
      const { container } = drawn(stack);

      expect(container.firstElementChild, stack.label).toHaveAttribute("aria-hidden", "true");
    }
  });
});

describe("the stack marks in place", () => {
  it("leaves the stack label as the whole of what is announced", () => {
    // Beside the label and never instead of it: the mark is the thing that may fail to draw,
    // and the stack is a fact about the roster that is true either way.
    renderAt("/agent-jurors");

    for (const { stack } of ROSTER) {
      expect(screen.getAllByText(stack.label).length).toBeGreaterThan(0);
    }
  });
});
