import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";
import boundaries from "eslint-plugin-boundaries";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    plugins: { boundaries },
    settings: {
      // FSD 레이어. widgets·entities는 슬라이스 하나가 요소 하나다.
      // mock-store는 해체 예정인 src/lib 예외 (docs/architecture.md §8).
      "boundaries/elements": [
        { type: "app", pattern: "src/app" },
        { type: "widgets", pattern: "src/widgets/*" },
        { type: "entities", pattern: "src/entities/*" },
        { type: "shared", pattern: "src/shared" },
        { type: "mock-store", pattern: "src/lib" },
      ],
      "boundaries/include": ["src/**"],
    },
    rules: {
      // import는 app → widgets → entities → shared 단방향만 (docs/conventions.md).
      // 같은 레이어의 다른 슬라이스끼리 금지는 default: disallow에서 자동으로 나온다.
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            {
              from: { element: { type: "app" } },
              allow: { to: { element: { types: { anyOf: ["widgets", "entities", "shared", "mock-store"] } } } },
            },
            {
              from: { element: { type: "widgets" } },
              allow: { to: { element: { types: { anyOf: ["entities", "shared", "mock-store"] } } } },
            },
            {
              from: { element: { type: "entities" } },
              allow: { to: { element: { type: "shared" } } },
            },
            // 스토어는 엔티티 타입을 읽는다. 해체되면 이 줄도 사라진다.
            {
              from: { element: { type: "mock-store" } },
              allow: { to: { element: { types: { anyOf: ["entities", "shared"] } } } },
            },
            // 슬라이스 바깥에서는 index.ts를 통해서만 접근한다.
            {
              disallow: {
                to: { element: { types: { anyOf: ["widgets", "entities"] }, fileInternalPath: "!index.ts" } },
              },
            },
          ],
        },
      ],
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  // 포맷 관련 규칙은 Prettier에 위임한다. 반드시 마지막에 와야 한다.
  prettier,
]);

export default eslintConfig;
