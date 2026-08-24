import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("names the dashboard", () => {
    render(<App />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("AI Juror Dashboard");
  });

  it("states that it holds no measurements, rather than rendering an empty result", () => {
    render(<App />);

    expect(screen.getByRole("status")).toHaveTextContent(/nothing measured yet/i);
  });
});
