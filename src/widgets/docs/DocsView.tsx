"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, FileText, History, Loader2, Lock, TerminalSquare } from "lucide-react";
import { errorMessage, type Schemas } from "@/shared/api";
import { Badge, EmptyState, Markdown, MockBadge } from "@/shared/ui";
import { cn, fmtDateTime } from "@/shared/lib/format";
import type { DocType } from "@/entities/document";
import { useSpecs } from "@/entities/spec";
import { useProject } from "@/lib/store";

const TYPES: { slug: string; type: DocType; label: string; who: string; icon: React.ReactNode }[] = [
  { slug: "constitution", type: "CONSTITUTION", label: "헌법", who: "쓰기: 대표만", icon: <BookOpen size={15} /> },
  { slug: "spec", type: "SPEC", label: "명세", who: "쓰기: PM (대표 승인 후)", icon: <FileText size={15} /> },
  { slug: "contract", type: "CONTRACT", label: "계약", who: "쓰기: PM (대표 승인 후)", icon: <FileText size={15} /> },
  { slug: "adr", type: "ADR", label: "결정기록", who: "쓰기: 서버 자동 (추가만)", icon: <FileText size={15} /> },
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

/** 명세는 API(`GET /projects/{id}/specs`), 헌법·계약·결정기록은 API가 없어 목업 스토어를 읽는다 */
export function DocsView({ projectId, slug }: { projectId: string; slug: string }) {
  const { docs } = useProject(projectId);
  const specs = useSpecs(projectId);
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
                    : latest && <span className="text-[11px] text-ink-400">v{latest.version}</span>}
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
        desc="대표가 Room 3에서 PM의 계획 초안을 승인하면 명세와 태스크가 함께 생깁니다."
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

function SpecSection({ spec: s }: { spec: Schemas["Spec"] }) {
  return (
    <section id={`spec-${s.featureKey}`} className="scroll-mt-4 py-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[13px] font-semibold text-brand-600">{s.featureKey}</span>
        <h2 className="text-[16px] font-semibold">{s.title}</h2>
        <Badge>v{s.version}</Badge>
        <span className="text-[12px] text-ink-500">{fmtDateTime(s.createdAt)}</span>
      </div>
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
            ? "대표가 Room 3에서 명세를 승인하면 v1이 저장됩니다."
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
