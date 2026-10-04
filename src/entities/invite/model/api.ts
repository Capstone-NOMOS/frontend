import type { Schemas } from "@/shared/api";

export const INVITE_INVALID: Record<NonNullable<Schemas["InvitePreview"]["reason"]>, string> = {
  expired: "만료된 초대입니다",
  used: "이미 사용된 초대입니다",
  not_found: "유효하지 않은 초대 링크입니다",
};
