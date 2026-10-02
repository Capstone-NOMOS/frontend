import type { Schemas } from "@/shared/api";

// TODO(api): BE 응답 스키마 추가 시 교체 — 지금 schema.d.ts에서 수락 응답은 unknown이다
/** POST /invites/{token}/accept 200. 같은 링크를 다시 눌러도 성공한다(멱등) */
export interface ApiAcceptInviteResult {
  userId: string;
  orgId: string;
}

export const INVITE_INVALID: Record<NonNullable<Schemas["InvitePreview"]["reason"]>, string> = {
  expired: "만료된 초대입니다",
  used: "이미 사용된 초대입니다",
  not_found: "유효하지 않은 초대 링크입니다",
};
