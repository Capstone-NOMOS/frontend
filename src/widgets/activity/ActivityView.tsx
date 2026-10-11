"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { errorMessage } from "@/shared/api";
import { Badge, Button, EmptyState, MockBadge, SectionTitle } from "@/shared/ui";
import { cn, fmtKrw, fmtTokens } from "@/shared/lib/format";
import { useOrgAgents } from "@/entities/agent";
import { EventRow, makeEventLookup, useProjectEvents } from "@/entities/event";
import { NOTE_KIND, NoteItem, useNotes, type NoteKind } from "@/entities/note";
import { useOrgMembers } from "@/entities/org";
import { TaskBadge, useTasks } from "@/entities/task";
import { useCurrentUser } from "@/entities/user";
import { useProject as useMockProject } from "@/lib/store";

type Tab = "events" | "notes" | "costs";
const TABS: Record<Tab, string> = { events: "활동", notes: "인계 노트", costs: "비용" };

export function ActivityView({ projectId }: { projectId: string }) {
  const notes = useNotes(projectId);
  const [tab, setTab] = useState<Tab>("events");
  const [kind, setKind] = useState<NoteKind | null>(null);

  const list = (notes.data ?? []).filter((n) => !kind || n.kind === kind);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[960px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">활동 · 비용</h1>
            <p className="mt-1 text-[14px] text-ink-500">
              프로젝트에서 일어난 일과 에이전트가 남긴 인계 노트입니다. 노트는 자기 보고이며, 검증 결과는 태스크
              상세에서 확인합니다.
            </p>
          </div>
          <div className="inline-flex shrink-0 self-start rounded-lg bg-ink-100 p-0.5 sm:self-auto">
            {(Object.keys(TABS) as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "h-7 whitespace-nowrap rounded-md px-2.5 text-[12px] font-medium",
                  tab === t ? "bg-white shadow-card" : "text-ink-600",
                )}
              >
                {TABS[t]}
              </button>
            ))}
          </div>
        </div>

        {tab === "events" ? (
          <Events projectId={projectId} />
        ) : tab === "notes" ? (
          <section className="mt-6">
            <div className="mb-3 flex flex-wrap gap-1.5">
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
                {list.length === 0 && (
                  <li className="px-4 py-8 text-center text-[13px] text-ink-500">노트가 없습니다</li>
                )}
              </ol>
            )}
          </section>
        ) : (
          <MockCosts projectId={projectId} />
        )}
      </div>
    </div>
  );
}

/** 이벤트 로그 (최신순). 지워지지 않는 기록이라 그대로 보여 준다 */
function Events({ projectId }: { projectId: string }) {
  const me = useCurrentUser().me!;
  const events = useProjectEvents(projectId);
  const tasks = useTasks(projectId).data;
  const agents = useOrgAgents(me.orgId).data?.agents;
  const members = useOrgMembers(me.orgId!).data;
  const lookup = makeEventLookup(tasks, agents, members);

  if (events.isPending) {
    return (
      <div className="flex justify-center py-10 text-ink-400" aria-busy="true">
        <Loader2 size={20} className="animate-spin" aria-label="불러오는 중" />
      </div>
    );
  }
  if (events.isError) return <EmptyState title={errorMessage(events.error)} />;

  return (
    <section className="mt-6">
      <ol className="card divide-y divide-ink-100 px-4">
        {events.data.map((e) => (
          <EventRow key={e.id} event={e} lookup={lookup} />
        ))}
        {events.data.length === 0 && (
          <li className="py-8 text-center text-[13px] text-ink-500">아직 활동이 없습니다</li>
        )}
      </ol>
      {events.hasNextPage && (
        <div className="mt-3 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            disabled={events.isFetchingNextPage}
            onClick={() => void events.fetchNextPage()}
          >
            {events.isFetchingNextPage ? "불러오는 중…" : "더 보기"}
          </Button>
        </div>
      )}
    </section>
  );
}

/** 비용 API가 없어 목업 스토어를 읽는다 */
function MockCosts({ projectId }: { projectId: string }) {
  const { events, tasks, project, myRole } = useMockProject(projectId);
  const byActor = new Map<string, { tokens: number; krw: number }>();
  for (const e of events) {
    if (!e.costKrw) continue;
    const cur = byActor.get(e.actor) ?? { tokens: 0, krw: 0 };
    byActor.set(e.actor, { tokens: cur.tokens + (e.tokens ?? 0), krw: cur.krw + e.costKrw });
  }
  const costs = [...byActor.entries()].sort((a, b) => b[1].krw - a[1].krw);
  const costMax = Math.max(1, ...costs.map(([, v]) => v.krw));
  const total = costs.reduce((a, [, v]) => a + v.krw, 0);

  if (!project) {
    return (
      <section className="mt-6">
        <EmptyState
          title="비용 API 연결 전입니다"
          desc="이 프로젝트의 목업 데이터가 없습니다."
          action={<MockBadge />}
        />
      </section>
    );
  }

  return (
    <section className="mt-6 space-y-6">
      <MockBadge />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <div className="text-[11.5px] font-medium uppercase tracking-wide text-ink-500">기능 1개당 총비용</div>
          <div className="mt-1 text-[22px] font-semibold tabular-nums tracking-tight">{fmtKrw(total)}</div>
          <div className="mt-1 text-[12px] text-ink-500">
            감당 기준선 ₩1,000 대비 {total > 1000 ? `${Math.round(total / 1000)}배` : "이내"}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-[11.5px] font-medium uppercase tracking-wide text-ink-500">PM 예산 (NOMOS 부담)</div>
          <div className="mt-1 text-[22px] font-semibold tabular-nums tracking-tight">
            {fmtTokens(project.pmSpentTokens)}{" "}
            <span className="text-[14px] font-normal text-ink-500">/ {fmtTokens(project.pmBudgetTokens)}</span>
          </div>
          <div className="mt-1 text-[12px] text-ink-500">초과 시 새 분배 중단 · budget:exceed → 사람</div>
        </div>
        <div className="card p-4">
          <div className="text-[11.5px] font-medium uppercase tracking-wide text-ink-500">모델 등급</div>
          <div className="mt-1 text-[14px] font-semibold">명세·계약 Sonnet급</div>
          <div className="text-[14px] font-semibold">라우팅·요약 Haiku급</div>
        </div>
      </div>

      <div className="card p-4">
        <SectionTitle>사람별 비용</SectionTitle>
        <ul className="space-y-2.5">
          {costs.map(([actor, v]) => (
            <li
              key={actor}
              className="grid grid-cols-[120px_1fr_auto] items-center gap-3 text-[13px] sm:grid-cols-[200px_1fr_auto]"
            >
              <span className="truncate font-medium">{actor}</span>
              <span className="h-2 overflow-hidden rounded-full bg-ink-100">
                <span
                  className={cn(
                    "block h-full rounded-full",
                    actor === "PM" ? "bg-pm-chart" : actor.includes("병국") ? "bg-fe-500" : "bg-be-500",
                  )}
                  style={{ width: `${(v.krw / costMax) * 100}%` }}
                />
              </span>
              <span className="w-28 text-right tabular-nums text-ink-600">
                {fmtTokens(v.tokens)} · {fmtKrw(v.krw)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12px] text-ink-500">
          FE·BE 에이전트 비용은 본인 부담(브릿지가 토큰 수 보고), PM 비용은 NOMOS 계정에 프로젝트별 집계.
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 pt-4">
          <SectionTitle>
            태스크별 비용{" "}
            {myRole !== "OWNER" && <span className="normal-case tracking-normal">· {myRole} 태스크만</span>}
          </SectionTitle>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-ink-50 text-[11.5px] uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">태스크</th>
                <th className="px-4 py-2 text-left font-semibold">역할</th>
                <th className="px-4 py-2 text-left font-semibold">상태</th>
                <th className="px-4 py-2 text-left font-semibold">커밋</th>
                <th className="px-4 py-2 text-right font-semibold">비용</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2">
                    <span className="mr-2 font-mono text-[12px] text-ink-500">{t.id}</span>
                    {t.title}
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone={t.role === "FE" ? "fe" : "be"}>{t.role}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    <TaskBadge state={t.state} />
                  </td>
                  <td className="px-4 py-2 font-mono text-[12px] text-ink-500">{t.commit ?? "—"}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{t.costKrw ? fmtKrw(t.costKrw) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
