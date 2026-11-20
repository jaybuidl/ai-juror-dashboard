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
  it("links the dashboard's source repository", () => {
    renderFooter();
    expect(screen.getByRole("link", { name: "Source on GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/jaybuidl/ai-juror-dashboard",
    );
  });

  it('credits the maintainer, hiding the heart emoji behind the word "love"', () => {
    renderFooter();
    const credit = screen.getByRole("link", { name: "jaybuidl" });
    expect(credit).toHaveAttribute("href", "https://github.com/jaybuidl");
    const line = credit.closest("p");
    expect(line?.querySelector('[aria-hidden="true"]')?.textContent).toBe("💜");
    expect(line?.textContent?.replace("💜", "")).toBe("Built with love by jaybuidl");
  });

  it("keeps the repository out of the nav named Kleros", () => {
    renderFooter();
    const nav = screen.getByRole("navigation", { name: "Kleros" });
    expect(nav.textContent).not.toContain("GitHub");
  });
});
