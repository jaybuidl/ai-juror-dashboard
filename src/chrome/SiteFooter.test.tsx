import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ThemeProvider } from "styled-components";
import { describe, expect, it } from "vitest";
import { theme } from "../styles/theme";
import { SiteFooter } from "./SiteFooter";

function renderFooter() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("SiteFooter", () => {
  it("links the dashboard's source repository by name, not by the mark alone", () => {
    renderFooter();
    expect(screen.getByRole("link", { name: "Source on GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/jaybuidl/ai-juror-dashboard",
    );
  });

  it("keeps the repository out of the nav named Kleros", () => {
    renderFooter();
    const nav = screen.getByRole("navigation", { name: "Kleros" });
    expect(nav.querySelector('a[href*="github.com"]')).toBeNull();
  });
});
