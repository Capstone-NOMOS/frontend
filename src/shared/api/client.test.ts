import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, setOnUnauthorized } from "./client";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://api.test");
});

afterEach(() => {
  fetchMock.mockReset();
  setOnUnauthorized(null);
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("apiFetch — 쓰기 요청 중복 제거", () => {
  it("같은 쓰기 요청이 겹치면 한 번만 보내고 결과를 나눠 갖는다", async () => {
    fetchMock.mockResolvedValue(json(200, { data: { id: "a1" } }));

    const body = { decision: "APPROVE" };
    const [first, second] = await Promise.all([
      apiFetch("/approvals/1/decide", { method: "POST", body }),
      apiFetch("/approvals/1/decide", { method: "POST", body }),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual({ id: "a1" });
    expect(second).toEqual({ id: "a1" });
  });

  it("본문이 다르면 다른 요청이다", async () => {
    fetchMock.mockImplementation(async () => json(200, { data: null }));

    await Promise.all([
      apiFetch("/approvals/1/decide", { method: "POST", body: { decision: "APPROVE" } }),
      apiFetch("/approvals/1/decide", { method: "POST", body: { decision: "REJECT" } }),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("끝난 요청은 기억하지 않는다 — 같은 요청을 다시 보낼 수 있다", async () => {
    fetchMock.mockImplementation(async () => json(200, { data: null }));

    await apiFetch("/tasks/1/resume", { method: "POST" });
    await apiFetch("/tasks/1/resume", { method: "POST" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("조회(GET)는 합치지 않는다", async () => {
    fetchMock.mockImplementation(async () => json(200, { data: [] }));

    await Promise.all([apiFetch("/me"), apiFetch("/me")]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("apiFetch — 오류 처리", () => {
  it("인증이 필요한 요청의 401은 세션 만료로 알린다", async () => {
    const onUnauthorized = vi.fn();
    setOnUnauthorized(onUnauthorized);
    fetchMock.mockResolvedValue(json(401, { error: { code: "UNAUTHORIZED", message: "expired" } }));

    await expect(apiFetch("/me")).rejects.toMatchObject({ status: 401, code: "UNAUTHORIZED" });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("auth: false 요청의 401(로그인 실패)은 세션 만료가 아니다", async () => {
    const onUnauthorized = vi.fn();
    setOnUnauthorized(onUnauthorized);
    fetchMock.mockResolvedValue(json(401, { error: { code: "INVALID_CREDENTIALS", message: "wrong" } }));

    await expect(apiFetch("/auth/login", { method: "POST", body: {}, auth: false })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("네트워크 실패는 ApiError(0, NETWORK_ERROR)로 바꾼다", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const error = await apiFetch("/me").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0, code: "NETWORK_ERROR" });
  });

  it("본문이 없는 성공 응답(204)도 처리한다", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(apiFetch("/invites/1", { method: "DELETE" })).resolves.toBeUndefined();
  });
});
