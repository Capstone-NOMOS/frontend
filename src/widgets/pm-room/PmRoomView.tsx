"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, Lock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { errorMessage } from "@/shared/api";
import { AgentMark, Avatar, Badge, Button, CopyField, EmptyState } from "@/shared/ui";
import { cn, fmtDateTime } from "@/shared/lib/format";
import { CLI_NPX } from "@/entities/agent";
import {
  chronological,
  fmtUsdNumber,
  isSuperseded,
  usePlans,
  usePmStatus,
  useRequestPlan,
  type PmStatus,
} from "@/entities/plan";
import { useProject } from "@/entities/project";
import { ROOM_META } from "@/entities/room";
import { taskKeys } from "@/entities/task";
import { displayName, useCurrentUser } from "@/entities/user";
import { PlanCard } from "./PlanCard";

const MAX_INSTRUCTION = 8000;

/**
 * Room 3 (대표 + PM). 명세 F-09·S-5: 대표가 요구사항을 쓰면 PM이 명세·태스크 초안을 내고, 승인 카드로 승인·수정 요청한다.
 * Room API가 아직 없어 대화는 PM 계획 이력(GET …/pm/plans)으로 그린다. PM API는 전부 대표 전용
 */
export function PmRoomView({ projectId }: { projectId: string }) {
  const me = useCurrentUser().me!;
  const isRep = me.orgRole === "REPRESENTATIVE";

  if (!isRep) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          title="403 · 이 Room에 접근할 수 없습니다"
          desc={`${ROOM_META.OWNER.name}은 ${ROOM_META.OWNER.who}의 공간입니다. FE·BE는 자기 Room만 볼 수 있습니다.`}
          action={
            <Button href={`/p/${projectId}`} variant="outline">
              대시보드로
            </Button>
          }
        />
      </div>
    );
  }
  return <Room projectId={projectId} meName={displayName(me)} />;
}

function Room({ projectId, meName }: { projectId: string; meName: string }) {
  const queryClient = useQueryClient();
  const project = useProject(projectId).data!.project;
  const status = usePmStatus(projectId);
  const plans = usePlans(projectId);
  const request = useRequestPlan(projectId);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const list = chronological(plans.data ?? []);
  const pending = list.some((p) => p.status === "pending");
  const s = status.data;
  const blocked = !s || !s.ready || s.pendingPlanId !== null || pending || request.isPending;

  // 새 계획·상태 변화가 오면 아래로
  const lastKey = list.map((p) => `${p.id}:${p.status}`).join(",");
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lastKey]);

  const send = () => {
    const instruction = draft.trim();
    if (!instruction || blocked) return;
    request.mutate({ instruction }, { onSuccess: () => setDraft("") });
  };

  return (
    <div className="flex h-full min-w-0 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-ink-200 px-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold">{ROOM_META.OWNER.name}</h1>
          <div className="truncate text-[12px] text-ink-500">{ROOM_META.OWNER.who}</div>
        </div>
        {pending ? (
          <Badge tone="info">PM 작성 중</Badge>
        ) : list.some((p) => p.status === "ready" && !isSuperseded(p, list)) ? (
          <Badge tone="warn">승인 대기</Badge>
        ) : (
          <Badge tone="pm">PM 대기 중</Badge>
        )}
        <div className="hidden items-center -space-x-1.5 md:flex">
          <Avatar name={meName} size={26} className="ring-2 ring-white" />
          <AgentMark tone="pm" size={26} className="ring-2 ring-white" />
        </div>
      </header>

      <StatusBar status={status.data} error={status.error} />

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[860px] space-y-5 px-4 py-6 sm:px-6">
          <PmLine>
            요구사항을 적어주시면 명세(API·화면 계약 + 수용 기준)와 태스크 배분 초안을 만들어 드립니다. 승인하면 명세와
            태스크가 생기고, 멤버를 확인한 뒤 프로젝트를 시작하면 에이전트가 일을 받습니다.
          </PmLine>

          {plans.isPending ? (
            <div className="flex justify-center py-6 text-ink-400" aria-busy="true">
              <Loader2 size={18} className="animate-spin" aria-label="불러오는 중" />
            </div>
          ) : plans.isError ? (
            <p className="text-center text-[13px] text-forbidden">{errorMessage(plans.error)}</p>
          ) : (
            list.map((plan) => (
              <div key={plan.id} className="space-y-3">
                <MeLine name={meName}>
                  {plan.feedback ? (
                    <>
                      <span className="mr-1.5 text-[12px] font-semibold text-brand-600">수정 요청</span>
                      {plan.feedback}
                    </>
                  ) : (
                    plan.instruction
                  )}
                </MeLine>
                <PlanCard
                  projectId={projectId}
                  plan={plan}
                  plans={list}
                  started={project.startedAt !== null}
                  onRetry={(text) => setDraft(text)}
                  onApplied={() => queryClient.invalidateQueries({ queryKey: taskKeys.all })}
                />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-ink-100 bg-white safe-bottom">
        <div className="mx-auto max-w-[860px] px-3 py-3 sm:px-6">
          {request.isError && <p className="mb-2 text-[12.5px] text-forbidden">{errorMessage(request.error)}</p>}
          <div className="rounded-2xl border border-ink-200 bg-white shadow-card focus-within:border-ink-300 focus-within:ring-4 focus-within:ring-ink-100">
            <textarea
              rows={2}
              value={draft}
              maxLength={MAX_INSTRUCTION}
              disabled={blocked}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={
                pending || s?.pendingPlanId
                  ? "PM이 계획을 작성하고 있습니다"
                  : "요구사항을 적어주세요. PM이 명세와 태스크로 정리합니다"
              }
              aria-label="PM에게 보낼 요구사항"
              className="block max-h-[180px] w-full resize-none bg-transparent px-4 pt-3 text-[14.5px] leading-6 text-ink-900 outline-none placeholder:text-ink-400 disabled:opacity-60"
            />
            <div className="flex items-center justify-between px-3 pb-2.5">
              <span className="text-[11.5px] text-ink-400">
                Enter 전송 · Shift+Enter 줄바꿈 · {draft.length.toLocaleString()} / {MAX_INSTRUCTION.toLocaleString()}
              </span>
              <button
                type="button"
                onClick={send}
                disabled={!draft.trim() || blocked}
                aria-label="계획 받기"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink-900 text-white transition hover:bg-ink-700 disabled:bg-ink-200"
              >
                {request.isPending ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** PM 준비 상태와 예산. ready가 아니면 요청 버튼을 끄고 이유를 보여준다 */
function StatusBar({ status, error }: { status: PmStatus | undefined; error: Error | null }) {
  if (error) {
    return (
      <div className="border-b border-ink-100 px-4 py-2 text-[12.5px] text-forbidden sm:px-6">
        {errorMessage(error)}
      </div>
    );
  }
  if (!status) return null;
  const pct = status.budgetUsd > 0 ? Math.min(100, Math.round((status.spentUsd / status.budgetUsd) * 100)) : 0;

  return (
    <div className="border-b border-ink-100 bg-ink-50 px-4 py-2.5 sm:px-6">
      <div className="mx-auto flex max-w-[860px] flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px]">
          <span className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", status.ready ? "bg-auto" : "bg-human")} aria-hidden />
            {status.ready
              ? "PM 준비됨"
              : status.reason === "NO_API_KEY"
                ? "서버에 PM 키가 없습니다"
                : "PM 작업기가 꺼져 있습니다"}
          </span>
          {/* 명세 F-08: 예산 80% 도달 시 경고 */}
          <span className="flex min-w-[220px] flex-1 items-center gap-2">
            <span className="shrink-0 text-ink-500">PM 예산</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-200">
              <span
                className={cn(
                  "block h-full rounded-full",
                  pct >= 100 ? "bg-forbidden" : pct >= 80 ? "bg-human" : "bg-brand-500",
                )}
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className={cn("shrink-0 tabular-nums", pct >= 80 ? "font-medium text-human" : "text-ink-700")}>
              {fmtUsdNumber(status.spentUsd)} / {fmtUsdNumber(status.budgetUsd)}
            </span>
          </span>
        </div>
        {pct >= 80 && (
          <p className="text-[12px] text-human">
            {pct >= 100
              ? "PM 예산을 다 썼습니다. 새 계획 요청은 거절됩니다."
              : "PM 예산의 80%를 넘었습니다. 남은 예산으로는 계획을 받지 못할 수 있습니다."}
          </p>
        )}
        {!status.ready && status.reason === "WORKER_OFFLINE" && (
          <div className="space-y-1.5">
            <p className="text-[12.5px] text-ink-700">
              대표 노트북에서 PM 작업기를 실행하세요. 켜면 몇 초 안에 준비됩니다
              {status.workerLastSeenAt && ` (마지막 확인 ${fmtDateTime(status.workerLastSeenAt)})`}.
            </p>
            <div className="max-w-[520px]">
              <CopyField value={`${CLI_NPX} pm-worker`} />
            </div>
          </div>
        )}
        {status.pendingPlanId && (
          <p className="flex items-center gap-1.5 text-[12px] text-ink-500">
            <Lock size={12} /> 작성 중인 계획이 끝나야 새로 요청할 수 있습니다.
          </p>
        )}
      </div>
    </div>
  );
}

function PmLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <AgentMark tone="pm" size={30} />
      <div className="min-w-0 pt-1">
        <div className="mb-0.5 text-[12px] font-semibold text-ink-500">PM</div>
        <p className="max-w-[640px] text-[14px] leading-6 text-ink-900">{children}</p>
      </div>
    </div>
  );
}

function MeLine({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%]">
        <div className="mb-0.5 text-right text-[12px] font-semibold text-ink-500">{name}</div>
        <div className="whitespace-pre-wrap rounded-2xl rounded-br-md bg-ink-100 px-4 py-2.5 text-[14px] leading-6">
          {children}
        </div>
      </div>
    </div>
  );
}
