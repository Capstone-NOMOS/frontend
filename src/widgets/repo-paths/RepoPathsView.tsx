"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { errorMessage, type Schemas } from "@/shared/api";
import type { TeamRole } from "@/shared/model";
import { Badge, Button, Input, Logo, SectionTitle, Segmented } from "@/shared/ui";
import { cn } from "@/shared/lib/format";
import {
  ACCESS_LABEL,
  MANUAL_PRIORITY,
  OwnershipBadge,
  SOURCE_LABEL,
  findRootPath,
  forbiddenGlobChar,
  isLocked,
  useCreatePath,
  usePaths,
  useRepos,
  useUpdatePath,
} from "@/entities/repo";
import { TeamRoleBadge } from "@/entities/task";
import { AccountMenu, useCurrentUser } from "@/entities/user";

type RepoPath = Schemas["RepoPath"];
type Access = RepoPath["access"];

const OWNER_OPTIONS: { value: TeamRole | null; label: string }[] = [
  { value: "FRONTEND", label: "FE" },
  { value: "BACKEND", label: "BE" },
  { value: null, label: "상속" },
];
const ACCESS_OPTIONS = (Object.keys(ACCESS_LABEL) as Access[]).map((a) => ({ value: a, label: ACCESS_LABEL[a] }));

// PATCH가 성공하면 그 레포를 쓰는 프로젝트의 policy_hash가 바뀐다
const STALE_NOTICE = "변경됐습니다. 이 레포를 쓰는 프로젝트에서 실행 중인 에이전트는 토큰을 재발급해야 합니다.";

export function RepoPathsView({ repoId }: { repoId: string }) {
  // AuthGate 안쪽이므로 me와 orgId가 있다
  const me = useCurrentUser().me!;
  const isRep = me.orgRole === "REPRESENTATIVE";
  const repo = useRepos(me.orgId!).data?.find((r) => r.id === repoId);
  const paths = usePaths(repoId);

  return (
    <div className="min-h-dvh dots-bg">
      <header className="flex h-16 items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="NOMOS 홈">
          <Logo />
        </Link>
        <AccountMenu />
      </header>

      <main className="mx-auto max-w-[960px] space-y-4 px-4 pb-16 pt-4 sm:px-6">
        <div>
          <Link href="/org" className="inline-flex items-center gap-1 text-[13px] text-ink-500 hover:text-ink-900">
            <ArrowLeft size={14} /> 조직
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-[22px] font-semibold tracking-tight">{repo?.fullName ?? "레포"}</h1>
            {repo && <OwnershipBadge assigned={repo.ownershipAssigned} />}
          </div>
          <p className="mt-1 text-[13px] text-ink-500">
            경로 규칙은 priority가 높은 것이 이깁니다. 소유 역할이 비어 있는 규칙은 아래 규칙의 소유 역할을 따릅니다.
          </p>
        </div>

        {paths.isPending ? (
          <div className="flex justify-center py-10 text-ink-400" aria-busy="true">
            <Loader2 size={20} className="animate-spin" aria-label="불러오는 중" />
          </div>
        ) : paths.isError ? (
          <div className="card p-6 text-center">
            <p className="text-[13px] text-ink-700">{errorMessage(paths.error)}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void paths.refetch()}>
              다시 시도
            </Button>
          </div>
        ) : (
          <>
            <RootRule repoId={repoId} root={findRootPath(paths.data)} isRep={isRep} />
            <RuleTable repoId={repoId} paths={paths.data} isRep={isRep} />
            {isRep && <AddRule repoId={repoId} />}
          </>
        )}
      </main>
    </div>
  );
}

/** `**` 행 = 레포 전체의 기본 소유 역할. 비어 있으면 프로젝트에 넣을 수 없다 */
function RootRule({ repoId, root, isRep }: { repoId: string; root: RepoPath | undefined; isRep: boolean }) {
  const update = useUpdatePath(repoId);
  if (!root) return null;
  const owner = root.ownerRole;

  return (
    <section className={cn("card p-5", !owner && "border-human")}>
      <SectionTitle>레포 전체 (**)</SectionTitle>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[13px] text-ink-700">소유 역할</span>
        {isRep ? (
          <Segmented
            options={OWNER_OPTIONS.filter((o) => o.value !== null)}
            value={owner}
            disabled={update.isPending}
            onChange={(ownerRole) => update.mutate({ pathId: root.id, body: { ownerRole } })}
          />
        ) : owner ? (
          <TeamRoleBadge role={owner} />
        ) : (
          <Badge tone="warn">미지정</Badge>
        )}
        {update.isPending && <Loader2 size={14} className="animate-spin text-ink-400" aria-label="저장 중" />}
      </div>
      {!owner && (
        <p className="mt-3 text-[13px] text-human">
          소유 역할 미지정 — 프로젝트에 넣으려면 지정해야 합니다.{!isRep && " 대표가 지정할 수 있습니다."}
        </p>
      )}
      {update.isError && <p className="mt-2 text-[12.5px] text-forbidden">{errorMessage(update.error)}</p>}
      {update.isSuccess && <p className="mt-2 text-[12.5px] text-ink-500">{STALE_NOTICE}</p>}
    </section>
  );
}

function RuleTable({ repoId, paths, isRep }: { repoId: string; paths: RepoPath[]; isRep: boolean }) {
  const update = useUpdatePath(repoId);
  // 한 번에 한 행만 요청한다. 어느 행이 저장 중인지 표시용
  const pendingId = update.isPending ? update.variables?.pathId : undefined;

  return (
    <section className="card p-5">
      <SectionTitle>경로 규칙</SectionTitle>
      <div className="-mx-5 overflow-x-auto px-5">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead className="text-[12px] text-ink-500">
            <tr className="border-b border-ink-100">
              <th className="py-2 pr-3 font-medium">경로</th>
              <th className="py-2 pr-3 font-medium">소유 역할</th>
              <th className="py-2 pr-3 font-medium">접근</th>
              <th className="py-2 pr-3 font-medium">행동</th>
              <th className="py-2 pr-3 text-right font-medium">priority</th>
              <th className="py-2 font-medium">출처</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {paths.map((p) => {
              const locked = isLocked(p);
              const editable = isRep && !locked && p.pathPattern !== "**";
              const busy = pendingId === p.id;
              return (
                <tr key={p.id} className={cn(p.pathPattern === "**" && "bg-ink-50")}>
                  <td className="py-2 pr-3 font-mono">
                    <span className="inline-flex items-center gap-1.5">
                      {locked && <Lock size={12} className="text-ink-400" aria-label="조직 상한 — 수정 불가" />}
                      {p.pathPattern}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    {editable ? (
                      <Segmented
                        options={OWNER_OPTIONS}
                        value={p.ownerRole}
                        disabled={update.isPending}
                        onChange={(ownerRole) => update.mutate({ pathId: p.id, body: { ownerRole } })}
                      />
                    ) : p.ownerRole ? (
                      <TeamRoleBadge role={p.ownerRole} />
                    ) : (
                      <span className="text-[12px] text-ink-400">상위 규칙 상속</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {editable ? (
                      <Segmented
                        options={ACCESS_OPTIONS}
                        value={p.access}
                        disabled={update.isPending}
                        onChange={(access) => update.mutate({ pathId: p.id, body: { access } })}
                      />
                    ) : (
                      <AccessBadge access={p.access} />
                    )}
                  </td>
                  <td className="py-2 pr-3 font-mono text-[12px] text-ink-500">{p.actionKey ?? "—"}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-600">
                    {busy ? <Loader2 size={13} className="ml-auto animate-spin text-ink-400" /> : p.priority}
                  </td>
                  <td className="py-2 text-[12px] text-ink-500">{SOURCE_LABEL[p.source]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {update.isError && <p className="mt-3 text-[12.5px] text-forbidden">{errorMessage(update.error)}</p>}
      {update.isSuccess && <p className="mt-3 text-[12.5px] text-ink-500">{STALE_NOTICE}</p>}
      <p className="mt-3 text-[12px] text-ink-500">
        자물쇠가 있는 규칙(priority 900 이상)은 조직 상한이라 바꿀 수 없습니다. 행동·priority는 어떤 규칙도 바꿀 수
        없습니다.
      </p>
    </section>
  );
}

function AccessBadge({ access }: { access: Access }) {
  const tone = access === "write" ? "success" : access === "read" ? "neutral" : "danger";
  return <Badge tone={tone}>{ACCESS_LABEL[access]}</Badge>;
}

function AddRule({ repoId }: { repoId: string }) {
  const create = useCreatePath(repoId);
  const [pattern, setPattern] = useState("");
  const [ownerRole, setOwnerRole] = useState<TeamRole | null>(null);
  const [access, setAccess] = useState<Access>("write");
  const [priority, setPriority] = useState("");

  const bad = forbiddenGlobChar(pattern);
  const priorityNum = priority === "" ? undefined : Number(priority);
  const priorityError =
    priorityNum !== undefined &&
    (!Number.isInteger(priorityNum) || priorityNum < MANUAL_PRIORITY.min || priorityNum > MANUAL_PRIORITY.max)
      ? `${MANUAL_PRIORITY.min}~${MANUAL_PRIORITY.max} 사이 정수`
      : null;

  const submit = () =>
    create.mutate(
      { pathPattern: pattern.trim(), ownerRole, access, ...(priorityNum !== undefined && { priority: priorityNum }) },
      {
        onSuccess: () => {
          setPattern("");
          setPriority("");
        },
      },
    );

  return (
    <section className="card p-5">
      <SectionTitle>규칙 추가</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <div>
          <Input
            label="경로 패턴"
            placeholder="api/**"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            className="font-mono"
            aria-invalid={bad !== null}
          />
          {bad ? (
            <p className="mt-1.5 text-[12px] text-forbidden">
              <code className="font-mono">{bad}</code>는 쓸 수 없습니다. <code className="font-mono">**</code>,{" "}
              <code className="font-mono">*</code>, 리터럴만 허용합니다. 제외가 필요하면 priority로 푸세요.
            </p>
          ) : (
            <p className="mt-1.5 text-[12px] text-ink-500">
              <code className="font-mono">**</code>, <code className="font-mono">*</code>, 리터럴만 씁니다
            </p>
          )}
        </div>
        <div>
          <Input
            label="priority"
            type="number"
            inputMode="numeric"
            placeholder="자동"
            min={MANUAL_PRIORITY.min}
            max={MANUAL_PRIORITY.max}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            aria-invalid={priorityError !== null}
          />
          <p className={cn("mt-1.5 text-[12px]", priorityError ? "text-forbidden" : "text-ink-500")}>
            {priorityError ?? "비우면 가장 높은 순위"}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <span className="flex items-center gap-2 text-[13px]">
          소유 역할
          <Segmented options={OWNER_OPTIONS} value={ownerRole} onChange={setOwnerRole} />
        </span>
        <span className="flex items-center gap-2 text-[13px]">
          접근
          <Segmented options={ACCESS_OPTIONS} value={access} onChange={setAccess} />
        </span>
      </div>
      {create.isError && <p className="mt-3 text-[12.5px] text-forbidden">{errorMessage(create.error)}</p>}
      {create.isSuccess && <p className="mt-3 text-[12.5px] text-ink-500">추가됐습니다.</p>}
      <Button
        className="mt-4"
        size="sm"
        onClick={submit}
        disabled={!pattern.trim() || bad !== null || priorityError !== null || create.isPending}
      >
        {create.isPending ? "추가 중…" : "규칙 추가"}
      </Button>
    </section>
  );
}
