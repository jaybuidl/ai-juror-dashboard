import { render } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { describe, expect, it } from "vitest";
import { theme } from "../styles/theme";
import type { Provenance } from "./provenance";
import { ReadStamp } from "./ReadStamp";

/** 2026-09-24 01:57 UTC. */
const READ_AT = Date.UTC(2026, 8, 24, 1, 57, 0);

function stampOf(provenance: Provenance): string | null {
  const { container } = render(
    <ThemeProvider theme={theme}>
      <ReadStamp provenance={provenance} />
    </ThemeProvider>,
  );
  return container.firstElementChild?.textContent ?? null;
}

describe("the read stamp", () => {
  it("names the range read and the moment, in UTC", () => {
    expect(stampOf({ read: { from: 151, to: 287, count: 128 }, readAt: READ_AT })).toBe(
      "Read 128 disputes, 151–287 · 2026-09-24 01:57 UTC",
    );
  });

  it("names a single dispute as one, not as a range of one", () => {
    expect(stampOf({ read: { from: 151, to: 151, count: 1 }, readAt: READ_AT })).toBe(
      "Read dispute 151 · 2026-09-24 01:57 UTC",
    );
  });

  it("leaves the moment out while the read has not landed", () => {
    expect(stampOf({ read: { from: 151, to: 287, count: 128 }, readAt: null })).toBe(
      "Read 128 disputes, 151–287",
    );
  });

  it("renders nothing on a view that rests on no read", () => {
    expect(stampOf({ read: null, readAt: READ_AT })).toBeNull();
  });
});
