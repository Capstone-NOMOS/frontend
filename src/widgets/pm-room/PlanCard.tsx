"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Check, ChevronDown, Loader2, Sparkles, X } from "lucide-react";
import { errorDetails, errorMessage, type Schemas } from "@/shared/api";
import { Badge, Button, Markdown, Textarea } from "@/shared/ui";
import { cn, fmtDateTime } from "@/shared/lib/format";
import {
  MAX_REVISIONS,
  PLAN_FAILURE,
  PLAN_MODE,
  PlanStatusBadge,
  fmtUsdNumber,
  isSuperseded,
  revisionDepth,
  unassignedRefs,
  useApplyPlan,
  useRejectPlan,
  useRevisePlan,
} from "@/entities/plan";
import { TeamRoleBadge } from "@/entities/task";

type PmPlan = Schemas["PmPlan"];
type Draft = NonNullable<PmPlan["draft"]>;

const MAX_FEEDBACK = 8000;
const MAX_REASON = 1000;

export function PlanCard({
  projectId,
  plan,
  plans,
  started,
  onRetry,
  onApplied,
}: {
  projectId: string;
  plan: PmPlan;
  plans: PmPlan[];
  started: boolean;
  onRetry: (instruction: string) => void;
  onApplied: () => void;
}) {
  const depth = revisionDepth(plan, plans);
  const superseded = isSuperseded(plan, plans);
  const title = depth > 0 ? `계획 초안 · 수정 ${depth}` : "계획 초안";

  if (plan.status === "pending") return <PendingCard plan={plan} title={title} />;
  if (plan.status === "failed") return <FailedCard plan={plan} title={title} onRetry={onRetry} />;

  return (
    <Frame
      title={title}
      tone={plan.status === "applied" ? "success" : "brand"}
      right={
        <span className="flex items-center gap-2">
          <span className="text-[11.5px] font-normal tabular-nums opacity-80">{fmtUsdNumber(plan.costUsd)}</span>
          {superseded && plan.status === "ready" ? (
            <Badge>수정본으로 이어짐</Badge>
          ) : (
            <PlanStatusBadge status={plan.status} />
          )}
        </span>
      }
    >
      {plan.draft ? (
        <DraftBody draft={plan.draft} plan={plan} projectId={projectId} collapsed={superseded} />
      ) : (
        <p className="text-[13px] text-ink-500">초안 내용이 없습니다.</p>
      )}

      {plan.status === "applied" && (
        <div className="mt-4 rounded-lg bg-auto-bg px-3 py-2.5 text-[13px]">
          <p className="flex items-center gap-1.5 font-medium text-auto">
            <Check size={14} /> {plan.appliedAt && `${fmtDateTime(plan.appliedAt)}에 `}승인했습니다. 명세와 태스크가
            만들어졌습니다.
          </p>
          <p className="mt-1 text-ink-700">
            {started ? (
              "프로젝트가 진행 중이라 배정된 에이전트가 바로 가져갈 수 있습니다."
            ) : (
              <>
                멤버를 확인하고{" "}
                <Link href={`/p/${projectId}/settings#start`} className="font-medium underline underline-offset-2">
                  프로젝트를 시작
                </Link>
                하면 에이전트가 태스크를 받습니다.
              </>
            )}
          </p>
        </div>
      )}
      {plan.status === "rejected" && (
        <p className="mt-4 rounded-lg bg-ink-100 px-3 py-2.5 text-[13px] text-ink-700">
          반려했습니다{plan.rejectReason ? ` — ${plan.rejectReason}` : "."}
        </p>
      )}
      {plan.status === "ready" && !superseded && (
        <Actions projectId={projectId} plan={plan} depth={depth} onApplied={onApplied} />
      )}
    </Frame>
  );
}

function Frame({
  title,
  tone,
  right,
  children,
}: {
  title: string;
  tone: "brand" | "success" | "danger" | "neutral";
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const border = {
    brand: "border-brand-200",
    success: "border-auto",
    danger: "border-forbidden",
    neutral: "border-ink-200",
  }[tone];
  const head = {
    brand: "bg-brand-50 text-brand-600",
    success: "bg-auto-bg text-auto",
    danger: "bg-forbidden-bg text-forbidden",
    neutral: "bg-ink-50 text-ink-700",
  }[tone];
  return (
    <div className="flex gap-2.5">
      <span className="w-[30px] shrink-0" aria-hidden />
      <div className={cn("w-full max-w-[760px] overflow-hidden rounded-xl border bg-white shadow-card", border)}>
        <div className={cn("flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold", head)}>
          <Sparkles size={15} />
          <span className="min-w-0 flex-1 truncate">{title}</span>
          {right}
        </div>
        <div className="px-4 py-3.5">{children}</div>
      </div>
    </div>
  );
}

function PendingCard({ plan, title }: { plan: PmPlan; title: string }) {
  // 경과 시간만 1초마다 다시 그린다 (조회는 usePlans가 4초마다)
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const sec = Math.max(0, Math.floor((now - Date.parse(plan.createdAt)) / 1000));

  return (
    <Frame title={title} tone="neutral" right={<PlanStatusBadge status="pending" />}>
      <p className="flex items-center gap-2 text-[13.5px] text-ink-700">
        <Loader2 size={15} className="animate-spin text-ink-400" />
        PM이 명세와 태스크를 작성하고 있습니다 · {Math.floor(sec / 60)}분 {sec % 60}초
      </p>
      <p className="mt-1 text-[12px] text-ink-500">보통 1~3분 걸립니다. 화면을 떠나도 작성은 계속됩니다.</p>
    </Frame>
  );
}

function FailedCard({ plan, title, onRetry }: { plan: PmPlan; title: string; onRetry: (text: string) => void }) {
  const reason = plan.error?.reason;
  const detail = plan.error?.detail;
  return (
    <Frame title={title} tone="danger" right={<PlanStatusBadge status="failed" />}>
      <p className="text-[13.5px] text-ink-900">{reason ? PLAN_FAILURE[reason] : "계획을 만들지 못했습니다."}</p>
      {detail != null && (
        <details className="mt-2 text-[12.5px] text-ink-700">
          <summary className="cursor-pointer text-ink-500">자세히</summary>
          {/* detail 형식은 사유마다 다르다(invalid면 problems 목록) — 문자열로 안전하게 보여준다 */}
          <pre className="mt-1.5 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-ink-50 p-2.5 font-mono text-[11.5px]">
            {typeof detail === "string" ? detail : JSON.stringify(detail, null, 2)}
          </pre>
        </details>
      )}
      {plan.instruction && (
        <Button variant="outline" size="sm" className="mt-3" onClick={() => onRetry(plan.instruction!)}>
          같은 지시로 다시 요청
        </Button>
      )}
    </Frame>
  );
}

function DraftBody({
  draft,
  plan,
  projectId,
  collapsed,
}: {
  draft: Draft;
  plan: PmPlan;
  projectId: string;
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(!collapsed);
  const missing = unassignedRefs(plan);
  const agentOf = (ref: string) => plan.assignments.find((a) => a.ref === ref)?.agent;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-[12.5px] text-ink-500 hover:text-ink-900"
      >
        <ChevronDown size={14} /> 명세 {draft.specs.length}개 · 태스크 {draft.tasks.length}개 펼치기
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-ink-700">
        <Badge tone="brand">{PLAN_MODE[draft.mode]}</Badge>
        <span>예상 {draft.estimate.workingDays}일</span>
        {draft.estimate.notes && <span className="text-ink-500">· {draft.estimate.notes}</span>}
      </div>

      {/* 명세 F-09의 "결정이 필요한 것"에 해당하는 필드가 아직 없다 — 근거와 가정을 보여준다 */}
      <section>
        <h4 className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">근거와 가정</h4>
        <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-6 text-ink-900">{draft.rationale}</p>
      </section>

      <section>
        <h4 className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">명세 {draft.specs.length}개</h4>
        <div className="mt-1.5 space-y-1.5">
          {draft.specs.map((spec) => (
            <details key={spec.featureKey} className="group rounded-lg border border-ink-200">
              <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-[13.5px] font-medium">
                <span className="font-mono text-[12px] text-brand-600">{spec.featureKey}</span>
                <span className="min-w-0 flex-1 truncate">{spec.title}</span>
                <ChevronDown size={14} className="text-ink-400 transition group-open:rotate-180" />
              </summary>
              <div className="border-t border-ink-100 px-3 py-2">
                <Markdown content={spec.content} className="text-[13px]" />
              </div>
            </details>
          ))}
        </div>
      </section>

      <section>
        <h4 className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">
          태스크 {draft.tasks.length}개
        </h4>
        <div className="-mx-4 mt-1.5 overflow-x-auto px-4">
          <table className="w-full min-w-[640px] text-left text-[12.5px]">
            <thead className="text-[11.5px] text-ink-500">
              <tr className="border-b border-ink-100">
                <th className="py-1.5 pr-2 font-medium">ref</th>
                <th className="py-1.5 pr-2 font-medium">태스크</th>
                <th className="py-1.5 pr-2 font-medium">역할</th>
                <th className="py-1.5 pr-2 font-medium">레포</th>
                <th className="py-1.5 pr-2 font-medium">명세</th>
                <th className="py-1.5 pr-2 font-medium">선행</th>
                <th className="py-1.5 font-medium">담당</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {draft.tasks.map((t) => {
                const agent = agentOf(t.ref);
                return (
                  <tr key={t.ref} className="align-top">
                    <td className="py-1.5 pr-2 font-mono text-ink-500">{t.ref}</td>
                    <td className="py-1.5 pr-2">
                      {t.title}
                      {t.kind !== "IMPLEMENT" && <span className="ml-1 text-[11px] text-ink-500">({t.kind})</span>}
                    </td>
                    <td className="py-1.5 pr-2">
                      {t.teamRole ? <TeamRoleBadge role={t.teamRole} /> : <span className="text-ink-500">통합</span>}
                    </td>
                    <td className="py-1.5 pr-2 font-mono text-[11.5px] text-ink-700">{t.repo}</td>
                    <td className="py-1.5 pr-2 font-mono text-[11.5px] text-ink-700">{t.spec ?? "—"}</td>
                    <td className="py-1.5 pr-2 font-mono text-[11.5px] text-ink-500">
                      {t.dependsOn.length > 0 ? t.dependsOn.join(", ") : "—"}
                    </td>
                    <td className="py-1.5">
                      {agent ? (
                        <span>
                          {agent.name}
                          <span className="text-ink-500"> · {agent.nickname ?? "이름 없음"}</span>
                        </span>
                      ) : agent === null ? (
                        <Badge tone="danger">담당 없음</Badge>
                      ) : (
                        <span className="text-ink-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {plan.status === "ready" && missing.length > 0 && (
        <div className="rounded-lg border border-human bg-human-bg px-3 py-2.5 text-[13px]">
          <p className="flex items-center gap-1.5 font-semibold text-human">
            <AlertTriangle size={14} /> 담당 에이전트가 없는 태스크 {missing.length}개
          </p>
          <p className="mt-1 text-ink-700">
            {missing.join(", ")} — 이 역할에 배정된 에이전트가 없어 적용해도 아무도 가져가지 않고, 프로젝트를 시작할 수
            없습니다.{" "}
            <Link href={`/p/${projectId}/settings#members`} className="font-medium underline underline-offset-2">
              역할 배정
            </Link>
            을 먼저 하세요. 배정하면 담당이 다시 계산됩니다.
          </p>
        </div>
      )}
    </div>
  );
}

type Mode = "idle" | "apply" | "revise" | "reject";

function Actions({
  projectId,
  plan,
  depth,
  onApplied,
}: {
  projectId: string;
  plan: PmPlan;
  depth: number;
  onApplied: () => void;
}) {
  const apply = useApplyPlan(projectId);
  const revise = useRevisePlan(projectId);
  const reject = useRejectPlan(projectId);
  const [mode, setMode] = useState<Mode>("idle");
  const [feedback, setFeedback] = useState("");
  const [reason, setReason] = useState("");

  const remaining = Math.max(0, MAX_REVISIONS - depth);
  const busy = apply.isPending || revise.isPending || reject.isPending;
  const error = apply.error ?? revise.error ?? reject.error;
  const details = errorDetails(error);
  const specs = plan.draft?.specs.length ?? 0;
  const tasks = plan.draft?.tasks.length ?? 0;

  const reset = () => {
    apply.reset();
    revise.reset();
    reject.reset();
  };
  const open = (m: Mode) => {
    reset();
    setMode(m);
  };

  return (
    <div className="mt-4 border-t border-ink-100 pt-3">
      {mode === "apply" ? (
        <Confirm
          text={`명세 ${specs}개와 태스크 ${tasks}개가 만들어집니다. 프로젝트는 아직 시작되지 않습니다.`}
          confirmLabel={apply.isPending ? "적용 중…" : "승인"}
          disabled={busy}
          onConfirm={() => apply.mutate(plan.id, { onSuccess: onApplied, onSettled: () => setMode("idle") })}
          onCancel={() => setMode("idle")}
        />
      ) : mode === "revise" ? (
        <div className="space-y-2">
          <Textarea
            rows={3}
            value={feedback}
            maxLength={MAX_FEEDBACK}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="무엇을 바꿔야 하나요? (예: 출석체크는 다음 단계로 미루고, 스터디 개설에 정원 설정을 넣어줘)"
            aria-label="수정 요청 내용"
            autoFocus
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              disabled={!feedback.trim() || busy}
              onClick={() =>
                revise.mutate(
                  { planId: plan.id, body: { feedback: feedback.trim() } },
                  { onSuccess: () => setFeedback("") },
                )
              }
            >
              {revise.isPending ? "보내는 중…" : "수정 요청 보내기"}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setMode("idle")}>
              취소
            </Button>
            <span className="text-[12px] text-ink-500">남은 수정 요청 {remaining}회</span>
          </div>
        </div>
      ) : mode === "reject" ? (
        <div className="space-y-2">
          <Textarea
            rows={2}
            value={reason}
            maxLength={MAX_REASON}
            onChange={(e) => setReason(e.target.value)}
            placeholder="반려 사유 (선택)"
            aria-label="반려 사유"
            autoFocus
          />
          <Confirm
            text="반려하면 이 초안은 다시 승인하거나 수정 요청할 수 없습니다. 고쳐서 다시 받으려면 수정 요청을 쓰세요."
            confirmLabel={reject.isPending ? "반려 중…" : "반려"}
            danger
            disabled={busy}
            onConfirm={() =>
              reject.mutate(
                { planId: plan.id, reason: reason.trim() || undefined },
                { onSettled: () => setMode("idle") },
              )
            }
            onCancel={() => setMode("idle")}
          />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" disabled={busy} onClick={() => open("apply")}>
            <Check size={14} /> 승인
          </Button>
          <Button size="sm" variant="outline" disabled={busy || remaining === 0} onClick={() => open("revise")}>
            수정 요청 ({depth}/{MAX_REVISIONS})
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => open("reject")}>
            <X size={14} /> 반려
          </Button>
          <span className="text-[12px] text-ink-500">
            {remaining === 0
              ? "수정 요청은 최대 3회입니다."
              : "승인 전에는 어떤 태스크도 에이전트에 전달되지 않습니다."}
          </span>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg bg-forbidden-bg px-3 py-2 text-[12.5px]">
          <p className="font-medium text-forbidden">{errorMessage(error)}</p>
          {details.length > 0 && (
            <ul className="mt-1.5 space-y-1 text-ink-700">
              {details.map((d, i) => (
                <li key={i}>
                  <span className="font-mono text-[11.5px] text-ink-500">{d.where}</span> {d.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Confirm({
  text,
  confirmLabel,
  danger = false,
  disabled,
  onConfirm,
  onCancel,
}: {
  text: string;
  confirmLabel: string;
  danger?: boolean;
  disabled: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className={cn("rounded-lg px-3 py-2.5", danger ? "bg-forbidden-bg" : "bg-brand-50")}>
      <p className="text-[13px] text-ink-900">{text}</p>
      <div className="mt-2 flex gap-2">
        <Button size="sm" variant={danger ? "danger" : "primary"} disabled={disabled} onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button size="sm" variant="ghost" disabled={disabled} onClick={onCancel}>
          취소
        </Button>
      </div>
    </div>
  );
}
