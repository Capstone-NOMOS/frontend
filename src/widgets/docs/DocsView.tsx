"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, FileText, History, Loader2, Lock, NotebookPen, TerminalSquare } from "lucide-react";
import { errorMessage, type Schemas } from "@/shared/api";
import { Badge, Button, EmptyState, Markdown, MockBadge } from "@/shared/ui";
import { useQueryParam } from "@/shared/lib/useQueryParam";
import { cn, fmtDateTime } from "@/shared/lib/format";
import { ContractCard, useContracts } from "@/entities/contract";
import type { DocType } from "@/entities/document";
import { NOTE_KIND, NoteItem, useNotes, type NoteKind } from "@/entities/note";
import { ROLE_ROOM } from "@/entities/room";
import { DECISIONS_MAX, useDecisions } from "@/entities/question";
import { useSpecs } from "@/entities/spec";
import { useProject } from "@/lib/store";

// NOTES는 에이전트가 남긴 인계 노트 — 문서 서버가 에이전트에게 함께 주는 기록이라 여기서 읽는다
const TYPES: { slug: string; type: DocType | "NOTES"; label: string; who: string; icon: React.ReactNode }[] = [
  { slug: "constitution", type: "CONSTITUTION", label: "헌법", who: "쓰기: 대표만", icon: <BookOpen size={15} /> },
  { slug: "spec", type: "SPEC", label: "명세", who: "쓰기: PM (대표 승인 후)", icon: <FileText size={15} /> },
  {
    slug: "contract",
    type: "CONTRACT",
    label: "API 계약",
    who: "쓰기: BE 에이전트 · 확정: BE 담당",
    icon: <FileText size={15} />,
  },
  { slug: "adr", type: "ADR", label: "결정기록", who: "쓰기: 질문에 답하면 자동", icon: <FileText size={15} /> },
  { slug: "notes", type: "NOTES", label: "인계 노트", who: "쓰기: 에이전트", icon: <NotebookPen size={15} /> },
];

const TOOLS = [
  ["get_constitution()", "헌법 조회"],
  ["get_spec(feature_id)", "기능 명세 조회 — 해당 기능만"],
  ["get_contract(feature_id)", "API 계약 조회"],
  ["search_decisions(query)", "결정기록 검색"],
  ["ask_human(question, options, context)", "담당 개발자에게 질의 → WAITING_HUMAN"],
  ["submit_task(task_id, commit)", "완료 제출 → 검증"],
  ["report_blocker(task_id, reason)", "막힘 신고"],
];

/** 명세·계약·결정기록·인계 노트는 API, 헌법은 API가 없어 목업 스토어를 읽는다 */
export function DocsView({ projectId, slug }: { projectId: string; slug: string }) {
  const { docs } = useProject(projectId);
  const specs = useSpecs(projectId);
  const contracts = useContracts(projectId);
  const current = TYPES.find((t) => t.slug === slug) ?? TYPES[1];
  const [sel, setSel] = useState<number | null>(null);

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* nav */}
      <nav className="shrink-0 border-b border-ink-200 lg:w-[240px] lg:border-b-0 lg:border-r">
        <div className="hidden px-5 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-wide text-ink-500 lg:block">
          MCP 문서 서버
        </div>
        <ul className="flex gap-1 overflow-x-auto px-3 py-2 no-scrollbar lg:flex-col lg:px-3 lg:py-0">
          {TYPES.map((t) => {
            const latest = docs.filter((d) => d.type === t.type).sort((a, b) => b.version - a.version)[0];
            const active = t.slug === current.slug;
            return (
              <li key={t.slug} className="shrink-0">
                <Link
                  href={`/p/${projectId}/docs/${t.slug}`}
                  onClick={() => setSel(null)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13.5px] font-medium",
                    active ? "bg-ink-100 text-ink-900" : "text-ink-600 hover:bg-ink-50",
                  )}
                >
                  <span className="text-ink-500">{t.icon}</span>
                  <span className="flex-1">{t.label}</span>
                  {t.type === "SPEC"
                    ? specs.data && <span className="text-[11px] text-ink-400">{specs.data.length}개</span>
                    : t.type === "CONTRACT"
                      ? contracts.data && (
                          <span className="text-[11px] text-ink-400">
                            {contracts.data.filter((c) => c.status === "approved").length}/{contracts.data.length}
                          </span>
                        )
                      : t.type !== "ADR" &&
                        latest && <span className="text-[11px] text-ink-400">v{latest.version}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="hidden px-5 pb-5 pt-4 lg:block">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
            <TerminalSquare size={12} /> MCP 도구
          </div>
          <ul className="space-y-1.5">
            {TOOLS.map(([sig, desc]) => (
              <li key={sig} className="text-[11.5px] leading-snug">
                <code className="rounded bg-ink-100 px-1 py-0.5 font-mono text-[10.5px] text-ink-800">{sig}</code>
                <div className="mt-0.5 text-ink-500">{desc}</div>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* content */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[820px] px-4 py-6 sm:px-8">
          {current.type === "SPEC" ? (
            <SpecDocs specs={specs} who={current.who} />
          ) : current.type === "CONTRACT" ? (
            <ContractDocs projectId={projectId} contracts={contracts} />
          ) : current.type === "ADR" ? (
            <DecisionDocs projectId={projectId} />
          ) : current.type === "NOTES" ? (
            <NoteDocs projectId={projectId} />
          ) : (
            <MockDoc projectId={projectId} current={current} sel={sel} onSelect={setSel} />
          )}

          <div className="mt-8 rounded-xl border border-ink-200 bg-ink-50 p-4 lg:hidden">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              <TerminalSquare size={12} /> MCP 도구
            </div>
            <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {TOOLS.map(([sig, desc]) => (
                <li key={sig} className="text-[11.5px]">
                  <code className="rounded bg-white px-1 py-0.5 font-mono text-[10.5px]">{sig}</code>{" "}
                  <span className="text-ink-500">{desc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecDocs({ specs, who }: { specs: ReturnType<typeof useSpecs>; who: string }) {
  if (specs.isPending) {
    return (
      <div className="flex justify-center py-10 text-ink-400" aria-busy="true">
        <Loader2 size={20} className="animate-spin" aria-label="불러오는 중" />
      </div>
    );
  }
  if (specs.isError) return <EmptyState title={errorMessage(specs.error)} />;
  if (specs.data.length === 0) {
    return (
      <EmptyState
        title="명세가 아직 없습니다"
        desc="대표가 대표 룸에서 PM의 계획 초안을 승인하면 명세와 태스크가 함께 생깁니다."
      />
    );
  }

  return (
    <>
      <div className="border-b border-ink-100 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[20px] font-semibold tracking-tight">명세</h1>
          <Badge tone="brand">{specs.data.length}개</Badge>
        </div>
        <div className="mt-1 text-[12.5px] text-ink-500">{who} · 기능 키(featureKey) 순</div>
        {specs.data.length > 1 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {specs.data.map((s) => (
              <li key={s.id}>
                <a
                  href={`#spec-${s.featureKey}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2 py-1 text-[12px] hover:bg-ink-50"
                >
                  <span className="font-mono text-brand-600">{s.featureKey}</span>
                  <span className="max-w-[180px] truncate text-ink-700">{s.title}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="divide-y divide-ink-100">
        {specs.data.map((s) => (
          <SpecSection key={s.id} spec={s} />
        ))}
      </div>
    </>
  );
}

/** 새 계획 흐름 2단계. 문서는 읽기 전용이다 — 확정·수정 요청은 BE 룸에서 한다 (adr/0013) */
function ContractDocs({ projectId, contracts }: { projectId: string; contracts: ReturnType<typeof useContracts> }) {
  if (contracts.isPending) {
    return (
      <div className="flex justify-center py-10 text-ink-400" aria-busy="true">
        <Loader2 size={20} className="animate-spin" aria-label="불러오는 중" />
      </div>
    );
  }
  if (contracts.isError) return <EmptyState title={errorMessage(contracts.error)} />;
  if (contracts.data.length === 0) {
    return (
      <EmptyState
        title="API 계약이 아직 없습니다"
        desc="대표가 대표 룸에서 기능 명세를 확정하면, 서버 API가 필요한 기능마다 계약이 생기고 BE 에이전트가 초안을 씁니다."
      />
    );
  }
  const approved = contracts.data.filter((c) => c.status === "approved").length;

  return (
    <>
      <div className="border-b border-ink-100 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[20px] font-semibold tracking-tight">API 계약</h1>
          <Badge tone={approved === contracts.data.length ? "success" : "warn"}>
            {approved}/{contracts.data.length} 확정
          </Badge>
        </div>
        <p className="mt-1 text-[12.5px] text-ink-500">
          확정·수정 요청은{" "}
          <Link
            href={`/p/${projectId}/rooms/${ROLE_ROOM.BACKEND.slug}`}
            className="font-medium underline underline-offset-2"
          >
            BE 룸
          </Link>
          에서 합니다(BE 담당, 없으면 대표). 모두 확정돼야 태스크를 나눌 수 있습니다.
        </p>
      </div>
      <div className="mt-4 space-y-3">
        {contracts.data.map((c) => (
          <ContractCard key={c.id} projectId={projectId} contract={c} canDecide={false} />
        ))}
      </div>
    </>
  );
}

function SpecSection({ spec: s }: { spec: Schemas["Spec"] }) {
  return (
    <section id={`spec-${s.featureKey}`} className="scroll-mt-4 py-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[13px] font-semibold text-brand-600">{s.featureKey}</span>
        <h2 className="text-[16px] font-semibold">{s.title}</h2>
        <Badge>v{s.version}</Badge>
        {s.needsApi && <Badge tone="info">API 필요</Badge>}
        <span className="text-[12px] text-ink-500">{fmtDateTime(s.createdAt)}</span>
      </div>
      {s.needsApi && s.apiNeeds && (
        <p className="mt-2 rounded-lg bg-review-bg px-3 py-2 text-[12.5px] text-ink-700">
          <span className="font-medium text-review">오가야 하는 데이터</span> · {s.apiNeeds}
        </p>
      )}
      <div className="pt-3">
        <Markdown content={s.content} />
      </div>
      <div className="mt-4">
        <h3 className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">
          수용 기준 · 시험지 {s.tests.length}개
        </h3>
        {s.tests.length === 0 ? (
          <p className="mt-1.5 text-[12.5px] text-ink-500">시험지가 없습니다. 제출 검증의 V2(테스트)는 건너뜁니다.</p>
        ) : (
          <ul className="mt-1.5 space-y-1.5">
            {s.tests.map((t) => (
              <li key={t.id} className="rounded-lg border border-ink-200 px-3 py-2 text-[13px]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1">{t.criterion}</span>
                  {t.lockedAt ? (
                    <Badge tone="neutral">
                      <Lock size={10} /> 잠김 · {fmtDateTime(t.lockedAt)}
                    </Badge>
                  ) : (
                    <Badge tone="warn">잠기지 않음 · V2 근거 아님</Badge>
                  )}
                </div>
                <details className="mt-1">
                  <summary className="cursor-pointer text-[12px] text-ink-500">시험 코드</summary>
                  <pre className="mt-1 max-h-60 overflow-auto rounded-lg bg-ink-50 p-2.5 font-mono text-[11.5px]">
                    {t.testCode}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function MockDoc({
  projectId,
  current,
  sel,
  onSelect,
}: {
  projectId: string;
  current: (typeof TYPES)[number];
  sel: number | null;
  onSelect: (version: number) => void;
}) {
  const { docs, project } = useProject(projectId);
  const versions = docs.filter((d) => d.type === current.type).sort((a, b) => b.version - a.version);
  const doc = versions.find((v) => v.version === sel) ?? versions[0];

  // 실제 프로젝트는 목업 데이터가 없다. API가 생기면 명세처럼 바꾼다
  if (!project) {
    return (
      <EmptyState
        title={`${current.label} API 연결 전입니다`}
        desc="이 문서는 아직 서버 API가 없어 볼 수 없습니다. 명세 탭은 실제 데이터입니다."
        action={<MockBadge />}
      />
    );
  }
  if (!doc) {
    return (
      <EmptyState
        title={`${current.label} 문서가 아직 없습니다`}
        desc={
          current.type === "CONTRACT"
            ? "대표가 대표 룸에서 명세를 승인하면 v1이 저장됩니다."
            : "에이전트가 사람에게 질문하고 답을 받으면 자동으로 추가됩니다."
        }
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-ink-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[20px] font-semibold tracking-tight">{current.label}</h1>
            <Badge tone="brand">v{doc.version}</Badge>
            {doc.locked && (
              <Badge tone="neutral">
                <Lock size={10} /> LOCKED
              </Badge>
            )}
            <MockBadge />
          </div>
          <div className="mt-1 text-[12.5px] text-ink-500">
            {doc.title} · {current.who} · {fmtDateTime(doc.createdAt)}
          </div>
        </div>
        {versions.length > 1 && (
          <label className="flex items-center gap-2 text-[12.5px] text-ink-600">
            <History size={14} className="text-ink-400" />
            <select
              value={doc.version}
              onChange={(e) => onSelect(Number(e.target.value))}
              className="h-8 rounded-lg border border-ink-200 bg-white px-2 text-[12.5px]"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.version}>
                  v{v.version} · {fmtDateTime(v.createdAt)}
                  {v.version === versions[0].version ? " (최신)" : ""}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {doc.version !== versions[0].version && (
        <div className="mt-3 rounded-lg border border-human bg-human-bg px-3 py-2 text-[12.5px] text-human">
          이전 버전(v{doc.version})을 보고 있습니다. 최신은 v{versions[0].version}이며, 이 버전을 참조하던 태스크에는
          갱신 알림이 갔습니다.
        </div>
      )}
      <div className="pt-5">
        <Markdown content={doc.content} />
      </div>
    </>
  );
}

/** 에이전트가 남긴 인계 노트. 노트는 자기 보고이며, 검증 결과는 태스크 상세에서 확인한다 */
function NoteDocs({ projectId }: { projectId: string }) {
  const notes = useNotes(projectId);
  // 뒤로가기로 돌아와도 보던 종류가 남도록 주소에 둔다
  const [kind, setKind] = useQueryParam("kind", Object.keys(NOTE_KIND) as NoteKind[]);
  const list = (notes.data ?? []).filter((n) => !kind || n.kind === kind);

  return (
    <>
      <div className="border-b border-ink-100 pb-4">
        <h1 className="text-[20px] font-semibold tracking-tight">인계 노트</h1>
        <p className="mt-1 text-[12.5px] text-ink-500">
          에이전트가 남긴 자기 보고입니다. 검증 결과는 태스크 상세에서 확인합니다.
        </p>
      </div>
      <div className="mb-3 mt-4 flex flex-wrap gap-1.5">
        {([null, ...(Object.keys(NOTE_KIND) as NoteKind[])] as const).map((k) => (
          <button
            key={k ?? "all"}
            onClick={() => setKind(k)}
            className={cn(
              "h-7 rounded-full border px-2.5 text-[12px] font-medium",
              kind === k ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600 hover:bg-ink-50",
            )}
          >
            {k ? NOTE_KIND[k].label : "전체"}
          </button>
        ))}
      </div>
      {notes.isPending ? (
        <div className="flex justify-center py-10 text-ink-400" aria-busy="true">
          <Loader2 size={20} className="animate-spin" aria-label="불러오는 중" />
        </div>
      ) : notes.isError ? (
        <EmptyState title={errorMessage(notes.error)} />
      ) : (
        <ol className="card divide-y divide-ink-100">
          {list.map((n) => (
            <li key={n.id} className="px-4 py-3">
              <NoteItem note={n} notes={notes.data} />
            </li>
          ))}
          {list.length === 0 && <li className="px-4 py-8 text-center text-[13px] text-ink-500">노트가 없습니다</li>}
        </ol>
      )}
    </>
  );
}

const DECISION_ROLES = ["FRONTEND", "BACKEND", "PM"] as const;
const ROLE_LABEL = { FRONTEND: "FE", BACKEND: "BE", PM: "PM" } as const;
const DECISION_PAGE = 50;

/** 에이전트가 물은 질문에 누가 무엇을 골랐는지. 확정된 결정은 서버가 관련 태스크의 에이전트에게 전달한다 */
function DecisionDocs({ projectId }: { projectId: string }) {
  const [role, setRole] = useQueryParam("role", DECISION_ROLES);
  const [limit, setLimit] = useState(DECISION_PAGE);
  const decisions = useDecisions(projectId, role, limit);
  // 받은 줄이 요청한 만큼 꽉 찼으면 더 있을 수 있다
  const hasMore = decisions.data?.length === limit && limit < DECISIONS_MAX;

  return (
    <>
      <div className="border-b border-ink-100 pb-4">
        <h1 className="text-[20px] font-semibold tracking-tight">결정기록</h1>
        <p className="mt-1 text-[12.5px] text-ink-500">
          에이전트가 물은 질문에 정해진 답입니다. 사람이 정한 결정은 관련 태스크의 에이전트에게 전달됩니다(PM 결정은
          모든 태스크, FE·BE 결정은 같은 기능의 태스크).
        </p>
      </div>
      <div className="mb-3 mt-4 flex flex-wrap gap-1.5">
        {([null, ...DECISION_ROLES] as const).map((r) => (
          <button
            key={r ?? "all"}
            onClick={() => {
              setRole(r);
              setLimit(DECISION_PAGE);
            }}
            className={cn(
              "h-7 rounded-full border px-2.5 text-[12px] font-medium",
              role === r ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600 hover:bg-ink-50",
            )}
          >
            {r ? ROLE_LABEL[r] : "전체"}
          </button>
        ))}
      </div>
      {decisions.isPending ? (
        <div className="flex justify-center py-10 text-ink-400" aria-busy="true">
          <Loader2 size={20} className="animate-spin" aria-label="불러오는 중" />
        </div>
      ) : decisions.isError ? (
        <EmptyState title={errorMessage(decisions.error)} />
      ) : (
        <ol className="card divide-y divide-ink-100">
          {decisions.data.map((d) => (
            <li key={d.id} className="px-4 py-3">
              <DecisionItem projectId={projectId} decision={d} />
            </li>
          ))}
          {decisions.data.length === 0 && (
            <li className="px-4 py-8 text-center text-[13px] text-ink-500">
              아직 결정이 없습니다. 에이전트가 질문하고 답을 받으면 여기에 쌓입니다.
            </li>
          )}
        </ol>
      )}
      {hasMore && (
        <div className="mt-3 flex justify-center">
          <Button
            variant="outline"
            disabled={decisions.isFetching}
            onClick={() => setLimit((n) => Math.min(n + DECISION_PAGE, DECISIONS_MAX))}
          >
            {decisions.isFetching ? <Loader2 size={14} className="animate-spin" /> : null}더 보기
          </Button>
        </div>
      )}
    </>
  );
}

function DecisionItem({ projectId, decision: d }: { projectId: string; decision: Schemas["QuestionDecision"] }) {
  return (
    <details>
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 text-[13px]">
        <span className="min-w-0 flex-1">{d.summary}</span>
        {d.decidedBy?.kind === "user" && <Badge tone="brand">사람이 정함</Badge>}
        {d.decidedBy?.kind === "agent" && <Badge tone="info">에이전트가 코드에서 찾음</Badge>}
        {d.answeredAt && <span className="text-[11.5px] text-ink-400">{fmtDateTime(d.answeredAt)}</span>}
      </summary>
      <div className="mt-2 space-y-2 rounded-lg bg-ink-50 px-3 py-2.5 text-[12.5px]">
        <div className="font-medium text-ink-800">{d.question}</div>
        {d.options.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {d.options.map((o) => (
              <li key={o}>
                <Badge tone={o === d.answer ? "success" : "neutral"}>{o}</Badge>
              </li>
            ))}
          </ul>
        )}
        <div>
          {d.answerSource === "human_override" && d.draftAnswer ? (
            <>
              초안 <span className="text-ink-500 line-through">{d.draftAnswer}</span> → 최종{" "}
              <span className="font-medium">{d.answer}</span>
            </>
          ) : (
            <>
              답 <span className="font-medium">{d.answer ?? "없음"}</span>
            </>
          )}
        </div>
        <div className="text-ink-500">
          <Link href={`/p/${projectId}/tasks/${d.taskId}`} className="underline underline-offset-2">
            {d.taskTitle}
          </Link>{" "}
          · {d.askedByAgentName} · {fmtDateTime(d.askedAt)}
        </div>
      </div>
    </details>
  );
}
