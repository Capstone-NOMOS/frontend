// TODO(api): BE 응답 스키마 추가 시 교체 — 지금 schema.d.ts에서 이 응답들은 unknown이다

import type { TeamRole } from "@/shared/model";

/** POST /orgs 201. 만든 사람이 대표가 된다 */
export interface ApiCreateOrgResult {
  orgId: string;
  userId: string;
}

/** POST /orgs/{orgId}/invites 201. teamRole은 참고용이다 — 실제 배정은 프로젝트에서 따로 한다 */
export interface ApiInvite {
  token: string;
  /** BE의 FRONTEND_BASE_URL로 만든 링크 */
  url: string;
  expiresAt: string;
  teamRole: TeamRole | null;
}
