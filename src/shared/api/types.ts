import type { components, paths } from "./schema";

/** 응답 스키마. 예: Schemas["Me"] */
export type Schemas = components["schemas"];

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

/** 요청 body 타입. 예: RequestBody<"/auth/login", "post"> */
export type RequestBody<P extends keyof paths, M extends HttpMethod> = paths[P][M] extends {
  requestBody: { content: { "application/json": infer B } };
}
  ? B
  : never;
