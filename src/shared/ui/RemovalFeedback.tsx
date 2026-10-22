"use client";

import { useState, type ReactNode } from "react";
import { errorMessage, heldTasks, type Schemas } from "@/shared/api";
import { Button } from "./index";

/** 되돌리기 번거로운 동작(해제·내보내기·탈퇴) 버튼. 한 번 누르면 그 자리에서 확인을 묻는다. 요청 중에는 잠근다 */
export function ConfirmButton({
  label,
  confirm,
  pendingLabel,
  pending,
  onConfirm,
}: {
  label: string;
  confirm: ReactNode;
  pendingLabel: string;
  pending: boolean;
  onConfirm: () => void;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking && !pending) {
    return (
      <Button variant="outline" size="sm" onClick={() => setAsking(true)}>
        {label}
      </Button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="text-[12.5px] text-ink-700">{confirm}</span>
      <Button variant="danger" size="sm" disabled={pending} onClick={onConfirm}>
        {pending ? pendingLabel : label}
      </Button>
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => setAsking(false)}>
        취소
      </Button>
    </span>
  );
}

/** 해제·내보내기·탈퇴 실패. 409 ACTIVE_TASKS_HELD면 붙잡고 있는 태스크 목록을 함께 보여 준다 */
export function RemovalError({ error }: { error: unknown }) {
  const tasks = heldTasks(error);
  return (
    <div className="text-[12.5px] text-forbidden">
      <p>{errorMessage(error)}</p>
      {tasks.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-ink-700">
          {tasks.map((t) => (
            <li key={t.taskId}>
              <span className="font-mono text-[11px] text-ink-500">{t.state}</span> {t.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * GitHub 접근 회수 결과. 회수가 실패해도 해제는 끝났다 — skipped·failed만 사람이 GitHub에서 정리하면 된다.
 * 할 일이 없으면(빈 배열·전부 성공) 아무것도 그리지 않는다
 */
export function RevocationNotice({ results }: { results: Schemas["GithubRevokeResult"][] | undefined }) {
  const left = results?.filter((r) => r.status === "skipped" || r.status === "failed") ?? [];
  if (left.length === 0) return null;
  return (
    <div className="rounded-lg bg-human-bg px-3 py-2 text-[12.5px] text-human">
      <p className="font-medium">GitHub에서 직접 정리가 필요합니다 — 아래 레포의 협업자 권한을 회수하지 못했습니다.</p>
      <ul className="mt-1 space-y-0.5 text-ink-700">
        {left.map((r) => (
          <li key={r.repoId}>
            <span className="font-mono">{r.fullName}</span>
            {r.reason && ` · ${r.reason}`}
          </li>
        ))}
      </ul>
    </div>
  );
}
