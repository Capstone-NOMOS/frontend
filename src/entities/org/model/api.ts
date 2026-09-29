// TODO(api): BE 응답 스키마 추가 시 교체 — 지금 schema.d.ts에서 이 응답은 unknown이다

/** POST /orgs 201. 만든 사람이 대표가 된다 */
export interface ApiCreateOrgResult {
  orgId: string;
  userId: string;
}
