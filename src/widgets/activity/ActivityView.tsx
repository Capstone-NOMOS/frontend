"use client";

import { useMemo, useState } from "react";
import { Badge, SectionTitle } from "@/shared/ui";
import { cn, fmtKrw, fmtTime, fmtTokens } from "@/shared/lib/format";
import { TaskBadge } from "@/entities/task";
import { useProject } from "@/lib/store";

const GROUPS: { key: string; label: string; match: (t: string) => boolean }[] = [
  { key: "all", label: "전체", match: () => true },
  { key: "task", label: "태스크", match: (t) => t.startsWith("task.") },
  { key: "approval", label: "승인", match: (t) => t.startsWith("approval.") || t.startsWith("report.") },
  { key: "policy", label: "정책", match: (t) => t.startsWith("scope.") || t.startsWith("policy.") },
  { key: "agent", label: "에이전트", match: (t) => t.startsWith("agent.") || t.startsWith("member.") || t.startsWith("repo.") },
  { key: "llm", label: "LLM 호출", match: (t) => t === "llm.call" },
];

export function ActivityView({ projectId }: { projectId: string }) {
  const { events, tasks, project, myRole } = useProject(projectId);
  const [tab, setTab] = useState<"events" | "costs">("events");
  const [group, setGroup] = useState("all");

  const list = useMemo(() => {
    const g = GROUPS.find((x) => x.key === group)!;
    return events.filter((e) => g.match(e.type)).sort((a, b) => (a.ts < b.ts ? 1 : -1));
  }, [events, group]);

  const costs = useMemo(() => {
    const byActor = new Map<string, { tokens: number; krw: number }>();
    for (const e of events) {
      if (!e.costKrw) continue;
      const cur = byActor.get(e.actor) ?? { tokens: 0, krw: 0 };
      byActor.set(e.actor, { tokens: cur.tokens + (e.tokens ?? 0), krw: cur.krw + e.costKrw });
    }
    return [...byActor.entries()].sort((a, b) => b[1].krw - a[1].krw);
  }, [events]);
  const costMax = Math.max(1, ...costs.map(([, v]) => v.krw));
  const total = costs.reduce((a, [, v]) => a + v.krw, 0);

  if (!project) return null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[960px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">활동 · 비용</h1>
            <p className="mt-1 text-[14px] text-ink-500">모든 상태 변화는 이벤트로 append 됩니다 (삭제·수정 불가). 비용은 사람별로 귀속됩니다.</p>
          </div>
          <div className="inline-flex rounded-lg bg-ink-100 p-0.5">
            {(["events", "costs"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={cn("h-8 rounded-md px-3 text-[13px] font-medium", tab === t ? "bg-white shadow-card" : "text-ink-600")}>
                {t === "events" ? "이벤트 로그" : "비용"}
              </button>
            ))}
          </div>
        </div>

        {tab === "events" ? (
          <section className="mt-6">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {GROUPS.map((g) => (
                <button key={g.key} onClick={() => setGroup(g.key)} className={cn("h-7 rounded-full border px-2.5 text-[12px] font-medium", group === g.key ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600 hover:bg-ink-50")}>
                  {g.label}
                </button>
              ))}
            </div>
            <ol className="card divide-y divide-ink-100">
              {list.map((e) => (
                <li key={e.id} className="flex items-start gap-3 px-4 py-2.5 text-[13px]">
                  <span className="w-11 shrink-0 pt-0.5 font-mono text-[11.5px] text-ink-400 tabular-nums">{fmtTime(e.ts)}</span>
                  <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", e.tone === "danger" ? "bg-forbidden" : e.tone === "warn" ? "bg-human" : e.tone === "success" ? "bg-auto" : "bg-ink-300")} />
                  <span className="min-w-0 flex-1">
                    <span className="mr-2 rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[10.5px] text-ink-600">{e.type}</span>
                    <span className="font-medium">{e.actor}</span> <span className="text-ink-600">{e.summary}</span>
                  </span>
                  {e.costKrw ? <span className="shrink-0 tabular-nums text-ink-500">{fmtKrw(e.costKrw)}</span> : null}
                </li>
              ))}
              {list.length === 0 && <li className="px-4 py-8 text-center text-[13px] text-ink-500">이벤트가 없습니다</li>}
            </ol>
          </section>
        ) : (
          <section className="mt-6 space-y-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="card p-4">
                <div className="text-[11.5px] font-medium uppercase tracking-wide text-ink-500">기능 1개당 총비용</div>
                <div className="mt-1 text-[22px] font-semibold tabular-nums tracking-tight">{fmtKrw(total)}</div>
                <div className="mt-1 text-[12px] text-ink-500">감당 기준선 ₩1,000 대비 {total > 1000 ? `${Math.round(total / 1000)}배` : "이내"}</div>
              </div>
              <div className="card p-4">
                <div className="text-[11.5px] font-medium uppercase tracking-wide text-ink-500">PM 예산 (NOMOS 부담)</div>
                <div className="mt-1 text-[22px] font-semibold tabular-nums tracking-tight">{fmtTokens(project.pmSpentTokens)} <span className="text-[14px] font-normal text-ink-500">/ {fmtTokens(project.pmBudgetTokens)}</span></div>
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
                  <li key={actor} className="grid grid-cols-[120px_1fr_auto] items-center gap-3 text-[13px] sm:grid-cols-[200px_1fr_auto]">
                    <span className="truncate font-medium">{actor}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-ink-100">
                      <span className={cn("block h-full rounded-full", actor === "PM" ? "bg-pm-chart" : actor.includes("병국") ? "bg-fe-500" : "bg-be-500")} style={{ width: `${(v.krw / costMax) * 100}%` }} />
                    </span>
                    <span className="w-28 text-right tabular-nums text-ink-600">{fmtTokens(v.tokens)} · {fmtKrw(v.krw)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12px] text-ink-500">FE·BE 에이전트 비용은 본인 부담(브릿지가 토큰 수 보고), PM 비용은 NOMOS 계정에 프로젝트별 집계.</p>
            </div>

            <div className="card overflow-hidden">
              <div className="px-4 pt-4"><SectionTitle>태스크별 비용 {myRole !== "OWNER" && <span className="normal-case tracking-normal">· {myRole} 태스크만</span>}</SectionTitle></div>
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
                        <td className="px-4 py-2"><span className="mr-2 font-mono text-[12px] text-ink-500">{t.id}</span>{t.title}</td>
                        <td className="px-4 py-2"><Badge tone={t.role === "FE" ? "fe" : "be"}>{t.role}</Badge></td>
                        <td className="px-4 py-2"><TaskBadge state={t.state} /></td>
                        <td className="px-4 py-2 font-mono text-[12px] text-ink-500">{t.commit ?? "—"}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{t.costKrw ? fmtKrw(t.costKrw) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
