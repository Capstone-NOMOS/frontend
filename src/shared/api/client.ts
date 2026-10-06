import { getSession } from "./token";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ApiFetchOptions {
  method?: Method;
  body?: unknown;
  /** false면 Authorization 헤더를 붙이지 않는다 (로그인·초대 미리보기 등) */
  auth?: boolean;
}

interface ErrorBody {
  code?: string;
  message?: string;
  details?: unknown;
  reason?: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let onUnauthorized: (() => void) | null = null;

/** 인증이 필요한 요청이 401을 받으면 호출된다. 토큰 삭제·로그인 이동은 등록하는 쪽이 한다 */
export function setOnUnauthorized(callback: (() => void) | null) {
  onUnauthorized = callback;
}

const inflightWrites = new Map<string, Promise<unknown>>();

/**
 * 같은 쓰기 요청(메서드·경로·본문)이 겹치면 하나만 보내고 결과를 나눠 갖는다.
 * 버튼의 disabled={isPending}은 다음 렌더에야 걸려서 더블클릭의 두 번째 클릭을 못 막는다 — 중복 제출은 ADR·이벤트 기록을 오염시킨다
 */
export function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  if (method === "GET") return request<T>(path, options);
  const key = `${method} ${path} ${JSON.stringify(options.body ?? null)}`;
  let pending = inflightWrites.get(key);
  if (!pending) {
    pending = request<T>(path, options).finally(() => inflightWrites.delete(key));
    inflightWrites.set(key, pending);
  }
  return pending as Promise<T>;
}

async function request<T>(path: string, { method = "GET", body, auth = true }: ApiFetchOptions): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getSession()?.accessToken;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "network request failed");
  }

  // 204처럼 본문이 없는 응답도 있다
  const json = (await res.json().catch(() => null)) as { data?: T; error?: ErrorBody } | null;

  if (!res.ok) {
    // auth=false 요청의 401(로그인 실패 등)은 세션 만료가 아니다
    if (res.status === 401 && auth) onUnauthorized?.();
    const error = json?.error;
    throw new ApiError(res.status, error?.code ?? "UNKNOWN_ERROR", error?.message ?? res.statusText, error?.details);
  }

  return json?.data as T;
}
