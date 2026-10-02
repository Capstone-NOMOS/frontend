"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { errorMessage } from "@/shared/api";
import { Button, Logo } from "@/shared/ui";
import { fmtDateTime } from "@/shared/lib/format";
import { INVITE_INVALID, useAcceptInvite, useInvitePreview } from "@/entities/invite";
import { TeamRoleBadge } from "@/entities/task";
import { useCurrentUser } from "@/entities/user";

/** 로그인 없이도 열리는 화면이라 AuthGate로 감싸지 않는다. 로그인 여부는 useCurrentUser로만 본다 */
export function InviteView({ token }: { token: string }) {
  const router = useRouter();
  const { status, me } = useCurrentUser();
  const preview = useInvitePreview(token);
  const accept = useAcceptInvite(token);
  const here = `/invites/${encodeURIComponent(token)}`;

  if (status === "loading" || preview.isPending || accept.isSuccess) {
    return (
      <Frame>
        <div className="flex justify-center py-10 text-ink-400" aria-busy="true">
          <Loader2 size={20} className="animate-spin" aria-label="불러오는 중" />
        </div>
      </Frame>
    );
  }

  if (preview.isError) {
    return (
      <Frame>
        <Title>{errorMessage(preview.error)}</Title>
        <Button variant="outline" className="mt-5" onClick={() => void preview.refetch()}>
          다시 시도
        </Button>
      </Frame>
    );
  }

  const { orgName, valid, reason, teamRole, expiresAt } = preview.data;

  // 이미 조직이 있는 사람은 유효 여부와 상관없이 합류할 수 없다 (한 사람은 한 조직)
  if (me?.orgId) {
    // ponytail: 미리보기에 orgId가 없어 조직 이름으로 비교한다. 이름이 같은 다른 조직이면 틀린다 → BE에 orgId 추가 요청
    const sameOrg = me.orgName === orgName;
    return (
      <Frame>
        <Title>{sameOrg ? "이미 이 조직의 멤버입니다" : "이미 다른 조직에 속한 계정이라 합류할 수 없습니다"}</Title>
        {!sameOrg && <p className="mt-1 text-[13.5px] text-ink-500">한 계정은 하나의 조직에만 속할 수 있습니다.</p>}
        <Button href="/projects" variant="outline" className="mt-5">
          프로젝트 목록
        </Button>
      </Frame>
    );
  }

  if (!valid) {
    return (
      <Frame>
        <Title>{INVITE_INVALID[reason ?? "not_found"]}</Title>
        <p className="mt-1 text-[13.5px] text-ink-500">대표에게 새 링크를 요청하세요.</p>
      </Frame>
    );
  }

  const next = `?next=${encodeURIComponent(here)}`;
  return (
    <Frame>
      <div className="text-[12.5px] text-ink-500">조직 초대</div>
      <Title>{orgName}에 초대됐습니다</Title>
      <dl className="mt-4 space-y-2 rounded-xl bg-ink-50 p-4 text-[13px]">
        {teamRole && (
          <div className="flex items-center gap-2">
            <dt className="text-ink-500">역할</dt>
            <dd className="flex items-center gap-1.5">
              <TeamRoleBadge role={teamRole} />
              <span className="text-[12px] text-ink-500">참고용 · 실제 역할은 프로젝트에서 배정됩니다</span>
            </dd>
          </div>
        )}
        {expiresAt && (
          <div className="flex gap-2">
            <dt className="text-ink-500">만료</dt>
            <dd>{fmtDateTime(expiresAt)}</dd>
          </div>
        )}
      </dl>

      {status === "anonymous" ? (
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button href={`/login${next}`} size="lg" className="flex-1">
            로그인하고 합류
          </Button>
          <Button href={`/signup${next}`} size="lg" variant="outline" className="flex-1">
            가입하고 합류
          </Button>
        </div>
      ) : (
        <>
          <Button
            size="lg"
            className="mt-5 w-full"
            disabled={accept.isPending}
            onClick={() => accept.mutate(undefined, { onSuccess: () => router.replace("/connect?joined=1") })}
          >
            {accept.isPending ? "합류하는 중…" : `${orgName}에 합류`}
          </Button>
          {accept.isError && <p className="mt-2 text-[12.5px] text-forbidden">{errorMessage(accept.error)}</p>}
        </>
      )}
    </Frame>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col dots-bg">
      <header className="flex h-16 items-center px-5 sm:px-8">
        <Link href="/" aria-label="NOMOS 홈">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:pt-0">
        <div className="card w-full max-w-[460px] p-6 animate-rise sm:p-8">{children}</div>
      </main>
    </div>
  );
}

function Title({ children }: { children: ReactNode }) {
  return <h1 className="text-[20px] font-semibold tracking-tight">{children}</h1>;
}
