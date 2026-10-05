import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/domain/**", "src/application/**", "src/infrastructure/**"],
      exclude: [
        "**/__tests__/**",
        "src/infrastructure/di/**",
        "**/*.d.ts",
        "src/domain/repositories/**",
      ],
      thresholds: { branches: 94, functions: 94, lines: 94, statements: 94 },
    },
  },
});
