"use client";

import Link from "next/link";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ConfirmButton, RemovalError, SectionTitle } from "@/shared/ui";
import { orgKeys, useRemoveMember } from "@/entities/org";
import { GithubConnect, RotateConnectKey, displayName, useCurrentUser } from "@/entities/user";

export function AccountSettingsView() {
  // AuthGate 안쪽이므로 me와 조직이 있다
  const me = useCurrentUser().me!;

  // 페이지 틀(머리글·탭)은 부르는 쪽이 그린다 — /settings/account와 프로젝트 설정의 계정 탭
  return (
    <div className="space-y-4">
      <section className="card p-5">
        <SectionTitle>프로필</SectionTitle>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-[13.5px] sm:grid-cols-2">
          <Row k="표시 이름">{displayName(me)}</Row>
          <Row k="아이디">{me.loginId ?? "—"}</Row>
          <Row k="조직">{me.orgName ?? "아직 없음"}</Row>
          <Row k="역할">{me.orgRole === "REPRESENTATIVE" ? "대표" : me.orgRole === "MEMBER" ? "팀원" : "—"}</Row>
        </dl>
      </section>

      <section className="card p-5">
        <SectionTitle>연결 키</SectionTitle>
        <p className="mb-3 text-[13px] text-ink-500">
          브라우저를 열 수 없는 환경(SSH 등)에서 CLI를 연결할 때 씁니다. 키는 서버에 해시로만 저장되어 다시 보여줄 수
          없습니다.{" "}
          <Link href="/connect" className="font-medium text-ink-900 underline underline-offset-2">
            연결 안내
          </Link>
        </p>
        <RotateConnectKey />
      </section>

      <GithubSection githubLogin={me.githubLogin} />

      {/* 대표는 나갈 수 없다(409 REPRESENTATIVE_CANNOT_LEAVE) — 버튼을 숨긴다 */}
      {me.orgId && me.orgRole === "MEMBER" && (
        <LeaveOrgSection orgId={me.orgId} orgName={me.orgName} userId={me.userId} />
      )}
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-16 shrink-0 text-ink-500">{k}</dt>
      <dd className="min-w-0 font-medium">{children}</dd>
    </div>
  );
}

/** 탈퇴하면 /me의 orgId가 null이 되고 AuthGate가 "조직 없음"(/onboarding)으로 보낸다 */
function LeaveOrgSection({ orgId, orgName, userId }: { orgId: string; orgName: string | null; userId: string }) {
  const leave = useRemoveMember(orgId);
  return (
    <section className="card p-5">
      <SectionTitle>조직 나가기</SectionTitle>
      <p className="mb-3 text-[13px] text-ink-500">
        계정은 남고 {orgName ?? "조직"}에서만 빠집니다. 내 에이전트는 연결이 해제되고 맡은 프로젝트에서 빠집니다. 지난
        기록은 그대로 남고, 다른 조직의 초대를 받을 수 있습니다.
      </p>
      <ConfirmButton
        label="조직 나가기"
        confirm="정말 나갈까요?"
        pendingLabel="나가는 중…"
        pending={leave.isPending}
        onConfirm={() => leave.mutate(userId)}
      />
      {leave.isError && (
        <div className="mt-2">
          <RemovalError error={leave.error} />
        </div>
      )}
    </section>
  );
}

function GithubSection({ githubLogin }: { githubLogin: string | null }) {
  const queryClient = useQueryClient();
  // 연동되면 조직 멤버의 협업자 확인(isCollaborator)이 채워진다 — 다른 엔티티라 위젯에서 무효화
  const onConnected = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: orgKeys.all });
  }, [queryClient]);

  return (
    <section className="card p-5">
      <SectionTitle>GitHub</SectionTitle>
      <p className="mb-3 text-[13px] text-ink-500">
        연동해야 프로젝트에 배정될 때 레포 협업자로 자동 초대됩니다. 대표가 연동하면 레포 목록 조회·새 레포
        만들기·협업자 확인이 대표의 GitHub 연결로 동작합니다.
      </p>
      <GithubConnect githubLogin={githubLogin} onConnected={onConnected} />
    </section>
  );
}
