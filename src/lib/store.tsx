"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { uid } from "@/shared/lib/format";
import type { Level, Role } from "@/shared/model";
import type { Agent } from "@/entities/agent";
import type { Document } from "@/entities/document";
import type { Event } from "@/entities/event";
import type { Card, Message } from "@/entities/message";
import type { Membership, Project, Repo } from "@/entities/project";
import type { Room } from "@/entities/room";
import type { Task } from "@/entities/task";
import type { User } from "@/entities/user";
import { SEED } from "./mock/seed";

/** 목업 스토어의 상태 모양. 서버 연동 시 스토어와 함께 사라진다 (docs/architecture.md §8). */
export interface Session {
  userId: string;
}

export interface AppState {
  version: number;
  users: User[];
  agents: Agent[];
  projects: Project[];
  members: Membership[];
  repos: Repo[];
  rooms: Room[];
  messages: Message[];
  tasks: Task[];
  documents: Document[];
  events: Event[];
  session: Session | null;
  pmTyping: Record<string, boolean>;
}

const STORAGE_KEY = "nomos.mock.v3";

type Action = { type: "hydrate"; state: AppState } | { type: "update"; fn: (s: AppState) => AppState };
type Store = { app: AppState; hydrated: boolean };

function reducer(store: Store, action: Action): Store {
  switch (action.type) {
    case "hydrate":
      return { app: action.state, hydrated: true };
    case "update":
      return { ...store, app: action.fn(store.app) };
  }
}

const now = () => new Date().toISOString();

// ---------- pure helpers ----------
const push = (s: AppState, m: Omit<Message, "id" | "ts"> & { id?: string; ts?: string }): AppState => ({
  ...s,
  messages: [...s.messages, { id: m.id ?? uid("m"), ts: m.ts ?? now(), ...m }],
});

const addEvent = (s: AppState, e: Omit<Event, "id" | "ts">): AppState => ({
  ...s,
  events: [...s.events, { id: uid("e"), ts: now(), ...e }],
});

const patchTask = (s: AppState, id: string, patch: Partial<Task>): AppState => ({
  ...s,
  tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: now() } : t)),
});

const patchCard = (s: AppState, messageId: string, fn: (c: Card) => Card): AppState => ({
  ...s,
  messages: s.messages.map((m) => (m.id === messageId && m.card ? { ...m, card: fn(m.card) } : m)),
});

const patchAgent = (s: AppState, id: string, patch: Partial<Agent>): AppState => ({
  ...s,
  agents: s.agents.map((a) => (a.id === id ? { ...a, ...patch, lastSeen: now() } : a)),
});

const setTyping = (s: AppState, roomId: string, on: boolean): AppState => ({
  ...s,
  pmTyping: { ...s.pmTyping, [roomId]: on },
});

const roomOf = (s: AppState, projectId: string, type: Room["type"]) =>
  s.rooms.find((r) => r.projectId === projectId && r.type === type);

const memberOf = (s: AppState, projectId: string, role: Role) =>
  s.members.find((m) => m.projectId === projectId && m.role === role);

const agentOfRole = (s: AppState, projectId: string, role: "FE" | "BE") => {
  const m = memberOf(s, projectId, role);
  return m ? s.agents.find((a) => a.userId === m.userId) : undefined;
};

const userName = (s: AppState, id?: string) => s.users.find((u) => u.id === id)?.nickname ?? "누군가";

const nextTaskNo = (s: AppState, projectId: string) => s.tasks.filter((t) => t.projectId === projectId).length + 1;

const pad = (n: number) => String(n).padStart(2, "0");

const stripMention = (text: string) => text.replace(/^@(PM|FE 에이전트|BE 에이전트)\s*/, "").trim();

function generateSpec(s: AppState, projectId: string, rawText: string): Extract<Card, { kind: "spec" }> {
  const text = stripMention(rawText) || rawText;
  const featureCount = new Set(s.tasks.filter((t) => t.projectId === projectId).map((t) => t.featureId)).size;
  const f1 = `F-${pad(featureCount + 1)}`;
  const f2 = `F-${pad(featureCount + 2)}`;
  const base = nextTaskNo(s, projectId);
  const short = text.length > 28 ? `${text.slice(0, 28)}…` : text;
  const slug = "feature";
  return {
    kind: "spec",
    version: 1,
    title: short,
    features: [
      {
        id: f1,
        title: `${short} — 핵심 흐름`,
        acs: [
          `WHEN 사용자가 "${short}" 진입점을 열면 THEN 필요한 데이터가 1초 안에 표시된다`,
          "WHEN 입력이 유효하지 않으면 THEN 저장되지 않고 필드 옆에 사유가 표시된다",
          "WHEN 저장에 성공하면 THEN 목록이 새로고침 없이 갱신된다",
        ],
      },
      {
        id: f2,
        title: `${short} — 조회·상태`,
        acs: ["WHEN 데이터가 없으면 THEN 빈 상태 안내가 표시된다", "WHEN 서버 오류 THEN 재시도 버튼이 표시된다"],
      },
    ],
    contract: [`POST /api/v1/${slug}  { ... } → 201 { id, createdAt }`, `GET  /api/v1/${slug} → 200 { items: [...] }`],
    tasks: [
      { id: `T-${pad(base)}`, title: `${short} API`, role: "BE" },
      { id: `T-${pad(base + 1)}`, title: `${short} 조회 API`, role: "BE" },
      { id: `T-${pad(base + 2)}`, title: `${short} 화면`, role: "FE" },
      { id: `T-${pad(base + 3)}`, title: `${short} 상태 처리`, role: "FE" },
    ],
    decisions: [
      { text: "저장소 구조(단일 테이블 vs 분리) → BE에게 물어보겠습니다", owner: "BE" },
      { text: "빈 상태 문구와 배치 → 대표님 결정 필요", owner: "OWNER" },
    ],
    status: "pending",
    revisions: 0,
  };
}

function isCrossScope(text: string): { path: string; owner: "FE" | "BE" } | null {
  const lower = text.toLowerCase();
  if (/(auth\.py|\.py\b|api 레포|be 레포|jazzify-api|migrations?)/i.test(lower) && /@fe/i.test(lower)) {
    return { path: "~/dev/jazzify-api/app/auth.py", owner: "BE" };
  }
  if (/(\.tsx?\b|fe 레포|web 레포|jazzify-web|components\/)/i.test(lower) && /@be/i.test(lower)) {
    return { path: "~/dev/jazzify-web/src/components/Header.tsx", owner: "FE" };
  }
  return null;
}

function latestDoc(s: AppState, projectId: string, type: Document["type"]) {
  return s.documents
    .filter((d) => d.projectId === projectId && d.type === type)
    .sort((a, b) => b.version - a.version)[0];
}

function addDocVersion(
  s: AppState,
  projectId: string,
  type: Document["type"],
  title: string,
  content: string,
  createdBy: string,
  locked: boolean,
): AppState {
  const prev = latestDoc(s, projectId, type);
  const version = prev ? prev.version + 1 : 1;
  return {
    ...s,
    documents: [
      ...s.documents,
      { id: uid("d"), projectId, type, version, title, content, locked, createdBy, createdAt: now() },
    ],
  };
}

// ---------- context ----------
interface Ctx {
  state: AppState;
  hydrated: boolean;
  me: User | null;
  actions: {
    login: (username: string) => User | null;
    signup: (input: { username: string; nickname: string }) => User;
    logout: () => void;
    connectAgent: (userId: string) => void;
    switchUser: (userId: string) => void;
    resetDemo: () => void;
    createProject: (input: { name: string; description: string; level: Level; stack: string }) => Project;
    joinProject: (token: string) => { project: Project; role: Role } | null;
    connectRepo: (projectId: string, role: "FE" | "BE", url: string, localPath: string) => void;
    sendMessage: (roomId: string, text: string) => void;
    decideSpec: (messageId: string, decision: "approve" | "changes", note?: string) => void;
    answerQuestion: (messageId: string, answer: string) => void;
    decideReport: (messageId: string, decision: "approve" | "changes", note?: string) => void;
    setLevel: (projectId: string, level: Level) => void;
    setBudget: (projectId: string, tokens: number) => void;
  };
}

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [store, dispatch] = useReducer(reducer, { app: SEED, hydrated: false });
  const { app: state, hydrated } = store;

  useEffect(() => {
    let next: AppState = SEED;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        if (parsed.version === SEED.version) next = { ...parsed, pmTyping: {} };
      }
    } catch {
      /* storage unavailable */
    }
    dispatch({ type: "hydrate", state: next });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, pmTyping: {} }));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  const update = useCallback((fn: (s: AppState) => AppState) => dispatch({ type: "update", fn }), []);
  const later = useCallback((ms: number, fn: (s: AppState) => AppState) => {
    setTimeout(() => dispatch({ type: "update", fn }), ms);
  }, []);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ---------- flows ----------
  const runAgentTask = useCallback(
    (projectId: string, taskId: string, delay: number, onAllDone?: () => void) => {
      later(delay, (s) => {
        const task = s.tasks.find((t) => t.id === taskId);
        if (!task || task.state === "DONE") return s;
        const room = roomOf(s, projectId, task.role);
        const agent = agentOfRole(s, projectId, task.role);
        if (!room || !agent) return s;
        let n = patchTask(s, taskId, { state: "IN_PROGRESS" });
        n = patchAgent(n, agent.id, { status: "working" });
        n = addEvent(n, { projectId, type: "task.started", actor: agent.label, summary: `${taskId} 시작` });
        n = push(n, {
          roomId: room.id,
          authorType: "agent",
          authorId: agent.id,
          text: `${taskId} ${task.title} 작업을 시작합니다. 명세와 계약을 먼저 조회했습니다.`,
          card: {
            kind: "log",
            agentId: agent.id,
            taskId,
            live: true,
            lines: [
              { kind: "mcp", text: `get_spec(${task.featureId}) → 수용 기준 수신` },
              { kind: "mcp", text: `get_contract(${task.featureId}) → 계약 수신` },
              {
                kind: "edit",
                text:
                  task.role === "FE"
                    ? "Write src/components/feature/View.tsx (+64)"
                    : "Write app/routers/feature.py (+58)",
              },
              { kind: "test", text: task.role === "FE" ? "vitest run — 2 passed" : "pytest — 4 passed" },
            ],
          },
        });
        return n;
      });
      later(delay + 2800, (s) => {
        const task = s.tasks.find((t) => t.id === taskId);
        if (!task || task.state === "DONE") return s;
        const room = roomOf(s, projectId, task.role);
        const agent = agentOfRole(s, projectId, task.role);
        if (!room || !agent) return s;
        const commit = Math.random().toString(16).slice(2, 9);
        let n: AppState = {
          ...s,
          messages: s.messages.map((m) =>
            m.card?.kind === "log" && m.card.taskId === taskId
              ? {
                  ...m,
                  card: {
                    ...m.card,
                    live: false,
                    lines: [...m.card.lines, { kind: "mcp", text: `submit_task(${taskId}, commit ${commit})` }],
                  },
                }
              : m,
          ),
        };
        n = patchTask(n, taskId, {
          state: "DONE",
          commit,
          costKrw: task.costKrw + 700 + Math.round(Math.random() * 600),
        });
        n = patchAgent(n, agent.id, { status: "online" });
        n = push(n, {
          roomId: room.id,
          authorType: "system",
          card: {
            kind: "verification",
            taskId,
            commit,
            checks: { scope: true, tests: true, commit: true },
            passed: true,
            testSummary: `${task.role === "FE" ? "vitest 2 passed" : "pytest 4 passed"} · 스코프 위반 0건 · 커밋 존재 확인`,
          },
        });
        n = addEvent(n, {
          projectId,
          type: "task.done",
          actor: "서버",
          summary: `${taskId} 검증 통과 → DONE`,
          tone: "success",
          tokens: 24000,
          costKrw: 700,
        });
        const remaining = n.tasks.filter((t) => t.projectId === projectId && t.state !== "DONE");
        if (remaining.length === 0) onAllDone?.();
        return n;
      });
    },
    [later],
  );

  const postReport = useCallback(
    (projectId: string, delay: number) => {
      later(delay, (s) => setTyping(s, roomOf(s, projectId, "OWNER")?.id ?? "", true));
      later(delay + 1800, (s) => {
        const room = roomOf(s, projectId, "OWNER");
        if (!room) return s;
        const tasks = s.tasks.filter((t) => t.projectId === projectId);
        const cost = (role: "FE" | "BE") => tasks.filter((t) => t.role === role).reduce((a, t) => a + t.costKrw, 0);
        const project = s.projects.find((p) => p.id === projectId)!;
        const roomIds = new Set(s.rooms.filter((r) => r.projectId === projectId).map((r) => r.id));
        const decisions = s.messages
          .filter((m) => roomIds.has(m.roomId) && m.card?.kind === "question" && m.card.answer)
          .map((m) => {
            const c = m.card as Extract<Card, { kind: "question" }>;
            return `${c.question.split(/[.?!？]/)[0].trim()}: ${c.answer} (${userName(s, c.answeredBy)}, ${c.adrId})`;
          });
        let n = setTyping(s, room.id, false);
        n = push(n, {
          roomId: room.id,
          authorType: "pm",
          text: "모든 태스크가 검증을 통과했습니다. 완료 보고서를 올립니다.",
          card: {
            kind: "report",
            title: `${project.name} 완료 보고`,
            done: tasks.filter((t) => t.state === "DONE").length,
            total: tasks.length,
            duration: "3시간 20분",
            cost: { FE: cost("FE"), BE: cost("BE"), PM: 900 },
            decisions: decisions.length ? decisions : ["결정 사항 없음 — 명세대로 진행"],
            checks: [
              `스코프 준수 ${tasks.length}/${tasks.length}`,
              `테스트 통과 ${tasks.length}/${tasks.length}`,
              `커밋 존재 ${tasks.length}/${tasks.length}`,
            ],
            confirmItems: ['추천 탭 문구 "이런 곡은 어때요?"', "즐겨찾기 해제 시 확인 다이얼로그 없음"],
            status: "pending",
          },
        });
        n = addEvent(n, {
          projectId,
          type: "report.created",
          actor: "PM",
          summary: "완료 보고서 생성 (Sonnet) · 9.4k 토큰",
          tokens: 9400,
          costKrw: 210,
        });
        return n;
      });
    },
    [later],
  );

  const actions = useMemo<Ctx["actions"]>(
    () => ({
      login: (username) => {
        const u = stateRef.current.users.find((x) => x.username === username.trim());
        if (!u) return null;
        update((s) => ({ ...s, session: { userId: u.id } }));
        return u;
      },
      signup: ({ username, nickname }) => {
        const u: User = {
          id: uid("u"),
          username: username.trim(),
          nickname: nickname.trim(),
          pubkey: `nomos_pk_${Math.random().toString(36).slice(2, 6)}…${Math.random().toString(36).slice(2, 6)}`,
          createdAt: now(),
        };
        update((s) => ({ ...s, users: [...s.users, u], session: { userId: u.id } }));
        return u;
      },
      logout: () => update((s) => ({ ...s, session: null })),
      connectAgent: (userId) =>
        update((s) => {
          const user = s.users.find((u) => u.id === userId);
          const existing = s.agents.find((a) => a.userId === userId);
          if (existing) return patchAgent(s, existing.id, { connected: true, status: "online" });
          const agent: Agent = {
            id: uid("a"),
            userId,
            harness: "claude-code",
            label: `${user?.nickname ?? "나"}의 Claude Code`,
            status: "online",
            lastSeen: now(),
            connected: true,
          };
          return { ...s, agents: [...s.agents, agent] };
        }),
      switchUser: (userId) => update((s) => ({ ...s, session: { userId } })),
      resetDemo: () =>
        update((s) => ({
          ...SEED,
          session:
            s.session && SEED.users.some((u) => u.id === s.session!.userId) ? s.session : { userId: SEED.users[0].id },
        })),

      createProject: ({ name, description, level, stack }) => {
        const s0 = stateRef.current;
        const ownerId = s0.session!.userId;
        const project: Project = {
          id: uid("p"),
          name,
          description,
          level,
          stack: stack || "PM이 제안 예정",
          ownerId,
          pmBudgetTokens: 2_000_000,
          pmSpentTokens: 0,
          createdAt: now(),
          inviteTokens: { FE: `${uid("inv").slice(-6)}FE`, BE: `${uid("inv").slice(-6)}BE` },
        };
        const room: Room = { id: uid("r"), projectId: project.id, type: "OWNER" };
        update((s) => {
          let n: AppState = {
            ...s,
            projects: [...s.projects, project],
            rooms: [...s.rooms, room],
            members: [
              ...s.members,
              { projectId: project.id, userId: ownerId, role: "OWNER", joinedAt: now() } as Membership,
            ],
          };
          n = addDocVersion(
            n,
            project.id,
            "CONSTITUTION",
            "헌법",
            `# ${name} 헌법\n\n> 대표만 수정할 수 있습니다.\n\n## 스택\n- ${project.stack}\n\n## 컨벤션\n- (작성 전) PM이 첫 명세와 함께 제안합니다\n\n## 금지사항\n- 다른 역할의 레포를 수정하지 않는다\n- \`.env*\`, \`*.pem\` 파일에 접근하지 않는다\n- main 브랜치에 직접 push 하지 않는다\n`,
            ownerId,
            true,
          );
          n = addDocVersion(
            n,
            project.id,
            "ADR",
            "결정기록",
            "# 결정기록 (ADR)\n\n> 아직 기록된 결정이 없습니다. 에이전트가 사람에게 질문하고 답을 받으면 자동으로 추가됩니다.\n",
            "system",
            false,
          );
          n = push(n, {
            roomId: room.id,
            authorType: "system",
            card: {
              kind: "notice",
              tone: "info",
              text: `Room 3가 열렸습니다. ${name} 프로젝트의 대표와 PM만 이 방에 있습니다.`,
            },
          });
          n = push(n, {
            roomId: room.id,
            authorType: "pm",
            text: `안녕하세요, ${name}의 PM입니다. FE·BE가 초대 링크로 참여하면 각자의 Room이 생깁니다. 준비되면 첫 요구사항을 한 문장으로 적어주세요 — 제가 명세와 태스크로 정리해 드립니다.`,
          });
          n = addEvent(n, {
            projectId: project.id,
            type: "project.created",
            actor: userName(s, ownerId),
            summary: `프로젝트 ${name} 생성 (${level}, 예산 2.0M 토큰)`,
          });
          return n;
        });
        return project;
      },

      joinProject: (token) => {
        const s0 = stateRef.current;
        const project = s0.projects.find((p) => p.inviteTokens.FE === token || p.inviteTokens.BE === token);
        if (!project || !s0.session) return null;
        const role: Role = project.inviteTokens.FE === token ? "FE" : "BE";
        const userId = s0.session.userId;
        if (memberOf(s0, project.id, role)) return { project, role };
        const room: Room = { id: uid("r"), projectId: project.id, type: role };
        update((s) => {
          let n: AppState = {
            ...s,
            members: [...s.members, { projectId: project.id, userId, role, joinedAt: now() }],
            rooms: [...s.rooms, room],
          };
          const me = s.users.find((u) => u.id === userId);
          n = push(n, {
            roomId: room.id,
            authorType: "system",
            card: {
              kind: "notice",
              tone: "info",
              text: `${me?.nickname} 님이 ${role}로 참여했습니다. Room ${role === "FE" ? 1 : 2}이 생성되고 ${role} 에이전트가 활성화됐습니다.`,
            },
          });
          n = push(n, {
            roomId: room.id,
            authorType: "pm",
            text: `${role} 레포를 연결해주세요. 브릿지는 이 경로 안에서만 에이전트를 실행합니다.`,
            card: { kind: "repo", role, status: "pending" },
          });
          const ownerRoom = roomOf(n, project.id, "OWNER");
          if (ownerRoom)
            n = push(n, {
              roomId: ownerRoom.id,
              authorType: "system",
              card: {
                kind: "notice",
                tone: "success",
                text: `${me?.nickname} 님이 ${role}로 참여했습니다. Room ${role === "FE" ? 1 : 2}이 열렸습니다.`,
              },
            });
          n = addEvent(n, {
            projectId: project.id,
            type: "member.joined",
            actor: me?.nickname ?? "",
            summary: `${role}로 참여 · Room ${role === "FE" ? 1 : 2} 생성`,
          });
          return n;
        });
        return { project, role };
      },

      connectRepo: (projectId, role, url, localPath) =>
        update((s) => {
          const repo: Repo = { id: uid("repo"), projectId, ownerRole: role, url, localPath, scopePattern: "**" };
          let n: AppState = {
            ...s,
            repos: [...s.repos.filter((r) => !(r.projectId === projectId && r.ownerRole === role)), repo],
          };
          n = {
            ...n,
            messages: n.messages.map((m) =>
              m.card?.kind === "repo" &&
              m.card.role === role &&
              s.rooms.find((r) => r.id === m.roomId)?.projectId === projectId
                ? { ...m, card: { ...m.card, status: "connected", url, localPath } }
                : m,
            ),
          };
          const room = roomOf(n, projectId, role);
          if (room)
            n = push(n, {
              roomId: room.id,
              authorType: "pm",
              text: `✓ 연결됐습니다. ${role} 에이전트는 ${localPath} 안에서만 작업합니다. 대표가 명세를 승인하면 태스크가 이 방에 도착합니다.`,
            });
          n = addEvent(n, { projectId, type: "repo.connected", actor: role, summary: `${role} 레포 연결 · ${url}` });
          return n;
        }),

      sendMessage: (roomId, text) => {
        const s0 = stateRef.current;
        const room = s0.rooms.find((r) => r.id === roomId);
        if (!room || !s0.session) return;
        const meId = s0.session.userId;
        const projectId = room.projectId;
        update((s) => push(s, { roomId, authorType: "user", authorId: meId, text }));

        const cross = isCrossScope(text);
        if (cross && room.type !== "OWNER") {
          const agent = agentOfRole(s0, projectId, room.type);
          later(500, (s) => {
            let n = push(s, {
              roomId,
              authorType: "system",
              card: {
                kind: "policy",
                actionKey: "scope:violation",
                decider: "FORBIDDEN",
                path: cross.path,
                reason: `이 경로는 ${cross.owner} 소유입니다. ${room.type} 에이전트의 스코프는 자기 레포(**)로 제한됩니다. 이벤트 로그에 기록됐습니다.`,
              },
            });
            n = addEvent(n, {
              projectId,
              type: "scope.violation",
              actor: agent?.label ?? `${room.type} 에이전트`,
              summary: `${cross.path} 수정 시도 → 거부`,
              tone: "danger",
            });
            return n;
          });
          later(1400, (s) =>
            agent
              ? push(s, {
                  roomId,
                  authorType: "agent",
                  authorId: agent.id,
                  text: `${cross.owner} 레포는 제 작업 범위 밖이라 수정할 수 없습니다. 필요하면 PM을 통해 ${cross.owner} 태스크로 요청해주세요.`,
                })
              : s,
          );
          return;
        }

        if (room.type === "OWNER") {
          const pending = s0.messages.some(
            (m) => m.roomId === roomId && m.card?.kind === "spec" && m.card.status === "pending",
          );
          if (pending) {
            later(300, (s) => setTyping(s, roomId, true));
            later(1200, (s) =>
              push(setTyping(s, roomId, false), {
                roomId,
                authorType: "pm",
                text: "확인했습니다. 위 승인 카드에서 [승인] 또는 [수정 요청]으로 결정해주시면 반영하겠습니다.",
              }),
            );
            return;
          }
          later(300, (s) => setTyping(s, roomId, true));
          later(2200, (s) => {
            let n = setTyping(s, roomId, false);
            n = push(n, {
              roomId,
              authorType: "pm",
              text: "요구사항을 기능 명세로 정리했습니다. 승인하시면 명세를 문서에 잠그고 태스크를 양쪽 Room에 동시에 전달합니다.",
              card: generateSpec(s, projectId, text),
            });
            n = addEvent(n, {
              projectId,
              type: "llm.call",
              actor: "PM",
              summary: "명세 초안 작성 (Sonnet) · 15.7k 토큰",
              tokens: 15700,
              costKrw: 350,
            });
            n = {
              ...n,
              projects: n.projects.map((p) =>
                p.id === projectId ? { ...p, pmSpentTokens: p.pmSpentTokens + 15700 } : p,
              ),
            };
            return n;
          });
          return;
        }

        const agent = agentOfRole(s0, projectId, room.type);
        if (!agent) return;
        const myTask = s0.tasks.find(
          (t) =>
            t.projectId === projectId &&
            t.role === room.type &&
            (t.state === "IN_PROGRESS" || t.state === "WAITING_HUMAN"),
        );
        later(1100, (s) =>
          push(s, {
            roomId,
            authorType: "agent",
            authorId: agent.id,
            text: myTask
              ? `확인했습니다. ${myTask.id} ${myTask.title} 작업에 반영하겠습니다. 명세(AC)와 충돌하는 부분이 있으면 PM에게 dispute를 올리겠습니다.`
              : "확인했습니다. 현재 배정된 태스크가 없어 대기 중입니다. 대표가 명세를 승인하면 바로 시작하겠습니다.",
          }),
        );
      },

      decideSpec: (messageId, decision, note) => {
        const s0 = stateRef.current;
        const msg = s0.messages.find((m) => m.id === messageId);
        if (!msg || msg.card?.kind !== "spec") return;
        const card = msg.card;
        const room = s0.rooms.find((r) => r.id === msg.roomId)!;
        const projectId = room.projectId;

        if (decision === "changes") {
          update((s) =>
            patchCard(s, messageId, (c) => (c.kind === "spec" ? { ...c, status: "changes_requested" } : c)),
          );
          update((s) =>
            push(s, {
              roomId: room.id,
              authorType: "user",
              authorId: s.session!.userId,
              text: `수정 요청: ${note || "세부 사항을 다듬어주세요"}`,
            }),
          );
          later(300, (s) => setTyping(s, room.id, true));
          later(1800, (s) => {
            let n = setTyping(s, room.id, false);
            const revised: Card = {
              ...card,
              version: card.version + 1,
              revisions: card.revisions + 1,
              status: "pending",
              features: card.features.map((f, i) =>
                i === 0 ? { ...f, acs: [...f.acs, `(수정 반영) ${note || "세부 사항 보강"}`] } : f,
              ),
            };
            n = push(n, {
              roomId: room.id,
              authorType: "pm",
              text: `수정 요청을 반영해 명세 v${card.version + 1}을 다시 올립니다. (수정 ${card.revisions + 1}/3)`,
              card: revised,
            });
            n = addEvent(n, {
              projectId,
              type: "approval.rejected",
              actor: userName(s, s.session?.userId),
              summary: `명세 v${card.version} 수정 요청`,
              tone: "warn",
            });
            return n;
          });
          return;
        }

        update((s) => {
          let n = patchCard(s, messageId, (c) => (c.kind === "spec" ? { ...c, status: "approved" } : c));
          const specVersion = (latestDoc(n, projectId, "SPEC")?.version ?? 0) + 1;
          const contractVersion = (latestDoc(n, projectId, "CONTRACT")?.version ?? 0) + 1;
          const newTasks: Task[] = card.tasks
            .filter((t) => !n.tasks.some((x) => x.id === t.id && x.projectId === projectId))
            .map((t, i) => ({
              id: t.id,
              projectId,
              featureId: card.features[Math.min(Math.floor(i / 2), card.features.length - 1)].id,
              title: t.title,
              role: t.role,
              state: "READY",
              specRef: `SPEC v${specVersion}`,
              contractRef: `CONTRACT v${contractVersion}`,
              createdAt: now(),
              updatedAt: now(),
              costKrw: 0,
            }));
          n = { ...n, tasks: [...n.tasks, ...newTasks] };
          const specMd = `# 명세 v${specVersion} — ${card.title}\n\n> 상태: **LOCKED** · 승인: ${userName(s, s.session?.userId)} (대표)\n\n${card.features.map((f) => `## ${f.id} ${f.title}\n${f.acs.map((a, i) => `- AC${i + 1}: ${a}`).join("\n")}`).join("\n\n")}\n\n## 태스크\n| ID | 역할 | 제목 |\n| --- | --- | --- |\n${card.tasks.map((t) => `| ${t.id} | ${t.role} | ${t.title} |`).join("\n")}\n`;
          const contractMd = `# 계약 v${contractVersion} — ${card.title}\n\n> 양쪽 Room에 동일한 텍스트로 전달됩니다.\n\n\`\`\`\n${card.contract.join("\n")}\n\`\`\`\n`;
          n = addDocVersion(n, projectId, "SPEC", card.title, specMd, "pm", true);
          n = addDocVersion(n, projectId, "CONTRACT", card.title, contractMd, "pm", true);
          n = push(n, {
            roomId: room.id,
            authorType: "pm",
            text: `승인됐습니다. 명세를 v${specVersion}으로 저장하고(LOCKED), 계약 초안과 함께 태스크 ${card.tasks.length}개를 Room 1·2에 동시에 전달합니다.`,
          });
          n = push(n, {
            roomId: room.id,
            authorType: "system",
            card: {
              kind: "notice",
              tone: "success",
              text: `명세 v${specVersion} · 계약 v${contractVersion} 저장됨 — 문서 페이지에서 확인할 수 있습니다.`,
            },
          });
          n = addEvent(n, {
            projectId,
            type: "approval.granted",
            actor: userName(s, s.session?.userId),
            summary: `명세 v${specVersion} 승인 → LOCKED`,
            tone: "success",
          });
          n = addEvent(n, {
            projectId,
            type: "task.assigned",
            actor: "PM",
            summary: `${card.tasks
              .filter((t) => t.role === "BE")
              .map((t) => t.id)
              .join("·")} → BE, ${card.tasks
              .filter((t) => t.role === "FE")
              .map((t) => t.id)
              .join("·")} → FE 동시 분배`,
          });
          for (const role of ["FE", "BE"] as const) {
            const r = roomOf(n, projectId, role);
            const ids = card.tasks.filter((t) => t.role === role).map((t) => t.id);
            if (r && ids.length) {
              n = push(n, {
                roomId: r.id,
                authorType: "pm",
                text: `대표 승인이 완료되어 ${role} 태스크 ${ids.length}개를 전달합니다. 명세와 API 계약을 첨부했습니다 — ${role === "FE" ? "BE" : "FE"} 에이전트도 같은 계약 텍스트를 받았습니다.`,
                card: {
                  kind: "dispatch",
                  taskIds: ids,
                  specRef: `SPEC v${specVersion}`,
                  contractRef: `CONTRACT v${contractVersion}`,
                },
              });
            } else if (ids.length) {
              n = push(n, {
                roomId: room.id,
                authorType: "system",
                card: {
                  kind: "notice",
                  tone: "warn",
                  text: `${role}가 아직 참여하지 않아 ${ids.join(", ")}는 QUEUED 상태로 대기합니다.`,
                },
              });
              n = {
                ...n,
                tasks: n.tasks.map((t) =>
                  ids.includes(t.id) && t.projectId === projectId ? { ...t, state: "QUEUED" } : t,
                ),
              };
            }
          }
          return n;
        });
        const ids = card.tasks.map((t) => t.id);
        ids.forEach((id, i) => runAgentTask(projectId, id, 1500 + i * 2200, () => postReport(projectId, 800)));
      },

      answerQuestion: (messageId, answer) => {
        const s0 = stateRef.current;
        const msg = s0.messages.find((m) => m.id === messageId);
        if (!msg || msg.card?.kind !== "question" || !s0.session) return;
        const card = msg.card;
        const room = s0.rooms.find((r) => r.id === msg.roomId)!;
        const projectId = room.projectId;
        const meId = s0.session.userId;
        const adrNo = `ADR-${pad((latestDoc(s0, projectId, "ADR")?.content.match(/## ADR-/g)?.length ?? 0) + 1)}`;
        update((s) => {
          let n = patchCard(s, messageId, (c) =>
            c.kind === "question" ? { ...c, answer, answeredBy: meId, adrId: adrNo } : c,
          );
          n = patchTask(n, card.taskId, { state: "IN_PROGRESS" });
          const adr = latestDoc(n, projectId, "ADR");
          const body = `${adr?.content ?? "# 결정기록 (ADR)\n"}\n## ${adrNo} ${card.question.replace(/[?？]/g, "")}\n\n- 결정자: ${userName(s, meId)} (${room.type})\n- 답: **${answer}**\n- 맥락: ${card.context}\n`;
          n = addDocVersion(n, projectId, "ADR", "결정기록", body, "system", false);
          n = push(n, {
            roomId: room.id,
            authorType: "system",
            card: {
              kind: "notice",
              tone: "success",
              text: `${adrNo} 저장됨 — "${answer}" (결정자: ${userName(s, meId)}). ${card.taskId} 재개.`,
            },
          });
          n = addEvent(n, {
            projectId,
            type: "task.resumed",
            actor: userName(s, meId),
            summary: `${card.taskId} 질의 응답 → ${adrNo} 저장, 에이전트 재기동`,
            tone: "success",
          });
          const ownerRoom = roomOf(n, projectId, "OWNER");
          if (ownerRoom)
            n = push(n, {
              roomId: ownerRoom.id,
              authorType: "pm",
              text: `${userName(s, meId)} 님이 ${card.taskId}의 결정을 내렸습니다 (${adrNo}: ${answer}). 에이전트가 재개됐습니다.`,
            });
          return n;
        });
        runAgentTask(projectId, card.taskId, 900, () => postReport(projectId, 800));
        const others = s0.tasks.filter((t) => t.projectId === projectId && t.id !== card.taskId && t.state !== "DONE");
        others.forEach((t, i) => runAgentTask(projectId, t.id, 4200 + i * 2600, () => postReport(projectId, 800)));
      },

      decideReport: (messageId, decision, note) => {
        const s0 = stateRef.current;
        const msg = s0.messages.find((m) => m.id === messageId);
        if (!msg || msg.card?.kind !== "report") return;
        const room = s0.rooms.find((r) => r.id === msg.roomId)!;
        const projectId = room.projectId;
        if (decision === "approve") {
          update((s) => {
            let n = patchCard(s, messageId, (c) => (c.kind === "report" ? { ...c, status: "approved" } : c));
            n = push(n, {
              roomId: room.id,
              authorType: "pm",
              text: "보고서가 승인됐습니다. 각 레포의 PR 머지는 사람이 직접 합니다 (git:merge_main은 항상 사람). 다음 요구사항을 적어주시면 이어서 진행하겠습니다.",
            });
            n = addEvent(n, {
              projectId,
              type: "approval.granted",
              actor: userName(s, s.session?.userId),
              summary: "완료 보고서 승인",
              tone: "success",
            });
            return n;
          });
          return;
        }
        const target =
          s0.tasks.filter((t) => t.projectId === projectId && t.role === "FE").slice(-1)[0] ??
          s0.tasks.filter((t) => t.projectId === projectId).slice(-1)[0];
        update((s) => {
          let n = patchCard(s, messageId, (c) => (c.kind === "report" ? { ...c, status: "changes_requested" } : c));
          n = push(n, {
            roomId: room.id,
            authorType: "user",
            authorId: s.session!.userId,
            text: `수정 요청: ${note || "추천 문구 바꿔줘"}`,
          });
          n = push(n, {
            roomId: room.id,
            authorType: "pm",
            text: `피드백을 읽고 관련 태스크 ${target.id}만 다시 열었습니다 (전체 롤백 아님). 완료되면 보고서를 갱신하겠습니다.`,
          });
          n = patchTask(n, target.id, { state: "IN_PROGRESS" });
          const r = roomOf(n, projectId, target.role);
          if (r)
            n = push(n, {
              roomId: r.id,
              authorType: "pm",
              text: `대표 피드백으로 ${target.id}를 재개방합니다: "${note || "추천 문구 바꿔줘"}"`,
              card: {
                kind: "dispatch",
                taskIds: [target.id],
                specRef: target.specRef,
                contractRef: target.contractRef ?? "",
              },
            });
          n = addEvent(n, {
            projectId,
            type: "task.reopened",
            actor: "PM",
            summary: `${target.id} 재개방 (대표 수정 요청)`,
            tone: "warn",
          });
          return n;
        });
        runAgentTask(projectId, target.id, 1200, () => postReport(projectId, 600));
      },

      setLevel: (projectId, level) =>
        update((s) => {
          let n: AppState = { ...s, projects: s.projects.map((p) => (p.id === projectId ? { ...p, level } : p)) };
          n = addEvent(n, {
            projectId,
            type: "policy.changed",
            actor: userName(s, s.session?.userId),
            summary: `허용 레벨 → ${level} (정책표 갱신)`,
          });
          return n;
        }),
      setBudget: (projectId, tokens) =>
        update((s) => ({
          ...s,
          projects: s.projects.map((p) => (p.id === projectId ? { ...p, pmBudgetTokens: tokens } : p)),
        })),
    }),
    [update, later, runAgentTask, postReport],
  );

  const me = useMemo(
    () => (state.session ? (state.users.find((u) => u.id === state.session!.userId) ?? null) : null),
    [state.session, state.users],
  );

  const value = useMemo<Ctx>(() => ({ state, hydrated, me, actions }), [state, hydrated, me, actions]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

// ---------- selectors ----------
export function useProject(projectId: string) {
  const { state, me } = useApp();
  const project = state.projects.find((p) => p.id === projectId) ?? null;
  const members = state.members.filter((m) => m.projectId === projectId);
  const myRole: Role | null = me ? (members.find((m) => m.userId === me.id)?.role ?? null) : null;
  const rooms = state.rooms.filter((r) => r.projectId === projectId);
  const visibleRooms = rooms.filter((r) => myRole === "OWNER" || r.type === myRole);
  const tasks = state.tasks.filter((t) => t.projectId === projectId && (myRole === "OWNER" || t.role === myRole));
  const canWrite = (room: Room) => (myRole === "OWNER" ? room.type === "OWNER" : room.type === myRole);
  const agentFor = (role: "FE" | "BE") => {
    const m = members.find((x) => x.role === role);
    return m ? (state.agents.find((a) => a.userId === m.userId) ?? null) : null;
  };
  const userFor = (role: Role) => {
    const m = members.find((x) => x.role === role);
    return m ? (state.users.find((u) => u.id === m.userId) ?? null) : null;
  };
  const repos = state.repos.filter((r) => r.projectId === projectId);
  const docs = state.documents.filter((d) => d.projectId === projectId);
  const events = state.events.filter((e) => e.projectId === projectId);
  return { project, members, myRole, rooms, visibleRooms, tasks, canWrite, agentFor, userFor, repos, docs, events };
}
