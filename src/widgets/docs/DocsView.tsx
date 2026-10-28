"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { errorMessage, type Schemas } from "@/shared/api";
import { Badge, Button, EmptyState, Markdown } from "@/shared/ui";
import { useQueryParam } from "@/shared/lib/useQueryParam";
import { cn, fmtDateTime } from "@/shared/lib/format";
import { ContractCard, useContracts } from "@/entities/contract";
import type { DocType } from "@/entities/document";
import { NOTE_KIND, NoteItem, useNotes, type NoteKind } from "@/entities/note";
import { ROLE_ROOM } from "@/entities/room";
import { DECISIONS_MAX, useDecisions } from "@/entities/question";
import { useSpecs } from "@/entities/spec";

// NOTES는 에이전트가 남긴 인계 노트 — 문서 서버가 에이전트에게 함께 주는 기록이라 여기서 읽는다.
// 문서 목록은 앱 사이드바에 있어 여기서는 다시 그리지 않는다. 헌법은 쓰지 않는다
const TYPES: { slug: string; type: Exclude<DocType, "CONSTITUTION"> | "NOTES"; who: string }[] = [
  { slug: "spec", type: "SPEC", who: "쓰기: PM (대표 승인 후)" },
  { slug: "contract", type: "CONTRACT", who: "쓰기: BE 에이전트 · 확정: BE 담당" },
  { slug: "adr", type: "ADR", who: "쓰기: 질문에 답하면 자동" },
  { slug: "notes", type: "NOTES", who: "쓰기: 에이전트" },
];

/** 명세·계약·결정기록·인계 노트. 모르는 slug(예전 헌법 주소 포함)는 명세로 */
export function DocsView({ projectId, slug }: { projectId: string; slug: string }) {
  const specs = useSpecs(projectId);
  const contracts = useContracts(projectId);
  const current = TYPES.find((t) => t.slug === slug) ?? TYPES[0];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[820px] px-4 py-6 sm:px-8">
        {current.type === "SPEC" ? (
          <SpecDocs specs={specs} who={current.who} />
        ) : current.type === "CONTRACT" ? (
          <ContractDocs projectId={projectId} contracts={contracts} />
        ) : current.type === "ADR" ? (
          <DecisionDocs projectId={projectId} />
        ) : (
          <NoteDocs projectId={projectId} />
        )}
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
