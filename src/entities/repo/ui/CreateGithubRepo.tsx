"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { ApiError, errorMessage, type Schemas } from "@/shared/api";
import type { TeamRole } from "@/shared/model";
import { Button, Input, Segmented } from "@/shared/ui";
import { useCreateGithubRepo, useGithubOrgs } from "../api/repoApi";

const ROLE_CHOICES: { value: TeamRole | undefined; label: string }[] = [
  { value: "FRONTEND", label: "FE" },
  { value: "BACKEND", label: "BE" },
];

// 서버 규칙과 같다: 영숫자와 . _ - 만, 100자까지 (틀리면 400)
const REPO_NAME = /^[A-Za-z0-9._-]{1,100}$/;

const notLinked = (error: unknown) => error instanceof ApiError && error.code === "GITHUB_NOT_LINKED";

/** 대표 전용. GitHub 조직에 비공개 레포를 만들고 연결한다. 팀원에게는 렌더하지 않는다 (최종 판정은 403 NOT_REPRESENTATIVE) */
export function CreateGithubRepo({
  orgId,
  onCreated,
  onClose,
}: {
  orgId: string;
  onCreated: (repo: Schemas["CreatedGithubRepo"]) => void;
  onClose: () => void;
}) {
  const orgs = useGithubOrgs(orgId);
  const create = useCreateGithubRepo(orgId);
  const [githubOrg, setGithubOrg] = useState("");
  const [name, setName] = useState("");
  const [ownerRole, setOwnerRole] = useState<TeamRole | undefined>();

  const org = githubOrg || orgs.data?.[0] || "";
  const repoName = name.trim();
  const nameError = repoName && !REPO_NAME.test(repoName) ? "영문·숫자와 . _ - 만 쓸 수 있습니다 (100자까지)" : null;

  return (
    <div className="space-y-3 rounded-xl border border-ink-200 p-4">
      <div className="text-[13.5px] font-medium">새 레포 만들기</div>
      <p className="text-[12.5px] text-ink-500">
        GitHub 조직에 비공개 레포를 만들고 바로 연결합니다. 조직이 OAuth 앱 접근을 제한하고 있으면 GitHub 연결 승인
        화면에서 그 조직의 Grant/Request를 눌러 NOMOS 앱을 승인해야 합니다.
      </p>

      {orgs.isPending ? (
        <div className="flex justify-center py-4 text-ink-400" aria-busy="true">
          <Loader2 size={16} className="animate-spin" aria-label="불러오는 중" />
        </div>
      ) : orgs.isError ? (
        <p className="text-[12.5px] text-forbidden">
          {errorMessage(orgs.error)}
          {notLinked(orgs.error) && <AccountLink />}
        </p>
      ) : orgs.data.length === 0 ? (
        <p className="text-[12.5px] text-ink-700">
          레포를 만들 수 있는 GitHub 조직이 없습니다. 개인 계정에는 만들지 않습니다.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-start gap-2">
            <select
              value={org}
              onChange={(e) => setGithubOrg(e.target.value)}
              disabled={create.isPending}
              aria-label="GitHub 조직"
              className="h-9 rounded-lg border border-ink-200 bg-white px-2 font-mono text-[13px] outline-none focus:border-brand-500"
            >
              {orgs.data.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <div className="min-w-40 flex-1">
              <Input
                placeholder="레포 이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={create.isPending}
                maxLength={100}
                className="h-9 font-mono text-[13px]"
                aria-invalid={nameError !== null}
              />
              {nameError && <p className="mt-1 text-[12px] text-forbidden">{nameError}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-ink-500">소유 역할</span>
            <Segmented options={ROLE_CHOICES} value={ownerRole} onChange={setOwnerRole} disabled={create.isPending} />
          </div>
          {create.isError && (
            <p className="text-[12.5px] text-forbidden">
              {errorMessage(create.error)}
              {notLinked(create.error) && <AccountLink />}
            </p>
          )}
        </>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={!org || !repoName || nameError !== null || !ownerRole || create.isPending}
          onClick={() =>
            create.mutate(
              { githubOrg: org, name: repoName, ownerRole: ownerRole! },
              { onSuccess: (data) => onCreated(data.repo) },
            )
          }
        >
          {create.isPending ? "만드는 중…" : "만들기"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose} disabled={create.isPending}>
          닫기
        </Button>
      </div>
    </div>
  );
}

function AccountLink() {
  return (
    <>
      {" · "}
      <Link href="/settings/account" className="font-medium underline underline-offset-2">
        GitHub 연결하러 가기
      </Link>
    </>
  );
}
