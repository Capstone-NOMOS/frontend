import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StreamSignal } from "./stream";

/** 브라우저 WebSocket 대역. 서버 쪽 동작(open · 메시지 · 끊김)은 테스트가 직접 일으킨다 */
class FakeSocket {
  static readonly OPEN = 1;
  static instances: FakeSocket[] = [];

  readyState = 0;
  sent: Record<string, unknown>[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: ((e: { code: number }) => void) | null = null;

  constructor(readonly url: string) {
    FakeSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(JSON.parse(data) as Record<string, unknown>);
  }

  /** 화면 쪽이 닫는다. 모듈이 이미 소켓을 버린 뒤라 onclose는 부르지 않아도 된다 */
  close() {
    this.readyState = 3;
  }

  serverOpen() {
    this.readyState = FakeSocket.OPEN;
    this.onopen?.();
  }

  serverSend(message: object) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }

  serverClose(code: number) {
    this.readyState = 3;
    this.onclose?.({ code });
  }
}

const sockets = () => FakeSocket.instances;
const last = () => FakeSocket.instances.at(-1)!;

/** 모듈이 연결 상태를 전역 변수로 들고 있어 테스트마다 새로 불러온다 */
const load = () => import("./stream");

/** 연결하고 서버가 받아 준 상태까지 */
async function connect(token = "token-a") {
  const stream = await load();
  const signals: StreamSignal[] = [];
  stream.onStreamSignal((s) => signals.push(s));
  const release = stream.acquire(token);
  last().serverOpen();
  last().serverSend({ type: "ready" });
  return { stream, signals, release };
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  FakeSocket.instances = [];
  vi.stubGlobal("WebSocket", FakeSocket);
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.test/api");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("연결", () => {
  it("http 주소를 ws로 바꿔 /stream에 붙는다", async () => {
    const { acquire } = await load();
    acquire("token-a");

    expect(last().url).toBe("wss://api.test/api/stream");
  });

  it("토큰은 URL이 아니라 연결 뒤 첫 메시지로 보낸다", async () => {
    const { acquire } = await load();
    acquire("token-a");
    expect(last().url).not.toContain("token-a");

    last().serverOpen();

    expect(last().sent).toEqual([{ type: "auth", token: "token-a" }]);
  });

  it("화면이 여럿이어도 연결은 하나다", async () => {
    const { acquire } = await load();
    acquire("token-a");
    acquire("token-a");

    expect(sockets()).toHaveLength(1);
  });

  it("마지막 화면이 떠나도 2초는 연결을 유지한다 — 레이아웃이 바뀌며 잠깐 내려갔다 올라오는 경우", async () => {
    const { stream, release } = await connect();
    const socket = last();

    release();
    vi.advanceTimersByTime(1_900);
    stream.acquire("token-a");
    vi.advanceTimersByTime(10_000);

    expect(socket.readyState).toBe(FakeSocket.OPEN);
    expect(sockets()).toHaveLength(1);
  });

  it("2초가 지나도록 아무도 없으면 닫는다", async () => {
    const { release } = await connect();
    const socket = last();

    release();
    vi.advanceTimersByTime(2_000);

    expect(socket.readyState).toBe(3);
  });
});

describe("구독", () => {
  it("연결되기 전에 구독한 프로젝트는 ready를 받은 뒤 보낸다", async () => {
    const stream = await load();
    stream.acquire("token-a");
    stream.subscribeProject("p1");
    last().serverOpen();
    expect(last().sent).toEqual([{ type: "auth", token: "token-a" }]);

    last().serverSend({ type: "ready" });

    expect(last().sent.at(-1)).toEqual({ type: "subscribe", projectId: "p1" });
  });

  it("다시 연결되면 구독 중이던 프로젝트를 전부 다시 구독한다", async () => {
    const { stream } = await connect();
    stream.subscribeProject("p1");
    stream.subscribeProject("p2");

    last().serverClose(1006);
    vi.advanceTimersByTime(1_000);
    last().serverOpen();
    last().serverSend({ type: "ready" });

    expect(last().sent).toEqual([
      { type: "auth", token: "token-a" },
      { type: "subscribe", projectId: "p1" },
      { type: "subscribe", projectId: "p2" },
    ]);
  });

  it("같은 프로젝트를 여러 화면이 구독해도 서버에는 한 번만 알리고, 마지막 화면이 떠날 때 해제한다", async () => {
    const { stream } = await connect();
    const first = stream.subscribeProject("p1");
    const second = stream.subscribeProject("p1");
    const subscribes = () => last().sent.filter((m) => m.type === "subscribe");
    const unsubscribes = () => last().sent.filter((m) => m.type === "unsubscribe");
    expect(subscribes()).toHaveLength(1);

    first();
    expect(unsubscribes()).toHaveLength(0);
    second();
    expect(unsubscribes()).toEqual([{ type: "unsubscribe", projectId: "p1" }]);
  });

  it("서버가 끊은 구독(프로젝트 삭제)은 다시 구독하지 않고, 상세를 다시 읽게 한다", async () => {
    const { stream, signals } = await connect();
    stream.subscribeProject("p1");

    last().serverSend({ type: "unsubscribed", projectId: "p1", reason: "PROJECT_NOT_FOUND" });
    expect(signals).toEqual([{ kind: "changed", projectId: "p1", topics: ["project"] }]);

    last().serverClose(1006);
    vi.advanceTimersByTime(1_000);
    last().serverOpen();
    last().serverSend({ type: "ready" });

    expect(last().sent).toEqual([{ type: "auth", token: "token-a" }]);
  });
});

describe("재연결", () => {
  it("끊기면 1초 → 2초 → 4초로 간격을 늘리며 다시 붙는다", async () => {
    await connect();

    for (const wait of [1_000, 2_000, 4_000]) {
      const before = sockets().length;
      last().serverClose(1006);
      vi.advanceTimersByTime(wait - 1);
      expect(sockets()).toHaveLength(before);
      vi.advanceTimersByTime(1);
      expect(sockets()).toHaveLength(before + 1);
    }
  });

  it("간격은 30초를 넘지 않는다", async () => {
    await connect();
    // 1 → 2 → 4 → 8 → 16 → 32(=30)초
    for (let i = 0; i < 5; i++) {
      last().serverClose(1006);
      vi.advanceTimersByTime(30_000);
    }
    const before = sockets().length;

    last().serverClose(1006);
    vi.advanceTimersByTime(29_999);
    expect(sockets()).toHaveLength(before);
    vi.advanceTimersByTime(1);
    expect(sockets()).toHaveLength(before + 1);
  });

  it("다시 붙으면 간격을 1초로 되돌린다", async () => {
    await connect();
    last().serverClose(1006);
    vi.advanceTimersByTime(1_000);
    last().serverClose(1006);
    vi.advanceTimersByTime(2_000);
    last().serverOpen();
    last().serverSend({ type: "ready" });
    const before = sockets().length;

    last().serverClose(1006);
    vi.advanceTimersByTime(1_000);

    expect(sockets()).toHaveLength(before + 1);
  });

  it.each([
    [4400, "첫 메시지 형식 오류"],
    [4401, "인증 실패"],
    [4403, "조직 없음"],
    [4408, "첫 메시지 시간 초과"],
  ])("%i(%s)로 닫히면 다시 연결하지 않는다 — 다시 해도 같은 결과다", async (code) => {
    await connect();

    last().serverClose(code);
    vi.advanceTimersByTime(120_000);

    expect(sockets()).toHaveLength(1);
  });

  it("4401로 거절된 토큰으로는 화면이 바뀌어도 다시 연결하지 않는다", async () => {
    const { stream, release } = await connect();
    last().serverClose(4401);

    release();
    stream.acquire("token-a");
    vi.advanceTimersByTime(120_000);

    expect(sockets()).toHaveLength(1);
  });

  it("다시 로그인해 토큰이 바뀌면 연결한다", async () => {
    const { stream, release } = await connect();
    last().serverClose(4401);
    release();

    stream.acquire("token-b");
    last().serverOpen();

    expect(sockets()).toHaveLength(2);
    expect(last().sent).toEqual([{ type: "auth", token: "token-b" }]);
  });

  it("보는 화면이 없으면 끊겨도 다시 연결하지 않는다", async () => {
    const { release } = await connect();
    const socket = last();

    release();
    socket.serverClose(1006);
    vi.advanceTimersByTime(120_000);

    expect(sockets()).toHaveLength(1);
  });
});

describe("신호", () => {
  it("changed 신호를 그대로 전달하고, 문자열이 아닌 topic은 버린다", async () => {
    const { signals } = await connect();

    last().serverSend({ type: "changed", projectId: "p1", topics: ["tasks", 7, null, "events"] });
    last().serverSend({ type: "changed", topics: ["agents"] });

    expect(signals).toEqual([
      { kind: "changed", projectId: "p1", topics: ["tasks", "events"] },
      { kind: "changed", projectId: null, topics: ["agents"] },
    ]);
  });

  it("깨진 메시지는 무시한다", async () => {
    const { signals } = await connect();

    last().onmessage?.({ data: "not json" });
    last().serverSend({ type: "changed", topics: "tasks" });

    expect(signals).toEqual([]);
  });

  it("처음 연결될 때는 resync를 내지 않는다 — 화면이 이미 새로 읽은 상태다", async () => {
    const { signals } = await connect();

    expect(signals).toEqual([]);
  });

  it("끊기는 순간과 다시 붙는 순간에 resync를 낸다 — 그 사이의 신호는 다시 오지 않는다", async () => {
    const { signals } = await connect();

    last().serverClose(1006);
    expect(signals).toEqual([{ kind: "resync" }]);

    vi.advanceTimersByTime(1_000);
    last().serverOpen();
    last().serverSend({ type: "ready" });
    expect(signals).toEqual([{ kind: "resync" }, { kind: "resync" }]);
  });

  it("서버가 보낸 resync도 전달한다", async () => {
    const { signals } = await connect();

    last().serverSend({ type: "resync" });

    expect(signals).toEqual([{ kind: "resync" }]);
  });

  it("해제한 리스너는 신호를 받지 않는다", async () => {
    const { stream } = await connect();
    const listener = vi.fn();
    const off = stream.onStreamSignal(listener);

    off();
    last().serverSend({ type: "resync" });

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("livePoll — 대비용 폴링 주기", () => {
  it("신호를 받는 동안은 30초, 끊겨 있으면 원래 주기", async () => {
    const stream = await load();
    const interval = stream.livePoll(5_000);
    expect(interval()).toBe(5_000);

    stream.acquire("token-a");
    last().serverOpen();
    expect(interval()).toBe(5_000); // 열렸지만 아직 인증 전
    last().serverSend({ type: "ready" });
    expect(interval()).toBe(30_000);

    last().serverClose(1006);
    expect(interval()).toBe(5_000);
  });
});
