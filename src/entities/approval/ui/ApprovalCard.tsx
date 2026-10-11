"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { errorMessage, type Schemas } from "@/shared/api";
import { Badge, Button, Textarea } from "@/shared/ui";
import { fmtDateTime, relTime } from "@/shared/lib/format";
import { useDecideApproval } from "../api/approvalApi";

type Approval = Schemas["Approval"];

const MAX_REASON = 2000;

const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

interface ReleaseTask {
  taskId: string;
  title: string;
  teamRole: string | null;
  repo: string | null;
  branchName: string | null;
  commitSha: string | null;
}

/** G3 payload.tasks: 대표가 머지하고 실행해 볼 브랜치와 마지막 커밋. 형식이 다른 항목은 버린다 */
function releaseTasks(v: unknown): ReleaseTask[] {
  if (!Array.isArray(v)) return [];
  return v.filter((t): t is ReleaseTask => typeof t === "object" && t !== null && typeof t.title === "string");
}

/**
 * 승인 카드. 결정은 대표만(canDecide).
 * - ACTION: 검증은 통과했지만 정책 판정이 HUMAN·PM_REVIEW라 멈춘 산출물. 승인하면 태스크 DONE, 반려하면 READY로 돌아가 재시도 +1 (3회째 ESCALATED)
 * - G3: 통합 확인(프로젝트 전체, taskId 없음). 모든 태스크가 DONE이 되면 생긴다. 승인하면 프로젝트 completed, 반려하면 진행 중 그대로
 */
export function ApprovalCard({
  approval: a,
  canDecide,
  taskHref,
  onDecided,
}: {
  approval: Approval;
  canDecide: boolean;
  /** G3는 태스크가 없다 */
  taskHref?: string;
  onDecided?: () => void;
}) {
  const decide = useDecideApproval();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const p = a.payload;
  const actions = strings(p.triggeredActions).filter((k) => k !== "artifact:submit");
  const paths = strings(p.changedPaths);
  const commit = typeof p.commitSha === "string" ? p.commitSha : null;
  const attempt = typeof p.attempt === "number" ? p.attempt : null;
  const release = a.gate === "G3";
  const checks = strings(p.integrationChecks);
  const tasks = releaseTasks(p.tasks);

  const run = (decision: "approve" | "reject") =>
    decide.mutate(
      { id: a.id, decision, ...(decision === "reject" && { reason: reason.trim() }) },
      { onSettled: onDecided },
    );

  return (
    <div id={a.id} className="card scroll-mt-6 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {release ? (
          <Badge tone="warn">G3 · 통합 확인</Badge>
        ) : a.gateMode === "PM_REVIEW" ? (
          <Badge tone="pm">PM 검토 · 대표 대행</Badge>
        ) : (
          <Badge tone="warn">사람 승인</Badge>
        )}
        {taskHref ? (
          <Link href={taskHref} className="min-w-0 flex-1 truncate text-[14px] font-semibold hover:underline">
            {a.taskTitle ?? "태스크"}
          </Link>
        ) : (
          <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">
            {release ? "모든 태스크 완료 · 프로젝트 완료 승인" : (a.taskTitle ?? "태스크")}
          </span>
        )}
        <span className="text-[11.5px] text-ink-500" title={fmtDateTime(a.requestedAt)}>
          {relTime(a.requestedAt)}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[12.5px]">
        {actions.length > 0 && (
          <>
            <dt className="text-ink-500">감지된 행동</dt>
            <dd className="flex flex-wrap gap-1">
              {actions.map((k) => (
                <code key={k} className="rounded bg-ink-100 px-1.5 font-mono text-[11.5px]">
                  {k}
                </code>
              ))}
            </dd>
          </>
        )}
        {commit && (
          <>
            <dt className="text-ink-500">커밋</dt>
            <dd className="font-mono">
              {commit.slice(0, 7)}
              {attempt !== null && <span className="font-sans text-ink-500"> · {attempt}회차 제출</span>}
            </dd>
          </>
        )}
        {paths.length > 0 && (
          <>
            <dt className="text-ink-500">바뀐 파일</dt>
            <dd>
              <details>
                <summary className="cursor-pointer text-ink-700">{paths.length}개</summary>
                <ul className="mt-1 max-h-40 overflow-y-auto font-mono text-[11.5px] text-ink-700">
                  {paths.map((path) => (
                    <li key={path}>{path}</li>
                  ))}
                </ul>
              </details>
            </dd>
          </>
        )}
      </dl>
      {release && (
        <div className="mt-3 space-y-3 text-[12.5px]">
          <p className="text-ink-700">
            에이전트는 통합을 확인하지 않습니다. 아래 브랜치를 머지해 실행해 보고 확인 항목을 직접 점검하세요.
          </p>
          {checks.length > 0 && (
            <div>
              <div className="text-ink-500">확인 항목 {checks.length}개</div>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] text-ink-900">
                {checks.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          {tasks.length > 0 && (
            <details>
              <summary className="cursor-pointer text-ink-700">브랜치 · 마지막 커밋 {tasks.length}개</summary>
              <ul className="mt-1 space-y-1">
                {tasks.map((t) => (
                  <li key={t.taskId} className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium">{t.title}</span>
                    <span className="font-mono text-[11.5px] text-ink-700">
                      {t.repo}
                      {t.branchName && ` · ${t.branchName}`}
                      {t.commitSha && ` @ ${t.commitSha.slice(0, 7)}`}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      {p.backfilled === true && (
        <p className="mt-2 text-[12px] text-ink-500">승인 기능 이전부터 멈춰 있던 태스크라 정보 일부가 없습니다.</p>
      )}

      {a.decision ? (
        <p className="mt-3 text-[13px]">
          {a.decision === "APPROVE" ? (
            <span className="font-medium text-auto">승인됨</span>
          ) : (
            <span className="font-medium text-forbidden">반려됨{a.reason && ` — ${a.reason}`}</span>
          )}
          {a.decidedAt && <span className="text-ink-500"> · {fmtDateTime(a.decidedAt)}</span>}
        </p>
      ) : !canDecide ? (
        <p className="mt-3 text-[12.5px] text-ink-500">대표가 승인하거나 반려합니다.</p>
      ) : rejecting ? (
        <div className="mt-3 space-y-2">
          <Textarea
            rows={2}
            value={reason}
            maxLength={MAX_REASON}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              release
                ? "반려 사유 (필수) — 무엇이 통합되지 않았는지 남깁니다"
                : "반려 사유 (필수) — 에이전트가 다시 고칠 때 이 사유를 받습니다"
            }
            aria-label="반려 사유"
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="danger"
              disabled={!reason.trim() || decide.isPending}
              onClick={() => run("reject")}
            >
              {decide.isPending ? "반려 중…" : "반려"}
            </Button>
            <Button size="sm" variant="ghost" disabled={decide.isPending} onClick={() => setRejecting(false)}>
              취소
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" disabled={decide.isPending} onClick={() => run("approve")}>
            <Check size={14} /> {decide.isPending ? "승인 중…" : "승인"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={decide.isPending}
            onClick={() => {
              decide.reset();
              setRejecting(true);
            }}
          >
            <X size={14} /> 반려
          </Button>
          <span className="text-[12px] text-ink-500">
            {release
              ? "승인하면 프로젝트가 완료됩니다. 반려하면 진행 중 그대로이고, 고칠 태스크를 만들어 전부 끝나면 새 카드가 생깁니다."
              : "반려하면 태스크가 다시 대기로 돌아가 에이전트가 고칩니다."}
          </span>
        </div>
      )}
      {decide.isError && <p className="mt-2 text-[12.5px] text-forbidden">{errorMessage(decide.error)}</p>}
    </div>
  );
}
