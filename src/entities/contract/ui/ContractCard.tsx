"use client";

import { useState } from "react";
import { ChevronDown, Loader2, Lock } from "lucide-react";
import { errorMessage, type Schemas } from "@/shared/api";
import { Badge, Button, Textarea } from "@/shared/ui";
import { fmtDateTime } from "@/shared/lib/format";
import { useApproveContract, useReviseContract } from "../api/contractApi";

type Contract = Schemas["Contract"];

/** 수정 요청은 계약마다 3회 (넘으면 409 CONTRACT_REVISION_LIMIT). attempt는 1부터 — 수정 요청마다 +1 */
export const MAX_CONTRACT_REVISIONS = 3;

export const CONTRACT_STATUS: Record<
  Contract["status"],
  { label: string; tone: "info" | "warn" | "success" | "danger" }
> = {
  pending: { label: "작성 중", tone: "info" },
  draft: { label: "확인 대기", tone: "warn" },
  approved: { label: "확정", tone: "success" },
  failed: { label: "작성 실패", tone: "danger" },
};

/**
 * API 계약 한 건. 확정·수정 요청은 BE 담당(없으면 대표)만 — canDecide. 최종 판정은 403 NOT_CONTRACT_APPROVER.
 * 낙관적 업데이트 없음. 요청 중에는 버튼을 잠근다
 */
export function ContractCard({
  projectId,
  contract: c,
  canDecide,
}: {
  projectId: string;
  contract: Contract;
  canDecide: boolean;
}) {
  const approve = useApproveContract(projectId);
  const revise = useReviseContract(projectId);
  const [revising, setRevising] = useState(false);
  const [feedback, setFeedback] = useState("");
  const busy = approve.isPending || revise.isPending;
  const error = approve.error ?? revise.error;
  const remaining = Math.max(0, MAX_CONTRACT_REVISIONS - (c.attempt - 1));
  const decidable = canDecide && (c.status === "draft" || c.status === "failed");

  return (
    <section id={`contract-${c.featureKey}`} className="card scroll-mt-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[13px] font-semibold text-brand-600">{c.featureKey}</span>
        <h3 className="min-w-0 flex-1 truncate text-[14.5px] font-semibold">{c.specTitle}</h3>
        <Badge tone={CONTRACT_STATUS[c.status].tone}>
          {c.status === "approved" && <Lock size={10} />} {CONTRACT_STATUS[c.status].label}
        </Badge>
        <span className="text-[12px] text-ink-500">{c.attempt}회차</span>
      </div>

      {c.status === "pending" ? (
        <p className="mt-2 flex items-center gap-2 text-[13px] text-ink-700">
          <Loader2 size={14} className="animate-spin text-ink-400" />
          BE 노트북의 에이전트가 백엔드 코드를 읽고 초안을 쓰고 있습니다
          {c.feedback && <span className="text-ink-500"> · 수정 요청: {c.feedback}</span>}
        </p>
      ) : c.status === "failed" ? (
        <p className="mt-2 text-[13px] text-forbidden">{c.errorReason ?? "초안을 만들지 못했습니다."}</p>
      ) : (
        <div className="mt-2 space-y-3">
          {c.summary && <p className="whitespace-pre-wrap text-[13.5px] leading-6 text-ink-900">{c.summary}</p>}
          {c.openQuestions.length > 0 && (
            <div className="rounded-lg bg-human-bg px-3 py-2 text-[13px]">
              <p className="font-medium text-human">에이전트가 정하지 못한 것 {c.openQuestions.length}개</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-700">
                {c.openQuestions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          )}
          {c.schemaYaml && (
            <details className="group rounded-lg border border-ink-200">
              <summary className="flex cursor-pointer items-center gap-1.5 px-3 py-2 text-[12.5px] font-medium text-ink-700">
                OpenAPI 조각
                <ChevronDown size={13} className="ml-auto text-ink-400 transition group-open:rotate-180" />
              </summary>
              <pre className="max-h-96 overflow-auto border-t border-ink-100 bg-ink-50 p-3 font-mono text-[11.5px] leading-5">
                {c.schemaYaml}
              </pre>
            </details>
          )}
          {c.status === "approved" && c.approvedAt && (
            <p className="text-[12px] text-ink-500">{fmtDateTime(c.approvedAt)}에 확정 · 이제 바꿀 수 없습니다</p>
          )}
        </div>
      )}

      {decidable &&
        (revising ? (
          <div className="mt-3 space-y-2">
            <Textarea
              rows={2}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={busy}
              placeholder="무엇을 바꿔야 하나요? (선택 — 비우면 같은 조건으로 다시 씁니다)"
              aria-label="계약 수정 요청 내용"
              autoFocus
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                disabled={busy}
                onClick={() =>
                  revise.mutate(
                    { contractId: c.id, feedback: feedback.trim() || undefined },
                    {
                      onSuccess: () => {
                        setRevising(false);
                        setFeedback("");
                      },
                    },
                  )
                }
              >
                {revise.isPending ? "보내는 중…" : "수정 요청 보내기"}
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setRevising(false)}>
                취소
              </Button>
              <span className="text-[12px] text-ink-500">남은 수정 요청 {remaining}회</span>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
            {c.status === "draft" && (
              <Button size="sm" disabled={busy} onClick={() => approve.mutate(c.id)}>
                {approve.isPending ? "확정 중…" : "확정"}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={busy || remaining === 0}
              onClick={() => {
                approve.reset();
                revise.reset();
                setRevising(true);
              }}
            >
              수정 요청 ({MAX_CONTRACT_REVISIONS - remaining}/{MAX_CONTRACT_REVISIONS})
            </Button>
            <span className="text-[12px] text-ink-500">
              {remaining === 0
                ? "수정 요청은 최대 3회입니다."
                : c.status === "failed"
                  ? "수정 요청으로 다시 쓰게 합니다."
                  : "확정하면 잠기고 태스크 나누기에 쓰입니다."}
            </span>
          </div>
        ))}
      {error && <p className="mt-2 text-[12.5px] text-forbidden">{errorMessage(error)}</p>}
    </section>
  );
}
