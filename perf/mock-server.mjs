// 룸 피드 성능 측정용 목 서버 (docs/perf-room-feed.md). 의존성 없이 node:http만 쓴다. 제품 코드가 아니다.
//   node perf/mock-server.mjs            → http://localhost:3900/api
//   POST /__perf/reset?n=500&running=0   더미 피드를 다시 만들고 resync 신호를 보낸다 (running=1이면 끝나지 않은 실행이 있다 → "생각 중")
//   POST /__perf/push                    에이전트 말 한 줄을 더하고 room 신호를 보낸다
// 더미는 전부 지어낸 값이다. 실제 팀 데이터·개인정보를 넣지 않는다.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

const PORT = Number(process.env.PERF_PORT ?? 3900);
const PROJECT = "perf-project";
const ORG = "perf-org";
const ME = "user-rep";
const OWNER = "user-fe";
const AGENT = "agent-fe";

// 줄 구성 비율 (합 1). 실행 중인 에이전트의 피드를 가정한다 — 도구 줄이 가장 많다
export const MIX = { tool: 0.55, say: 0.2, system: 0.17, question: 0.06, human: 0.02 };

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FILES = [
  "cart/CartItem.tsx",
  "cart/useCart.ts",
  "checkout/CheckoutForm.tsx",
  "catalog/ProductGrid.tsx",
  "shared/price.ts",
];
const SAY = [
  "장바구니 수량 변경부터 구현하겠습니다.",
  "기존 훅이 합계를 매번 다시 계산하고 있어서, 수량이 바뀐 줄만 다시 계산하도록 정리했습니다. 테스트 세 개를 추가했고 모두 통과합니다.",
  "결제 폼 검증 규칙을 계약에 맞췄습니다. 우편번호는 다섯 자리 숫자만 받고, 빈 값이면 제출 버튼을 막습니다. 오류 문구는 필드 아래에 한 줄로 보입니다. 다음은 주문 요약 영역입니다.",
];
const SYSTEM = [
  ["nomos", "TASK_CLAIMED", "태스크 수령 — 구현을 시작합니다"],
  ["nomos", "ARTIFACT_SUBMITTED", "제출했습니다 (커밋 abc1234, 파일 3개)"],
  ["pm", "VERIFICATION_COMPLETED", "검증 완료 — V1·V2 통과 → 담당 검토를 기다립니다"],
  ["pm", "APPROVAL_RESULT", "담당이 승인했습니다 → 완료되었습니다"],
];
const KINDS = ["read", "read", "edit", "edit", "run", "search", "write", "other"];

let messages = []; // 오래된 줄부터
let questions = [];
let tasks = [];
let seq = 0;

function reset(n, running) {
  const rand = mulberry32(42);
  const pick = (xs) => xs[Math.floor(rand() * xs.length)];
  messages = [];
  questions = [];
  tasks = [];
  seq = 0;
  // 마지막 줄이 10초 전 — "생각 중"(6초 기준)이 바로 뜬다. 줄 사이는 7초
  const end = Date.now() - 10_000;
  const tsOf = (i) => new Date(end - (n - 1 - i) * 7_000).toISOString();
  const line = (i, taskId, over) => ({
    id: `m${String(++seq).padStart(7, "0")}`,
    ts: tsOf(i),
    speaker: "agent",
    type: "AGENT_ACTIVITY",
    taskId,
    taskTitle: `더미 태스크 ${taskId.slice(1)}`,
    userId: null,
    text: "",
    questionId: null,
    activity: null,
    ...over,
  });
  let pendingQuestion = null; // 같은 questionId로 이어질 뒤 줄 (답함)
  for (let i = 0; i < n; i++) {
    const taskIndex = Math.floor(i / 25);
    const taskId = `t${String(taskIndex + 1).padStart(4, "0")}`;
    const last = n - i <= 20; // 마지막 20줄은 한 실행 안
    if (i % 25 === 0) {
      tasks.push({
        id: taskId,
        projectId: PROJECT,
        repoId: "repo-1",
        specId: null,
        kind: "IMPLEMENT",
        title: `더미 태스크 ${taskIndex + 1}`,
        state: "DONE",
        teamRole: "FRONTEND",
        assigneeAgentId: AGENT,
        branchName: null,
        blockedReason: null,
        claimedAt: tsOf(i),
        retryCount: 0,
      });
    }
    const pos = i % 25;
    if (n - i === 20) {
      messages.push(
        line(i, taskId, { speaker: "nomos", type: "AGENT_RUN_STARTED", text: "에이전트가 실행을 시작했습니다" }),
      );
      continue;
    }
    if (!last && pos === 0) {
      messages.push(
        line(i, taskId, { speaker: "nomos", type: "AGENT_RUN_STARTED", text: "에이전트가 실행을 시작했습니다" }),
      );
      continue;
    }
    if (!last && pos === 24) {
      messages.push(
        line(i, taskId, { speaker: "nomos", type: "AGENT_RUN_ENDED", text: "에이전트가 실행을 마쳤습니다" }),
      );
      continue;
    }
    if (pendingQuestion && rand() < 0.5) {
      const q = pendingQuestion;
      pendingQuestion = null;
      messages.push(
        line(i, taskId, { speaker: "pm", type: "QUESTION_ANSWERED", questionId: q.id, text: "질문에 답했습니다" }),
      );
      continue;
    }
    const r = rand();
    if (r < MIX.tool) {
      const kind = pick(KINDS);
      const target = kind === "run" ? "pnpm test cart" : kind === "search" ? "useCart(" : `src/features/${pick(FILES)}`;
      const diff = kind === "edit" || kind === "write";
      messages.push(
        line(i, taskId, {
          text: `${kind} ${target}`,
          activity: {
            kind,
            target,
            ok: rand() < 0.03 ? false : true,
            added: diff ? Math.floor(rand() * 40) : null,
            removed: diff ? Math.floor(rand() * 15) : null,
          },
        }),
      );
    } else if (r < MIX.tool + MIX.say) {
      const target = pick(SAY);
      messages.push(
        line(i, taskId, { text: target, activity: { kind: "say", target, ok: null, added: null, removed: null } }),
      );
    } else if (r < MIX.tool + MIX.say + MIX.system) {
      const [speaker, type, text] = pick(SYSTEM);
      messages.push(line(i, taskId, { speaker, type, text }));
    } else if (r < MIX.tool + MIX.say + MIX.system + MIX.question / 2) {
      // 질문 하나는 줄 두 개(물음 · 답함)로 묶인다 — question 비율의 절반만 새 질문
      const id = `q${String(questions.length + 1).padStart(4, "0")}`;
      const text = "빈 장바구니일 때 결제 버튼을 숨길까요, 비활성화할까요?";
      const state = questions.length % 4; // 0·1 사람이 답함 · 2 에이전트가 답함 · 3 만료
      const q = {
        id,
        projectId: PROJECT,
        stage: "implementation",
        planId: null,
        contractId: null,
        taskId,
        askedByAgentId: AGENT,
        askerRole: "FRONTEND",
        targetRole: "FRONTEND",
        routedBy: "llm",
        routing: { confidence: 0.8, reason: "화면 동작에 관한 질문", latencyMs: 900, fallback: null },
        questions: [
          {
            question: text,
            header: "장바구니",
            multiSelect: false,
            options: [{ label: "숨긴다" }, { label: "비활성화한다", description: "이유를 툴팁으로 보인다" }],
          },
        ],
        status: state < 2 ? "answered" : state === 2 ? "agent_answered" : "expired",
        draft:
          state === 2
            ? {
                answers: { [text]: "비활성화한다" },
                decided: { [text]: true },
                basis: { [text]: ["src/features/cart/CartItem.tsx"] },
              }
            : null,
        draftedByAgentId: state === 2 ? AGENT : null,
        draftedAt: state === 2 ? tsOf(i) : null,
        answerSource: state < 2 ? "human" : null,
        answers: state < 2 ? { [text]: "비활성화한다" } : null,
        answeredBy: state < 2 ? OWNER : null,
        answeredAt: state < 2 ? tsOf(i) : null,
        expiresAt: tsOf(i),
        createdAt: tsOf(i),
      };
      questions.push(q);
      pendingQuestion = q;
      messages.push(line(i, taskId, { type: "QUESTION_ASKED", questionId: id, text: "질문을 올렸습니다" }));
    } else if (r < MIX.tool + MIX.say + MIX.system + MIX.question / 2 + MIX.human) {
      messages.push(
        line(i, taskId, {
          speaker: "human",
          type: "ROOM_MESSAGE_SENT",
          userId: OWNER,
          text: "수량 0은 삭제로 처리해 주세요.",
        }),
      );
    } else {
      const [speaker, type, text] = pick(SYSTEM);
      messages.push(line(i, taskId, { speaker, type, text }));
    }
  }
  if (!running) {
    const m = messages.at(-1);
    messages.push({
      ...m,
      id: `m${String(++seq).padStart(7, "0")}`,
      speaker: "nomos",
      type: "AGENT_RUN_ENDED",
      text: "에이전트가 실행을 마쳤습니다",
      questionId: null,
      activity: null,
    });
    messages.shift(); // 줄 수를 n으로 유지
  }
}

function push() {
  const target = `새 줄 ${seq + 1} — 측정용으로 도착한 에이전트 말입니다.`;
  const taskId = tasks.at(-1).id;
  messages.push({
    id: `m${String(++seq).padStart(7, "0")}`,
    ts: new Date().toISOString(),
    speaker: "agent",
    type: "AGENT_ACTIVITY",
    taskId,
    taskTitle: tasks.at(-1).title,
    userId: null,
    text: target,
    questionId: null,
    activity: { kind: "say", target, ok: null, added: null, removed: null },
  });
  broadcast({ type: "changed", projectId: PROJECT, topics: ["room"] });
}

function mixOf() {
  const c = {};
  for (const m of messages) {
    const k = m.questionId
      ? "question"
      : m.activity
        ? m.activity.kind === "say"
          ? "say"
          : "tool"
        : m.speaker === "human"
          ? "human"
          : "system";
    c[k] = (c[k] ?? 0) + 1;
  }
  return { lines: messages.length, questions: questions.length, tasks: tasks.length, ...c };
}

const project = {
  id: PROJECT,
  orgId: ORG,
  name: "성능 측정 프로젝트",
  autonomyPreset: "L2",
  policyHash: "x",
  constitutionHash: "x",
  pmBudgetUsd: "1.00",
  budgetUsd: "1.00",
  deadline: "2030-01-01",
  status: "active",
  startedAt: "2026-01-01T00:00:00.000Z",
  createdBy: ME,
  createdAt: "2026-01-01T00:00:00.000Z",
  questionRelay: true,
  questionMode: "relay",
  autoMerge: false,
};
const counts = {
  approval_role_review: 0,
  approval_final: 0,
  release: 0,
  question: 0,
  contract: 0,
  plan: 0,
  stuck_task: 0,
  agent_needed: 0,
};

function route(path, query) {
  const p = `/projects/${PROJECT}`;
  if (path === "/me")
    return {
      userId: ME,
      loginId: "perf-rep",
      nickname: "측정대표",
      githubLogin: null,
      orgId: ORG,
      orgName: "측정 조직",
      orgRole: "REPRESENTATIVE",
    };
  if (path === p)
    return {
      project,
      repos: [{ id: "repo-1", orgId: ORG, fullName: "perf/dummy" }],
      members: [{ agentId: AGENT, agentName: "perf-agent", teamRole: "FRONTEND", userId: OWNER, githubInvites: [] }],
    };
  if (path === "/me/notifications") return { notifications: [], unreadCount: 0 };
  if (path === "/me/inbox") return { items: [], counts };
  if (path === "/me/questions") return { questions: [] };
  if (path === `/orgs/${ORG}/projects`) return { projects: [project] };
  if (path === `/orgs/${ORG}/members`)
    return {
      members: [
        {
          userId: ME,
          loginId: "perf-rep",
          nickname: "측정대표",
          githubLogin: null,
          name: null,
          orgRole: "REPRESENTATIVE",
        },
        { userId: OWNER, loginId: "perf-fe", nickname: "측정담당", githubLogin: null, name: null, orgRole: "MEMBER" },
      ],
    };
  if (path === `/orgs/${ORG}/agents`) return { agents: [] };
  if (path === `${p}/rooms`)
    return {
      rooms: [
        {
          role: "FRONTEND",
          agent: { agentId: AGENT, agentName: "perf-agent", online: true, lastSeenAt: null },
          activeTasks: [],
        },
      ],
    };
  if (path === `${p}/rooms/FRONTEND/feed`) {
    const limit = Number(query.get("limit") ?? 50);
    const before = query.get("before");
    const end = before ? messages.findIndex((m) => m.id === before) : messages.length;
    const start = Math.max(0, end - limit);
    const page = messages.slice(start, end).reverse(); // 최신 줄부터
    return { messages: page, nextBefore: start > 0 ? page.at(-1).id : null };
  }
  if (path === `${p}/questions`) return { questions: [...questions].reverse() };
  if (path === `${p}/tasks`) return { tasks };
  if (path === `${p}/contracts`) return { contracts: [] };
  if (path === `${p}/approvals`) return { approvals: [] };
  return undefined;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  const json = (status, body) =>
    res.writeHead(status, { ...CORS, "Content-Type": "application/json" }).end(JSON.stringify(body));
  if (req.method === "OPTIONS") return void res.writeHead(204, CORS).end();
  if (url.pathname === "/__perf/reset") {
    reset(Number(url.searchParams.get("n") ?? 500), url.searchParams.get("running") === "1");
    // 열려 있는 화면이 새 더미를 다시 읽게 한다
    broadcast({ type: "resync" });
    return json(200, mixOf());
  }
  if (url.pathname === "/__perf/collect.js") {
    // 콘솔에 붙여 넣는 대신 <script src>로 불러올 수 있게 내준다
    return void res
      .writeHead(200, { ...CORS, "Content-Type": "text/javascript" })
      .end(readFileSync(new URL("./collect.js", import.meta.url)));
  }
  if (url.pathname === "/__perf/save") {
    // 측정 스크립트(perf/collect.js)가 보낸 결과를 perf/results/<이름>.json으로 남긴다
    const name = (url.searchParams.get("name") ?? "result").replace(/[^\w.-]/g, "_");
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      mkdirSync(new URL("./results/", import.meta.url), { recursive: true });
      writeFileSync(new URL(`./results/${name}.json`, import.meta.url), JSON.stringify(JSON.parse(body), null, 2));
      json(200, { saved: name });
    });
    return;
  }
  if (url.pathname === "/__perf/push") {
    push();
    return json(200, { lines: messages.length, text: messages.at(-1).text });
  }
  const data = url.pathname.startsWith("/api") ? route(url.pathname.slice(4), url.searchParams) : undefined;
  if (data === undefined) {
    console.log("404", req.method, req.url);
    return json(404, { error: { code: "NOT_FOUND", message: "perf mock: no route" } });
  }
  json(200, { data });
});

// 화면용 신호 /api/stream — 텍스트 프레임만 주고받는 최소 웹소켓 (RFC 6455)
const sockets = new Set();
function frame(text) {
  const body = Buffer.from(text);
  const head =
    body.length < 126
      ? Buffer.from([0x81, body.length])
      : Buffer.from([0x81, 126, body.length >> 8, body.length & 255]);
  return Buffer.concat([head, body]);
}
function broadcast(message) {
  for (const s of sockets) s.write(frame(JSON.stringify(message)));
}
server.on("upgrade", (req, socket) => {
  const accept = createHash("sha1")
    .update(`${req.headers["sec-websocket-key"]}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");
  socket.write(
    `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`,
  );
  sockets.add(socket);
  socket.on("close", () => sockets.delete(socket));
  socket.on("error", () => sockets.delete(socket));
  socket.on("data", (buf) => {
    if ((buf[0] & 0x0f) === 8) return void socket.end(); // close
    // 클라이언트 프레임은 마스크돼 있다. 측정에 쓰는 메시지(auth · subscribe)는 125바이트를 넘지 않는다고 가정하지 않고 길이를 읽는다
    let len = buf[1] & 127;
    let at = 2;
    if (len === 126) {
      len = buf.readUInt16BE(2);
      at = 4;
    }
    const mask = buf.subarray(at, at + 4);
    const body = Buffer.from(buf.subarray(at + 4, at + 4 + len).map((b, i) => b ^ mask[i % 4]));
    let m;
    try {
      m = JSON.parse(body.toString());
    } catch {
      return;
    }
    if (m.type === "auth") socket.write(frame(JSON.stringify({ type: "ready" })));
    if (m.type === "subscribe") socket.write(frame(JSON.stringify({ type: "subscribed", projectId: m.projectId })));
  });
});

/** 측정 스크립트(perf/bench-rows.mjs)가 같은 더미를 쓴다 */
export function dummy(n, running = false) {
  reset(n, running);
  return { messages, questions, tasks, mix: mixOf() };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  reset(500, false);
  server.listen(PORT, () => console.log(`perf mock on http://localhost:${PORT}/api`, mixOf()));
}
