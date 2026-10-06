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

export async function apiFetch<T>(
  path: string,
  { method = "GET", body, auth = true }: ApiFetchOptions = {},
): Promise<T> {
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
