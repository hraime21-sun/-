import { defineConfig } from "vitest/config";
import path from "node:path";

const root = import.meta.dirname;

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
      // 'server-only' 는 Next 서버 번들 전용 가드. 테스트에서는 빈 모듈로 대체.
      "server-only": path.resolve(root, "tests/empty.ts"),
    },
  },
});
