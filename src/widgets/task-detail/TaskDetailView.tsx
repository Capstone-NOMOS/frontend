"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, GitBranch, Loader2 } from "lucide-react";
import { errorMessage, type Schemas } from "@/shared/api";
import { Badge, EmptyState, SectionTitle } from "@/shared/ui";
import { cn, fmtDateTime } from "@/shared/lib/format";
import {
  GateModeBadge,
  VERIFICATION_ORDER,
  VerificationBadge,
  useArtifacts,
  useVerifications,
} from "@/entities/artifact";
import { NoteItem, useNotes } from "@/entities/note";
import { ProjectErrorView } from "@/entities/project";
import { ApiTaskBadge, TeamRoleBadge, useTasks } from "@/entities/task";

// 결과가 늦게 오는 단계(V2·V4는 브릿지 보고). INTEGRATION은 아직 돌지 않으므로 빈자리로 보이지 않는다
const EXPECTED_STAGES = VERIFICATION_ORDER.filter((s) => s !== "INTEGRATION");

export function TaskDetailView({ projectId, taskId }: { projectId: string; taskId: string }) {
  // 단건 조회 API가 없어 목록에서 찾는다. 대시보드와 같은 쿼리라 캐시를 공유한다
  const tasks = useTasks(projectId);
  const task = tasks.data?.find((t) => t.id === taskId);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[960px] px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href={`/p/${projectId}`}
          className="inline-flex items-center gap-1 text-[13px] text-ink-500 hover:text-ink-900"
        >
          <ArrowLeft size={14} /> 대시보드
        </Link>

        {tasks.isPending ? (
          <Spinner />
        ) : tasks.isError ? (
          <ProjectErrorView error={tasks.error} onRetry={() => void tasks.refetch()} />
        ) : !task ? (
          <div className="mt-6">
            <EmptyState title="태스크를 찾을 수 없습니다" />
          </div>
        ) : (
          <>
            <header className="mt-3">
              <div className="flex flex-wrap items-center gap-2">
                <ApiTaskBadge state={task.state} />
                {task.teamRole && <TeamRoleBadge role={task.teamRole} />}
                <Badge>{task.kind}</Badge>
                {task.retryCount > 0 && <span className="text-[12px] text-ink-500">재시도 {task.retryCount}회</span>}
              </div>
              <h1 className="mt-2 text-[22px] font-semibold tracking-tight">{task.title}</h1>
              {task.branchName && (
                <p className="mt-1 inline-flex items-center gap-1 font-mono text-[12.5px] text-ink-500">
                  <GitBranch size={13} /> {task.branchName}
                </p>
              )}
              {task.blockedReason && (
                <p className="mt-3 rounded-lg bg-human-bg px-3 py-2 text-[13px] text-human">{task.blockedReason}</p>
              )}
            </header>

            <Submissions taskId={taskId} />

            <TaskNotes projectId={projectId} taskId={taskId} />
          </>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-10 text-ink-400" aria-busy="true">
      <Loader2 size={20} className="animate-spin" aria-label="불러오는 중" />
    </div>
  );
}

function Submissions({ taskId }: { taskId: string }) {
  const artifacts = useArtifacts(taskId);
  const [picked, setPicked] = useState<string | null>(null);
  // 고르지 않았으면 최신 제출
  const selected = artifacts.data?.find((a) => a.id === picked) ?? artifacts.data?.[0] ?? null;

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
      <section className="card p-4">
        <SectionTitle>제출 이력</SectionTitle>
        {artifacts.isPending ? (
          <Spinner />
        ) : artifacts.isError ? (
          <p className="text-[13px] text-ink-500">{errorMessage(artifacts.error)}</p>
        ) : artifacts.data.length === 0 ? (
          <p className="text-[13px] text-ink-500">아직 제출이 없습니다</p>
        ) : (
          <ul className="space-y-1.5">
            {artifacts.data.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => setPicked(a.id)}
                  aria-pressed={selected?.id === a.id}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left",
                    selected?.id === a.id ? "border-ink-900 bg-white" : "border-ink-200 hover:bg-ink-50",
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold">#{a.attempt}</span>
                    {a.attempt >= 2 && <Badge tone="brand">재제출</Badge>}
                    <span className="ml-auto">
                      <GateModeBadge mode={a.gateMode} />
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[11.5px] text-ink-500">
                    <span className="font-mono">{a.commitSha.slice(0, 7)}</span>
                    <span className="tabular-nums">{fmtDateTime(a.createdAt)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-4">
        <SectionTitle>검증</SectionTitle>
        {selected ? (
          <Verifications artifact={selected} />
        ) : (
          !artifacts.isPending && <p className="text-[13px] text-ink-500">제출이 없습니다</p>
        )}
      </section>
    </div>
  );
}

function Verifications({ artifact }: { artifact: Schemas["Artifact"] }) {
  const verifications = useVerifications(artifact.id);

  if (verifications.isPending) return <Spinner />;
  if (verifications.isError) return <p className="text-[13px] text-ink-500">{errorMessage(verifications.error)}</p>;

  const missing = EXPECTED_STAGES.filter((s) => !verifications.data.some((v) => v.stage === s));

  return (
    <>
      <ol className="divide-y divide-ink-100">
        {verifications.data.map((v) => (
          <li key={v.id} className="py-2.5">
            <div className="flex items-center gap-2">
              <span className="w-24 font-mono text-[12.5px] font-semibold">{v.stage}</span>
              <VerificationBadge result={v.result} />
              {v.result === "SKIPPED" && <span className="text-[11.5px] text-ink-500">통과 아님</span>}
              <span className="ml-auto text-[11.5px] text-ink-400 tabular-nums">
                {v.executedBy === "server" ? "서버" : "브릿지"}
                {v.durationMs !== null && ` · ${v.durationMs}ms`}
              </span>
            </div>
            {/* detail은 단계마다 형식이 다르다. SKIPPED면 reason(문자열)이 반드시 있다 */}
            {typeof v.detail.reason === "string" && (
              <p className="mt-1 pl-26 text-[12.5px] text-ink-600">{v.detail.reason}</p>
            )}
          </li>
        ))}
        {missing.map((stage) => (
          <li key={stage} className="flex items-center gap-2 py-2.5">
            <span className="w-24 font-mono text-[12.5px] font-semibold text-ink-400">{stage}</span>
            <span className="text-[12px] text-ink-400">보고 전</span>
          </li>
        ))}
      </ol>
      {artifact.changedPaths.length > 0 && (
        <details className="mt-3 text-[12.5px]">
          <summary className="cursor-pointer text-ink-500">변경 파일 {artifact.changedPaths.length}개</summary>
          <ul className="mt-1.5 space-y-0.5 font-mono text-[11.5px] text-ink-600">
            {artifact.changedPaths.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

function TaskNotes({ projectId, taskId }: { projectId: string; taskId: string }) {
  const notes = useNotes(projectId);
  const mine = notes.data?.filter((n) => n.taskId === taskId) ?? [];
  // 다른 태스크에서 나온 결정 사항도 이 태스크에 전달된다 (BE #26 §4). 정정된 원본은 뺀다
  const decided =
    notes.data?.filter(
      (n) => n.kind === "DECIDED" && n.taskId !== taskId && !notes.data.some((m) => m.supersedes === n.id),
    ) ?? [];

  return (
    <section className="card mt-6 p-4">
      <SectionTitle>이 태스크의 인계 노트</SectionTitle>
      {notes.isPending ? (
        <Spinner />
      ) : notes.isError ? (
        <p className="text-[13px] text-ink-500">{errorMessage(notes.error)}</p>
      ) : mine.length === 0 ? (
        <p className="text-[13px] text-ink-500">노트가 없습니다</p>
      ) : (
        <ol className="divide-y divide-ink-100">
          {mine.map((n) => (
            <li key={n.id} className="py-3">
              <NoteItem note={n} notes={notes.data} />
            </li>
          ))}
        </ol>
      )}
      {decided.length > 0 && (
        <>
          <div className="mb-1 mt-5 text-[12px] font-semibold text-ink-500">
            프로젝트 결정 사항 · 이 태스크에도 전달됨
          </div>
          <ol className="divide-y divide-ink-100">
            {decided.map((n) => (
              <li key={n.id} className="py-3">
                <NoteItem note={n} notes={notes.data!} />
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
