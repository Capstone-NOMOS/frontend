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

/**
 * 응답 data 타입 (200·201·202 중 있는 것). 이름 있는 스키마 없이 경로에 인라인으로만 정의된 응답에 쓴다.
 * 예: ResponseData<"/projects/{projectId}/pm/status", "get">
 */
export type ResponseData<P extends keyof paths, M extends HttpMethod> = paths[P][M] extends {
  responses: infer R;
}
  ? DataOf<R[200 & keyof R]> | DataOf<R[201 & keyof R]> | DataOf<R[202 & keyof R]>
  : never;

type DataOf<Res> = Res extends { content: { "application/json": { data: infer D } } } ? D : never;
