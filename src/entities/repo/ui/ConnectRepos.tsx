"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { errorMessage, type Schemas } from "@/shared/api";
import type { TeamRole } from "@/shared/model";
import { Button, Input, Segmented } from "@/shared/ui";
import { cn } from "@/shared/lib/format";
import { useConnectRepos, useGithubRepos } from "../api/repoApi";

/** "나중에"는 ownerRole을 보내지 않는다. undefined는 아직 고르지 않음 */
type RoleChoice = TeamRole | "LATER";

const ROLE_CHOICES: { value: RoleChoice | undefined; label: string }[] = [
  { value: "FRONTEND", label: "FE" },
  { value: "BACKEND", label: "BE" },
  { value: "LATER", label: "나중에" },
];

const FULL_NAME = /^[\w.-]+\/[\w.-]+$/;

type ConnectItem = { fullName: string; githubRepoId?: number; defaultBranch?: string };

/**
 * 기존 GitHub 레포를 조직에 연결하는 폼. 조직 설정과 새 프로젝트(레포 단계)가 함께 쓴다.
 * 성공하면 onConnected로 결과를 넘긴다 — 폼을 닫는 건 부모 몫
 */
export function ConnectRepos({
  orgId,
  isRep,
  connected,
  onClose,
  onConnected,
}: {
  orgId: string;
  isRep: boolean;
  connected: Schemas["RepoListItem"][];
  onClose: () => void;
  onConnected: (repos: Schemas["ConnectedRepo"][]) => void;
}) {
  const github = useGithubRepos(orgId, true);
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
      { onSuccess: (data) => onConnected(data.repos) },
    );

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
            대표가 GitHub를 연결하면 목록이 보입니다. 지금은 레포 이름을 직접 입력하세요.
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
        <Button variant="ghost" size="sm" onClick={onClose}>
          닫기
        </Button>
      </div>
      {missingRole && <p className="text-[12px] text-ink-500">레포마다 소유 역할을 고르세요.</p>}
    </div>
  );
}
