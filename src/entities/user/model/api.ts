// TODO(api): BE 응답 스키마 추가 시 교체 — 지금 schema.d.ts에서 이 응답들은 unknown이다

/** POST /auth/signup 201. connectKey 평문은 이 응답에서 한 번만 나온다 */
export interface ApiSignupResult {
  userId: string;
  connectKey: string;
}

/** POST /me/connect-key/rotate 200. 기존 키는 즉시 무효 */
export interface ApiConnectKey {
  connectKey: string;
}
