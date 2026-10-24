"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { errorDetails, errorMessage } from "@/shared/api";
import type { TeamRole } from "@/shared/model";
import { Button } from "@/shared/ui";
import { useProject, useStartProject } from "@/entities/project";
import { TeamRoleBadge } from "@/entities/task";

const ROLES: TeamRole[] = ["FRONTEND", "BACKEND"];

/**
 * 태스크를 확정한 뒤 대표 룸에서 바로 시작한다. 지금 배정을 보여 주고 한 번 더 확인받는다.
 * 미리 막지 않는다 — 시작할 수 없으면 422 PROJECT_START_INVALID의 details를 그대로 보여 준다
 */
export function StartProject({ projectId }: { projectId: string }) {
  const members = useProject(projectId).data?.members ?? [];
  const start = useStartProject(projectId);
  const [confirming, setConfirming] = useState(false);
  const details = errorDetails(start.error);

  return (
    <div className="mt-3">
      {confirming ? (
        <div className="rounded-lg border border-human bg-white p-3">
          <p className="text-[13px] font-medium">시작하면 배정된 에이전트가 바로 태스크를 받습니다.</p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[12.5px] text-ink-700">
            지금 배정:
            {ROLES.map((role) => (
              <span key={role} className="inline-flex items-center gap-1">
                <TeamRoleBadge role={role} /> {members.find((m) => m.teamRole === role)?.agentName ?? "없음"}
              </span>
            ))}
          </p>
          <div className="mt-2.5 flex gap-2">
            <Button
              size="sm"
              disabled={start.isPending}
              onClick={() => start.mutate(undefined, { onSettled: () => setConfirming(false) })}
            >
              {start.isPending ? "시작하는 중…" : "시작"}
            </Button>
            <Button size="sm" variant="ghost" disabled={start.isPending} onClick={() => setConfirming(false)}>
              닫기
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" onClick={() => setConfirming(true)}>
          <Play size={14} /> 프로젝트 시작
        </Button>
      )}
      {start.isError && (
        <div className="mt-2 text-[12.5px] text-forbidden">
          <p>{errorMessage(start.error)}</p>
          {details.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-ink-700">
              {details.map((d) => (
                <li key={`${d.where}:${d.message}`}>{d.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
