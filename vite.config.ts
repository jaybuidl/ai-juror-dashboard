/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // Vite 8 resolves the `paths` map in tsconfig.json natively; the
  // vite-tsconfig-paths plugin this replaces is no longer needed.
  resolve: { tsconfigPaths: true },
  test: {
    // Vitest stubs CSS imports to the empty string by default, and does so by extension —
    // a `?raw` import of a stylesheet comes back empty too, with no error. src/styles/theme.test.ts
    // reads the vendored design-system tokens that way to check every var() theme.ts names is
    // really declared, so those files, and only those, are processed for real.
    css: { include: [/kleros-ai/] },
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // The spec tests the I/O readers live against Goldsky and a public RPC rather
    // than against mocks. Those carry an .integration.test.ts infix and are held
    // out of the default run so `yarn test` never depends on the network.
    exclude: ["**/node_modules/**", "**/dist/**", "src/**/*.integration.test.*"],
  },
});
