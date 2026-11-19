import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// 브라우저 API는 테스트가 직접 스텁한다 (WebSocket · fetch). jsdom은 쓰지 않는다 (docs/adr/0019)
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
