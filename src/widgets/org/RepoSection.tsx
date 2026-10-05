"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { errorMessage, type Schemas } from "@/shared/api";
import type { TeamRole } from "@/shared/model";
import { Badge, Button, Input, SectionTitle, Segmented } from "@/shared/ui";
import { cn } from "@/shared/lib/format";
import { OwnershipBadge, useConnectRepos, useGithubRepos, useRepos } from "@/entities/repo";
import { TeamRoleBadge } from "@/entities/task";

/** "나중에"는 ownerRole을 보내지 않는다. undefined는 아직 고르지 않음 */
type RoleChoice = TeamRole | "LATER";

const ROLE_CHOICES: { value: RoleChoice | undefined; label: string }[] = [
  { value: "FRONTEND", label: "FE" },
  { value: "BACKEND", label: "BE" },
  { value: "LATER", label: "나중에" },
];

const FULL_NAME = /^[\w.-]+\/[\w.-]+$/;

type ConnectItem = { fullName: string; githubRepoId?: number; defaultBranch?: string };

export function RepoSection({ orgId, isRep }: { orgId: string; isRep: boolean }) {
  const repos = useRepos(orgId);

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
                <li key={r.id}>
                  <Link
                    href={`/org/repos/${r.id}`}
                    className="-mx-2 flex flex-wrap items-center gap-2 rounded-lg px-2 py-3 hover:bg-ink-50"
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
                </li>
              ))}
            </ul>
          )}
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
  const github = useGithubRepos(orgId, open);
  const connect = useConnectRepos(orgId);
  // 고른 레포 (fullName → 연결 정보)와 대표가 고른 소유 역할
  const [picked, setPicked] = useState<Map<string, ConnectItem>>(new Map());
  const [roles, setRoles] = useState<Record<string, RoleChoice | undefined>>({});
  const [manual, setManual] = useState("");

  const connectedNames = new Set(connected.map((r) => r.fullName.toLowerCase()));
  const connectedIds = new Set(connected.map((r) => r.githubRepoId).filter((id) => id !== null));
  const isConnected = (g: Schemas["GithubRepo"]) =>
    connectedIds.has(g.githubRepoId) || connectedNames.has(g.fullName.toLowerCase());

  const items = [...picked.values()];
  // 대표는 레포마다 소유 역할(또는 "나중에")을 직접 고른다. 기본값을 두지 않는다
  const missingRole = isRep && items.some((i) => roles[i.fullName] === undefined);

  const toggle = (item: ConnectItem) =>
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(item.fullName)) next.delete(item.fullName);
      else next.set(item.fullName, item);
      return next;
    });

  const manualName = manual.trim();
  const manualError =
    manualName && !FULL_NAME.test(manualName)
      ? "owner/repo 형식으로 입력하세요"
      : manualName && connectedNames.has(manualName.toLowerCase())
        ? "이미 연결된 레포입니다"
        : null;

  const submit = () =>
    connect.mutate(
      {
        repos: items.map((i) => {
          const role = roles[i.fullName];
          // 팀원은 ownerRole을 하나라도 넣으면 전체가 403이다 — 대표일 때만 보낸다
          return isRep && role && role !== "LATER" ? { ...i, ownerRole: role } : i;
        }),
      },
      {
        // 폼을 닫고 결과(connect.data)만 남긴다
        onSuccess: () => {
          setPicked(new Map());
          setRoles({});
          setManual("");
          setOpen(false);
        },
      },
    );

  if (!open) {
    return (
      <div className="mt-4 flex flex-col gap-2">
        {connect.data && <ConnectResult repos={connect.data.repos} />}
        <div>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            레포 연결
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-ink-200 p-4">
      <div className="text-[13.5px] font-medium">레포 연결</div>
      {!isRep && (
        <p className="text-[12.5px] text-ink-500">
          연결은 누구나 할 수 있습니다. 소유 역할(FE·BE)은 대표가 지정합니다.
        </p>
      )}

      {github.isPending ? (
        <div className="flex justify-center py-4 text-ink-400" aria-busy="true">
          <Loader2 size={16} className="animate-spin" aria-label="불러오는 중" />
        </div>
      ) : github.isError ? (
        <p className="text-[12.5px] text-forbidden">{errorMessage(github.error)}</p>
      ) : github.data.length > 0 ? (
        <ul className="max-h-64 divide-y divide-ink-100 overflow-y-auto rounded-lg border border-ink-100">
          {github.data.map((g) => {
            const done = isConnected(g);
            return (
              <li key={g.githubRepoId}>
                <label
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 text-[13px]",
                    done ? "text-ink-400" : "cursor-pointer hover:bg-ink-50",
                  )}
                >
                  <input
                    type="checkbox"
                    disabled={done}
                    checked={done || picked.has(g.fullName)}
                    onChange={() => toggle(g)}
                  />
                  <span className="font-mono">{g.fullName}</span>
                  {done && <span className="ml-auto text-[12px]">연결됨</span>}
                </label>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="space-y-2">
          <p className="text-[12.5px] text-ink-500">
            GitHub 연동이 설정되지 않았거나 접근 가능한 레포가 없습니다. 레포 이름을 직접 입력하세요.
          </p>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Input
                placeholder="owner/repo"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                className="h-9 font-mono text-[13px]"
                aria-invalid={manualError !== null}
              />
              {manualError && <p className="mt-1 text-[12px] text-forbidden">{manualError}</p>}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-0.5"
              disabled={!manualName || manualError !== null || picked.has(manualName)}
              onClick={() => {
                toggle({ fullName: manualName });
                setManual("");
              }}
            >
              추가
            </Button>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((i) => (
            <li key={i.fullName} className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="font-mono font-medium">{i.fullName}</span>
              {isRep && (
                <span className="ml-auto flex items-center gap-2">
                  <span className="text-[12px] text-ink-500">소유 역할</span>
                  <Segmented
                    options={ROLE_CHOICES}
                    value={roles[i.fullName]}
                    onChange={(v) => setRoles((prev) => ({ ...prev, [i.fullName]: v }))}
                  />
                </span>
              )}
              {github.data?.length === 0 && (
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className={cn("text-[12px] text-ink-500 hover:text-ink-900", !isRep && "ml-auto")}
                >
                  빼기
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {isRep && items.length > 0 && (
        <p className="text-[12px] text-ink-500">
          레포 전체(<code className="font-mono">**</code>)의 소유 역할입니다. 세부 경로는 연결 후 레포 화면에서 바꿀 수
          있습니다.
        </p>
      )}

      {connect.isError && <p className="text-[12.5px] text-forbidden">{errorMessage(connect.error)}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={items.length === 0 || missingRole || connect.isPending}>
          {connect.isPending ? "연결 중…" : items.length > 0 ? `${items.length}개 연결` : "연결"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false);
            setPicked(new Map());
            setRoles({});
            connect.reset();
          }}
        >
          닫기
        </Button>
      </div>
      {missingRole && <p className="text-[12px] text-ink-500">레포마다 소유 역할을 고르세요.</p>}
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
