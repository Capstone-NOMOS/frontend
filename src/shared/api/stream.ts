"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * 화면용 실시간 신호 `/api/stream` (backend #21, adr/0009). 데이터가 아니라 "무엇을 다시 읽을지(topics)"만 온다.
 * 탭당 연결 하나를 모듈에 두고, 화면은 신호를 받아 기존 쿼리를 무효화한다. 라이브러리 없이 브라우저 WebSocket을 쓴다.
 *
 * 서버 → { ready } · { changed, projectId | null, topics } · { resync } · { subscribed | unsubscribed, projectId } · { error }
 * 훅을 담고 있어 "use client" — 배럴(@/shared/api)을 통해 서버 컴포넌트(invites/[token]/page.tsx)에도 끌려 들어간다
 *
 * 닫는 코드: 4401 인증 실패 · 4403 조직 없음 · 4400·4408 첫 메시지 문제 — 다시 연결해도 같으므로 재연결하지 않는다
 */

export type StreamSignal = { kind: "changed"; projectId: string | null; topics: string[] } | { kind: "resync" };

/** 연결돼 있을 때 남겨 두는 대비용 폴링 주기 (BE 권장 30~60초) */
const FALLBACK_POLL_MS = 30_000;
const MAX_RETRY_MS = 30_000;
/** 레이아웃이 바뀌며 AuthGate가 잠깐 내려갔다 올라와도 연결을 끊지 않는다 */
const CLOSE_GRACE_MS = 2_000;
const NO_RETRY_CODES = new Set([4400, 4401, 4403, 4408]);

let ws: WebSocket | null = null;
let token: string | null = null;
let users = 0;
let connected = false;
let everReady = false;
let retryDelay = 1_000;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let closeTimer: ReturnType<typeof setTimeout> | null = null;
const subscriptions = new Map<string, number>(); // projectId → 구독한 화면 수
const signalListeners = new Set<(s: StreamSignal) => void>();
const stateListeners = new Set<() => void>();

const streamUrl = () => `${(process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/^http/, "ws")}/stream`;

function setConnected(next: boolean) {
  if (connected === next) return;
  connected = next;
  stateListeners.forEach((l) => l());
}

function send(message: object) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
}

function emit(signal: StreamSignal) {
  signalListeners.forEach((l) => l(signal));
}

function open() {
  retryTimer = null;
  const socket = new WebSocket(streamUrl());
  ws = socket;
  // URL에 실으면 프록시 로그에 남는다 — 연결 뒤 첫 메시지로 보낸다
  socket.onopen = () => socket.send(JSON.stringify({ type: "auth", token }));
  socket.onmessage = (e) => {
    let m: { type?: string; projectId?: string | null; topics?: unknown };
    try {
      m = JSON.parse(String(e.data));
    } catch {
      return;
    }
    if (m.type === "ready") {
      retryDelay = 1_000;
      setConnected(true);
      subscriptions.forEach((_, projectId) => send({ type: "subscribe", projectId }));
      // 다시 붙었다면 끊겨 있던 사이의 변화를 놓쳤다 — 열린 화면을 다시 읽는다
      if (everReady) emit({ kind: "resync" });
      everReady = true;
    } else if (m.type === "changed" && Array.isArray(m.topics)) {
      emit({ kind: "changed", projectId: m.projectId ?? null, topics: m.topics.filter((t) => typeof t === "string") });
    } else if (m.type === "resync") {
      emit({ kind: "resync" });
    }
  };
  socket.onclose = (e) => {
    if (ws !== socket) return; // 이미 새 연결로 바뀌었다
    ws = null;
    const wasConnected = connected;
    setConnected(false);
    // 끊긴 사이의 신호는 다시 오지 않는다. 지금 한 번 다시 읽으면 폴링 주기도 원래 값(livePoll)으로 다시 잡힌다
    if (wasConnected && users > 0) emit({ kind: "resync" });
    if (users === 0 || NO_RETRY_CODES.has(e.code)) return;
    retryTimer = setTimeout(open, retryDelay);
    retryDelay = Math.min(retryDelay * 2, MAX_RETRY_MS);
  };
}

function close() {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  const socket = ws;
  ws = null;
  socket?.close(1000);
  setConnected(false);
  everReady = false;
  retryDelay = 1_000;
}

/** 로그인·조직이 있는 동안 연결을 유지한다. 돌려준 함수로 해제한다 (마지막 해제 뒤 잠시 기다렸다 닫는다) */
function acquire(nextToken: string) {
  users++;
  if (closeTimer) clearTimeout(closeTimer);
  closeTimer = null;
  if (token !== nextToken) {
    // 다른 사용자로 다시 로그인했다 — 옛 토큰의 연결을 버린다
    close();
    token = nextToken;
  }
  if (!ws && !retryTimer) open();
  return () => {
    users--;
    if (users > 0) return;
    closeTimer = setTimeout(() => {
      closeTimer = null;
      close();
      token = null;
    }, CLOSE_GRACE_MS);
  };
}

/** 앱에서 한 곳(AuthGate)만 부른다. token이 null이면 연결하지 않는다 */
export function useStreamConnection(accessToken: string | null) {
  useEffect(() => (accessToken ? acquire(accessToken) : undefined), [accessToken]);
}

/** 프로젝트 화면에 있는 동안 그 프로젝트의 신호를 받는다. 조직 신호는 구독 없이 온다 */
export function useProjectStream(projectId: string) {
  useEffect(() => {
    const n = subscriptions.get(projectId) ?? 0;
    subscriptions.set(projectId, n + 1);
    if (n === 0) send({ type: "subscribe", projectId });
    return () => {
      const left = (subscriptions.get(projectId) ?? 1) - 1;
      if (left > 0) return void subscriptions.set(projectId, left);
      subscriptions.delete(projectId);
      send({ type: "unsubscribe", projectId });
    };
  }, [projectId]);
}

export function useStreamSignal(listener: (s: StreamSignal) => void) {
  useEffect(() => {
    signalListeners.add(listener);
    return () => void signalListeners.delete(listener);
  }, [listener]);
}

export function useStreamConnected() {
  return useSyncExternalStore(
    (l) => {
      stateListeners.add(l);
      return () => void stateListeners.delete(l);
    },
    () => connected,
    () => false,
  );
}

/**
 * refetchInterval용. 신호를 받는 동안은 대비용 30초, 끊겨 있으면 원래 주기.
 * 주기는 다음 조회 때 다시 계산된다 — 그래서 연결이 바뀌면(끊김·재연결) resync로 한 번 다시 읽는다
 */
export function livePoll(ms: number) {
  return () => (connected ? FALLBACK_POLL_MS : ms);
}
