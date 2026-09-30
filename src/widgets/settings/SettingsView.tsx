"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Badge, Button, CopyField, Input, MockEmpty, SectionTitle } from "@/shared/ui";
import { cn, fmtTokens } from "@/shared/lib/format";
import type { Level } from "@/shared/model";
import { DECIDER_META, LEVELS, POLICY_TABLE } from "@/entities/policy";
import { useApp, useProject } from "@/lib/store";

export function SettingsView({ projectId }: { projectId: string }) {
  const { actions } = useApp();
  const { project, myRole } = useProject(projectId);
  const [budget, setBudget] = useState<string>(project ? String(project.pmBudgetTokens) : "");
  if (!project) return <MockEmpty />;
  const isOwner = myRole === "OWNER";
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[960px] px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-[22px] font-semibold tracking-tight">프로젝트 설정</h1>
        <p className="mt-1 text-[14px] text-ink-500">
          {isOwner
            ? "허용 레벨과 PM 예산을 조정할 수 있습니다."
            : "대표만 수정할 수 있습니다. 현재 적용 중인 정책을 확인하세요."}
        </p>

        <section className="card mt-6 p-5">
          <SectionTitle>기본 정보</SectionTitle>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-[13.5px] sm:grid-cols-2">
            <Row k="이름" v={project.name} />
            <Row k="설명" v={project.description} />
            <Row k="스택" v={project.stack} />
            <Row k="레포" v="프로젝트당 2개 · 완전 분리 (통합 브랜치 없음)" />
          </dl>
          {isOwner && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <CopyField label="FE 초대 링크" value={`${origin}/join/${project.inviteTokens.FE}`} />
              <CopyField label="BE 초대 링크" value={`${origin}/join/${project.inviteTokens.BE}`} />
            </div>
          )}
        </section>

        <section className="card mt-6 p-5">
          <SectionTitle>허용 레벨</SectionTitle>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {LEVELS.map((l) => {
              const active = project.level === l.id;
              return (
                <button
                  key={l.id}
                  disabled={!isOwner}
                  onClick={() => actions.setLevel(projectId, l.id as Level)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition disabled:cursor-default",
                    active ? "border-ink-900 ring-2 ring-ink-900/10" : "border-ink-200 hover:border-ink-300",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-semibold">{l.id}</span>
                    {active ? <Badge tone="brand">적용 중</Badge> : l.id === "L2" ? <Badge>기본값</Badge> : null}
                  </div>
                  <div className="mt-0.5 text-[13px] font-medium">{l.title}</div>
                  <div className="mt-1 text-[12px] text-ink-500">{l.detail}</div>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[12.5px] text-ink-500">
            레벨은 자율성 정도가 아니라 <strong>행동마다 누가 승인하는가</strong>를 정한 표입니다. 🔒 항목은 레벨과
            무관하게 고정되며 대표도 바꿀 수 없습니다.
          </p>

          <div className="mt-4 overflow-x-auto rounded-xl border border-ink-200">
            <table className="w-full min-w-[720px] text-[12.5px]">
              <thead className="bg-ink-50 text-[11px] uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">#</th>
                  <th className="px-3 py-2 text-left font-semibold">행동</th>
                  <th className="px-3 py-2 text-left font-semibold">탐지 (결정적)</th>
                  {LEVELS.map((l) => (
                    <th
                      key={l.id}
                      className={cn(
                        "px-3 py-2 text-center font-semibold",
                        project.level === l.id && "bg-brand-50 text-brand-600",
                      )}
                    >
                      {l.id}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {POLICY_TABLE.map((r) => (
                  <tr key={r.actionKey}>
                    <td className="px-3 py-2 text-ink-400">{r.n}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5 font-medium">
                        {r.locked && <Lock size={11} className="text-ink-400" />} {r.label}
                      </div>
                      <div className="font-mono text-[10.5px] text-ink-500">{r.actionKey}</div>
                    </td>
                    <td className="px-3 py-2 text-ink-600">{r.detect}</td>
                    {LEVELS.map((l) => {
                      const d = r.deciders[l.id];
                      const m = DECIDER_META[d];
                      return (
                        <td
                          key={l.id}
                          className={cn("px-3 py-2 text-center", project.level === l.id && "bg-brand-50/60")}
                        >
                          <span
                            className={cn("inline-block rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold", m.cls)}
                          >
                            {m.label}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-ink-500">
            {(Object.keys(DECIDER_META) as (keyof typeof DECIDER_META)[]).map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className={cn("rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold", DECIDER_META[k].cls)}>
                  {DECIDER_META[k].label}
                </span>{" "}
                {DECIDER_META[k].desc}
              </span>
            ))}
          </div>
        </section>

        <section className="card mt-6 p-5">
          <SectionTitle>PM 예산</SectionTitle>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="프로젝트 PM 토큰 상한"
                value={budget}
                onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ""))}
                disabled={!isOwner}
                hint={`현재 사용 ${fmtTokens(project.pmSpentTokens)} 토큰 · 80%에서 경고, 초과 시 새 명세·분배 중단`}
              />
            </div>
            {isOwner && (
              <Button
                onClick={() => budget && actions.setBudget(projectId, Number(budget))}
                variant="outline"
                className="mb-6"
              >
                저장
              </Button>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-red-200 p-5">
          <SectionTitle>위험 구역</SectionTitle>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[13.5px] font-medium">프로젝트 삭제</div>
              <div className="text-[12.5px] text-ink-500">
                이벤트 로그는 append-only이므로 삭제해도 감사 기록은 남습니다. (v1 미지원)
              </div>
            </div>
            <Button variant="danger" disabled>
              삭제
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-14 shrink-0 text-ink-500">{k}</dt>
      <dd className="min-w-0 font-medium">{v}</dd>
    </div>
  );
}
