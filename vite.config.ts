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
    // really declared, and src/styles/contrast.test.ts reads those *and* our override to compute
    // the contrast ratios the page actually ships, so both are processed for real.
    //
    // Anything declaring a token has to be listed here, and the cost of forgetting is not a
    // failing test: a stylesheet that comes back empty declares nothing, so an override nobody
    // parsed leaves the vendored value standing and the wrong palette is measured, in silence,
    // by a test that passes. contrast.test.ts carries a guard naming this line for that reason.
    css: { include: [/kleros-ai/, /styles\/contrast\.css/] },
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // Vitest's default is 5s, and the first test in a file pays the transform cost of every
    // module that file reaches. Ticket 09 put a Markdown parser behind one route — remark and
    // micromark are around ninety small ESM modules — so the first render of the route table
    // took 7.8s on this machine and timed out, while the twelve tests after it took under a
    // second between them. It is a cost of the transformer and not of the code: Vite bundles
    // the same graph once for the browser. Raised rather than worked around, because the
    // alternative is a warm-up render whose only purpose is to absorb it.
    testTimeout: 20_000,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // The spec tests the I/O readers live against Goldsky and a public RPC rather
    // than against mocks. Those carry an .integration.test.ts infix and are held
    // out of the default run so `yarn test` never depends on the network.
    exclude: ["**/node_modules/**", "**/dist/**", "src/**/*.integration.test.*"],
  },
});
