/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// The live half of the split described in README.md § Conventions: these tests hit
// Goldsky and a public RPC for real, so they are never part of `yarn test`.
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.integration.test.ts", "src/**/*.integration.test.tsx"],
    // The I/O readers arrive with tickets 02, 03, 04 and 07; until then this
    // suite is legitimately empty and must not fail for being so.
    passWithNoTests: true,
    // A live endpoint is slower and less predictable than a fixture.
    testTimeout: 30_000,
    hookTimeout: 10_000,
  },
});
