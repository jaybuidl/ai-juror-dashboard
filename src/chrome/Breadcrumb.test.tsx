import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ThemeProvider } from "styled-components";
import { describe, expect, it } from "vitest";
import { theme } from "../styles/theme";
import { Breadcrumb } from "./Breadcrumb";

/**
 * The trail tickets 09 and 11 will mount above their detail views.
 *
 * It is tested on its own because there is no detail view to place it on yet — both are
 * unbuilt — and a component that arrives with the first view that needs it is a component
 * that gets built twice, once per view, in two shapes.
 */

function renderBreadcrumb(props: { to: string; parent: string; current: string }) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <Breadcrumb {...props} />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("the breadcrumb", () => {
  it("links to the parent index and names where you are", () => {
    renderBreadcrumb({ to: "/agent-jurors", parent: "Agent jurors", current: "aletheia" });

    const trail = screen.getByRole("navigation", { name: /breadcrumb/i });

    expect(within(trail).getByRole("link", { name: "Agent jurors" })).toHaveAttribute(
      "href",
      "/agent-jurors",
    );
    expect(within(trail).getByText("aletheia")).toHaveAttribute("aria-current", "page");
  });

  it("renders the current item as text rather than a link to itself", () => {
    renderBreadcrumb({ to: "/disputes", parent: "Matrix", current: "Dispute 152" });

    const trail = screen.getByRole("navigation", { name: /breadcrumb/i });

    expect(within(trail).queryByRole("link", { name: "Dispute 152" })).not.toBeInTheDocument();
    expect(within(trail).getAllByRole("link")).toHaveLength(1);
  });

  it("says whatever the view gives it, so a resolved ENS name can never reach the trail", () => {
    // `blaise` carries a `name` record reading "Blaise". The route is keyed on the roster
    // nickname, so the trail has to be too — which is why the label is passed in, not resolved.
    renderBreadcrumb({ to: "/agent-jurors", parent: "Agent jurors", current: "blaise" });

    expect(screen.getByText("blaise")).toBeInTheDocument();
    expect(screen.queryByText("Blaise")).not.toBeInTheDocument();
  });
});
