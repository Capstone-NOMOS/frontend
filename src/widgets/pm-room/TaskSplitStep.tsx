"use client";

import Link from "next/link";
import { Scissors } from "lucide-react";
import { ApiError, errorMessage } from "@/shared/api";
import { Badge, Button } from "@/shared/ui";
import { CONTRACT_STATUS, useContracts } from "@/entities/contract";
import { ROLE_ROOM } from "@/entities/room";
import { useRequestPlan } from "@/entities/plan";
import { useSpecs } from "@/entities/spec";

/** 409 CONTRACTS_NOT_APPROVED의 details: { featureKeys } — 아직 확정되지 않은 기능 */
function pendingFeatureKeys(error: unknown): string[] {
  if (!(error instanceof ApiError) || error.code !== "CONTRACTS_NOT_APPROVED") return [];
  const keys = (error.details as { featureKeys?: unknown } | undefined)?.featureKeys;
  return Array.isArray(keys) ? keys.filter((k): k is string => typeof k === "string") : [];
}

/**
 * 새 계획 흐름 2·3단계. 기능 명세가 확정된 뒤에만 보인다: API 계약 현황(확정은 BE 담당이 BE 룸에서) + 태스크 나누기.
 * 미리 막지 않는다 — 계약이 덜 끝났으면 서버의 409 CONTRACTS_NOT_APPROVED를 그대로 안내한다
 */
export function TaskSplitStep({ projectId, blocked }: { projectId: string; blocked: boolean }) {
  const specs = useSpecs(projectId).data;
  const contracts = useContracts(projectId).data ?? [];
  const split = useRequestPlan(projectId);
  if (!specs?.length) return null;

  const open = contracts.filter((c) => c.status !== "approved");
  const missing = pendingFeatureKeys(split.error);
  // 계약 확정은 BE 룸에서 한다 (adr/0013)
  const contractsHref = `/p/${projectId}/rooms/${ROLE_ROOM.BACKEND.slug}`;

  return (
    <div className="flex gap-2.5">
      <span className="w-[30px] shrink-0" aria-hidden />
      <div className="w-full max-w-[760px] rounded-xl border border-ink-200 bg-white px-4 py-3.5 shadow-card">
        <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold">
          <Scissors size={15} className="text-ink-500" /> 다음 단계 · 태스크 나누기
        </div>
        <p className="mt-1.5 text-[13px] text-ink-700">
          확정된 기능 명세 {specs.length}개
          {contracts.length > 0 ? (
            <>
              {" "}
              · API 계약 {contracts.length - open.length}/{contracts.length} 확정 ·{" "}
              <Link href={contractsHref} className="font-medium underline underline-offset-2">
                BE 룸에서 확정
              </Link>
            </>
          ) : (
            " · 서버 API가 필요한 기능이 없어 계약 없이 나눌 수 있습니다"
          )}
        </p>
        {open.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {open.map((c) => (
              <li key={c.id} className="flex items-center gap-1 text-[12px]">
                <span className="font-mono text-brand-600">{c.featureKey}</span>
                <Badge tone={CONTRACT_STATUS[c.status].tone}>{CONTRACT_STATUS[c.status].label}</Badge>
              </li>
            ))}
          </ul>
        )}
        {open.length > 0 && (
          <p className="mt-1.5 text-[12px] text-ink-500">
            백엔드 담당이 계약을 모두 확정해야 나눌 수 있습니다(BE 담당이 없으면 대표가 확정).
          </p>
        )}

        <Button size="sm" className="mt-3" disabled={blocked || split.isPending} onClick={() => split.mutate({})}>
          {split.isPending ? "요청 중…" : "태스크 나누기"}
        </Button>
        {split.isError && (
          <div className="mt-2 text-[12.5px] text-forbidden">
            <p>{errorMessage(split.error)}</p>
            {missing.length > 0 && (
              <p className="mt-0.5 text-ink-700">
                확정되지 않은 기능: <span className="font-mono">{missing.join(", ")}</span> ·{" "}
                <Link href={contractsHref} className="font-medium underline underline-offset-2">
                  BE 룸에서 확정
                </Link>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
