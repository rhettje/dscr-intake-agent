import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // No tests exist until Milestone 2; don't fail the run because of that
    passWithNoTests: true,
  },
});
