import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest runs without `globals`, so Testing Library's automatic cleanup does not
// register itself. Unmounting between tests keeps queries scoped to one render.
afterEach(() => {
  cleanup();
});
