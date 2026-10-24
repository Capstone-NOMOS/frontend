"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, GitBranch, Loader2 } from "lucide-react";
import { errorMessage, manualCompletionDetails, type Schemas } from "@/shared/api";
import { Badge, Button, EmptyState, Input, SectionTitle, Textarea } from "@/shared/ui";
import { cn, fmtDateTime, relTime } from "@/shared/lib/format";
import {
  GateModeBadge,
  VERIFICATION_ORDER,
  VerificationBadge,
  useArtifacts,
  useVerifications,
} from "@/entities/artifact";
import { NoteItem, useNotes } from "@/entities/note";
import { ProjectErrorView, useProject } from "@/entities/project";
import { ROLE_ROOM } from "@/entities/room";
import {
  ApiTaskBadge,
  BLOCKED_REASON,
  TeamRoleBadge,
  useCancelTask,
  useCompleteTaskManually,
  useResumeTask,
  useTasks,
} from "@/entities/task";
import { useCurrentUser } from "@/entities/user";

// 에이전트가 붙잡지 않은 상태 — 사람이 취소하거나 직접 완료할 수 있다
const CLOSABLE: Schemas["Task"]["state"][] = ["READY", "BLOCKED", "ESCALATED"];

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
              {(task.state === "CLAIMED" || task.state === "IN_PROGRESS") && task.claimedAt && (
                <p className="mt-1 text-[12.5px] text-ink-500" title={fmtDateTime(task.claimedAt)}>
                  수령 {relTime(task.claimedAt)}
                </p>
              )}
              {task.state === "BLOCKED" && task.blockedReason && <Blocked projectId={projectId} task={task} />}
              {task.state === "ESCALATED" && (
                <div className="mt-3 rounded-lg bg-human-bg px-3 py-2.5 text-[13px]">
                  <p className="font-medium text-human">재시도를 다 썼습니다</p>
                  <p className="mt-1 text-ink-700">원인을 확인한 뒤 재개하면 재시도 횟수가 0으로 돌아갑니다.</p>
                  <Resume taskId={task.id} />
                </div>
              )}
              {CLOSABLE.includes(task.state) && <TaskActions projectId={projectId} task={task} />}
            </header>

            <Submissions taskId={taskId} />

            <TaskNotes projectId={projectId} taskId={taskId} />
          </>
        )}
      </div>
    </div>
  );
}

/** BLOCKED는 이유마다 풀리는 방법이 다르다. QUESTION은 답하면 자동으로, AGENT_STOPPED는 대표가 재개해야 풀린다 */
function Blocked({ projectId, task }: { projectId: string; task: Schemas["Task"] }) {
  const reason = task.blockedReason!;
  const roomHref = task.teamRole && `/p/${projectId}/rooms/${ROLE_ROOM[task.teamRole].slug}`;

  return (
    <div className="mt-3 rounded-lg bg-human-bg px-3 py-2.5 text-[13px]">
      <p className="font-medium text-human">{BLOCKED_REASON[reason]}</p>
      {reason === "QUESTION" && (
        <p className="mt-1 text-ink-700">
          에이전트가 다른 역할에게 질문하고 태스크를 잠시 내려놓았습니다. 답이 오면 자동으로 다시 시작합니다 ·{" "}
          <Link href={`/p/${projectId}/inbox`} className="font-medium underline underline-offset-2">
            받은 편지함에서 질문 보기
          </Link>
        </p>
      )}
      {reason === "AGENT_STOPPED" && (
        <>
          <p className="mt-1 text-ink-700">
            에이전트가 제출하지 않고 끝났습니다(권한·환경 문제 또는 응답 끊김). 재시도 횟수는 오르지 않습니다.
            {roomHref && (
              <>
                {" "}
                사유는{" "}
                <Link href={roomHref} className="font-medium underline underline-offset-2">
                  룸 피드
                </Link>
                에 있습니다.
              </>
            )}
          </p>
          <Resume taskId={task.id} />
        </>
      )}
    </div>
  );
}

/** 대표 전용 재개. BLOCKED · AGENT_STOPPED와 ESCALATED에서 쓴다 */
function Resume({ taskId }: { taskId: string }) {
  const isRep = useCurrentUser().me?.orgRole === "REPRESENTATIVE";
  const resume = useResumeTask();
  const [note, setNote] = useState("");

  if (!isRep) return <p className="mt-1 text-ink-700">대표가 원인을 해결한 뒤 재개합니다.</p>;
  return (
    <>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={resume.isPending}
          placeholder="무엇을 해결했는지 (선택, 룸에 보입니다)"
          aria-label="재개 메모"
          className="h-8 min-w-0 flex-1 bg-white text-[13px] sm:max-w-[360px]"
        />
        <Button
          size="sm"
          disabled={resume.isPending}
          onClick={() => resume.mutate({ taskId, note: note.trim() || undefined })}
        >
          {resume.isPending ? "재개하는 중…" : "재개"}
        </Button>
      </div>
      {resume.isError && <p className="mt-2 text-[12.5px] text-forbidden">{errorMessage(resume.error)}</p>}
    </>
  );
}

/**
 * 취소(대표) · 직접 완료(그 역할 담당 · 대표). READY · BLOCKED · ESCALATED에서만 보인다.
 * 최종 판정은 서버 — 403 NOT_TASK_OWNER, 409 TASK_IN_PROGRESS · TASK_ALREADY_CLOSED
 */
function TaskActions({ projectId, task }: { projectId: string; task: Schemas["Task"] }) {
  const me = useCurrentUser().me!;
  const isRep = me.orgRole === "REPRESENTATIVE";
  const isOwner = useProject(projectId).data?.members.some(
    (m) => m.userId === me.userId && m.teamRole === task.teamRole,
  );
  const [mode, setMode] = useState<"cancel" | "complete" | null>(null);
  if (!isRep && !isOwner) return null;

  if (mode === "cancel") return <CancelForm taskId={task.id} onClose={() => setMode(null)} />;
  if (mode === "complete") return <CompleteForm taskId={task.id} onClose={() => setMode(null)} />;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => setMode("complete")}>
        직접 완료
      </Button>
      {isRep && (
        <Button size="sm" variant="outline" onClick={() => setMode("cancel")}>
          취소
        </Button>
      )}
    </div>
  );
}

function CancelForm({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const cancel = useCancelTask();
  const [reason, setReason] = useState("");
  return (
    <div className="card mt-3 space-y-2 p-3">
      <Textarea
        rows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        disabled={cancel.isPending}
        placeholder="왜 취소하나요? (필수, 룸에 보입니다)"
        aria-label="취소 사유"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="danger"
          disabled={!reason.trim() || cancel.isPending}
          onClick={() => cancel.mutate({ taskId, reason: reason.trim() })}
        >
          {cancel.isPending ? "취소하는 중…" : "태스크 취소"}
        </Button>
        <Button size="sm" variant="ghost" disabled={cancel.isPending} onClick={onClose}>
          닫기
        </Button>
      </div>
      {cancel.isError && <p className="text-[12.5px] text-forbidden">{errorMessage(cancel.error)}</p>}
    </div>
  );
}

function CompleteForm({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const complete = useCompleteTaskManually();
  const [sha, setSha] = useState("");
  const [paths, setPaths] = useState("");
  const [note, setNote] = useState("");
  const changedPaths = paths
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
  const invalid = manualCompletionDetails(complete.error);

  return (
    <div className="card mt-3 space-y-2 p-3">
      <p className="text-[12.5px] text-ink-700">
        태스크 브랜치에 직접 커밋해 push한 뒤, 그 커밋 sha와 <b>기본 브랜치에서 갈라진 뒤 바꾼 파일 전부</b>를 적어
        주세요.
      </p>
      <Input
        value={sha}
        onChange={(e) => setSha(e.target.value)}
        disabled={complete.isPending}
        placeholder="커밋 sha (예: a1b2c3d)"
        aria-label="커밋 sha"
        className="font-mono"
      />
      <Textarea
        rows={3}
        value={paths}
        onChange={(e) => setPaths(e.target.value)}
        disabled={complete.isPending}
        placeholder={"바꾼 파일 (한 줄에 하나)\nsrc/routes/studies.ts"}
        aria-label="바꾼 파일"
        className="font-mono"
      />
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        disabled={complete.isPending}
        placeholder="메모 (선택)"
        aria-label="메모"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={!sha.trim() || changedPaths.length === 0 || complete.isPending}
          onClick={() =>
            complete.mutate({ taskId, commitSha: sha.trim(), changedPaths, note: note.trim() || undefined })
          }
        >
          {complete.isPending ? "확인하는 중…" : "완료로 넘기기"}
        </Button>
        <Button size="sm" variant="ghost" disabled={complete.isPending} onClick={onClose}>
          닫기
        </Button>
      </div>
      {complete.isError && (
        <div className="space-y-1 text-[12.5px] text-forbidden">
          <p>{errorMessage(complete.error)}</p>
          {invalid?.reason && <p>{invalid.reason}</p>}
          {invalid && invalid.undeclared.length > 0 && (
            <p>
              빠뜨린 파일: <span className="font-mono">{invalid.undeclared.join(", ")}</span>
            </p>
          )}
          {invalid && invalid.overdeclared.length > 0 && (
            <p>
              바꾸지 않았는데 적은 파일: <span className="font-mono">{invalid.overdeclared.join(", ")}</span>
            </p>
          )}
        </div>
      )}
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

function VerificationRow({ v }: { v: Schemas["Verification"] }) {
  return (
    <li className="py-2.5">
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
  );
}

function Verifications({ artifact }: { artifact: Schemas["Artifact"] }) {
  const verifications = useVerifications(artifact.id);

  if (verifications.isPending) return <Spinner />;
  if (verifications.isError) return <p className="text-[13px] text-ink-500">{errorMessage(verifications.error)}</p>;

  // 보고 안 된 단계도 제자리(V3 → V2 → V4)에 "대기"로 끼운다. INTEGRATION은 결과가 왔을 때만 끝에 붙는다
  const integration = verifications.data.find((v) => v.stage === "INTEGRATION");

  return (
    <>
      <ol className="divide-y divide-ink-100">
        {EXPECTED_STAGES.map((stage) => {
          const v = verifications.data.find((x) => x.stage === stage);
          return v ? (
            <VerificationRow key={v.id} v={v} />
          ) : (
            <li key={stage} className="flex items-center gap-2 py-2.5">
              <span className="w-24 font-mono text-[12.5px] font-semibold text-ink-400">{stage}</span>
              <span className="text-[12px] text-ink-400">대기</span>
            </li>
          );
        })}
        {integration && <VerificationRow v={integration} />}
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
