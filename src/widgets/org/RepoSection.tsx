"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { errorMessage, type Schemas } from "@/shared/api";
import { Badge, Button, ConfirmButton, SectionTitle } from "@/shared/ui";
import { ConnectRepos, CreateGithubRepo, OwnershipBadge, useDisconnectRepo, useRepos } from "@/entities/repo";
import { TeamRoleBadge } from "@/entities/task";

export function RepoSection({ orgId, isRep }: { orgId: string; isRep: boolean }) {
  const repos = useRepos(orgId);
  const disconnect = useDisconnectRepo();

  return (
    <section className="card p-5">
      <SectionTitle>레포지토리</SectionTitle>
      {repos.isPending ? (
        <div className="flex justify-center py-6 text-ink-400" aria-busy="true">
          <Loader2 size={18} className="animate-spin" aria-label="불러오는 중" />
        </div>
      ) : repos.isError ? (
        <div className="py-4 text-center">
          <p className="text-[13px] text-ink-700">{errorMessage(repos.error)}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void repos.refetch()}>
            다시 시도
          </Button>
        </div>
      ) : (
        <>
          {repos.data.length === 0 ? (
            <p className="text-[13px] text-ink-500">아직 연결된 레포가 없습니다.</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {repos.data.map((r) => (
                <li key={r.id} className="flex items-center gap-2">
                  <Link
                    href={`/org/repos/${r.id}`}
                    className="-mx-2 flex min-w-0 flex-1 flex-wrap items-center gap-2 rounded-lg px-2 py-3 hover:bg-ink-50"
                  >
                    <span className="font-mono text-[13.5px] font-medium">{r.fullName}</span>
                    <span className="text-[12px] text-ink-500">{r.defaultBranch}</span>
                    {r.activeProjectName && (
                      <span className="text-[12px] text-ink-500">
                        · &lsquo;{r.activeProjectName}&rsquo;에서 사용 중
                      </span>
                    )}
                    <span className="ml-auto flex items-center gap-1.5">
                      <OwnershipBadge assigned={r.ownershipAssigned} />
                      <ChevronRight size={15} className="text-ink-400" aria-hidden />
                    </span>
                  </Link>
                  {/* 진행 중 프로젝트가 쓰면 409 REPO_IN_ACTIVE_PROJECT — 버튼을 미리 숨긴다 */}
                  {isRep && !r.activeProjectId && (
                    <ConfirmButton
                      label="연결 해제"
                      confirm="GitHub 레포는 그대로입니다."
                      pendingLabel="해제 중…"
                      pending={disconnect.isPending && disconnect.variables === r.id}
                      onConfirm={() => disconnect.mutate(r.id)}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
          {disconnect.isError && <p className="mt-2 text-[12.5px] text-forbidden">{errorMessage(disconnect.error)}</p>}
          {repos.data.some((r) => !r.ownershipAssigned) && (
            <p className="mt-2 text-[12.5px] text-ink-500">
              소유 역할이 없는 레포는 프로젝트에 넣을 수 없습니다.{" "}
              {isRep ? "레포를 눌러 지정하세요." : "대표가 지정해야 합니다."}
            </p>
          )}
          <ConnectForm orgId={orgId} isRep={isRep} connected={repos.data} />
        </>
      )}
    </section>
  );
}

function ConnectForm({
  orgId,
  isRep,
  connected,
}: {
  orgId: string;
  isRep: boolean;
  connected: Schemas["RepoListItem"][];
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  // 폼을 닫고 결과만 남긴다
  const [result, setResult] = useState<Schemas["ConnectedRepo"][] | null>(null);

  if (creating) {
    return (
      <div className="mt-4">
        {/* 만든 레포는 목록 무효화로 위에 나타난다 */}
        <CreateGithubRepo orgId={orgId} onClose={() => setCreating(false)} onCreated={() => setCreating(false)} />
      </div>
    );
  }

  if (open) {
    return (
      <div className="mt-4">
        <ConnectRepos
          orgId={orgId}
          isRep={isRep}
          connected={connected}
          onClose={() => setOpen(false)}
          onConnected={(repos) => {
            setResult(repos);
            setOpen(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      {result && <ConnectResult repos={result} />}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          레포 연결
        </Button>
        {/* 대표 전용 UI는 팀원에게 렌더하지 않는다 */}
        {isRep && (
          <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
            새 레포 만들기
          </Button>
        )}
      </div>
    </div>
  );
}

function ConnectResult({ repos }: { repos: Schemas["ConnectedRepo"][] }) {
  return (
    <ul className="space-y-1 rounded-lg bg-auto-bg px-3 py-2 text-[12.5px]">
      {repos.map((r) => (
        <li key={r.id} className="flex items-center gap-1.5">
          <span className="font-mono">{r.fullName}</span>
          연결됨 ·{" "}
          {r.rootOwnerRole ? (
            <>
              소유 역할 <TeamRoleBadge role={r.rootOwnerRole} />
            </>
          ) : (
            <Badge tone="warn">소유 역할 미지정</Badge>
          )}
        </li>
      ))}
    </ul>
  );
}
