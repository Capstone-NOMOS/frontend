// TODO(api): BE 응답 스키마 추가 시 교체 — device flow API(Capstone-NOMOS/backend#5)가 아직 schema.d.ts에 없다

/** EXPIRED는 서버가 저장하지 않고 expires_at으로 계산해 내려준다 */
export type ApiDeviceRequestStatus = "PENDING" | "APPROVED" | "DENIED" | "CONSUMED" | "EXPIRED";

/** GET /agents/device/requests/:userCode 200 */
export interface ApiDeviceRequest {
  userCode: string;
  status: ApiDeviceRequestStatus;
  agentName: string;
  harness: string;
  clientIp: string | null;
  requestedAt: string;
  expiresAt: string;
}

/** POST /agents/device/requests/:userCode/approve · deny 200 */
export interface ApiDeviceDecision {
  status: "APPROVED" | "DENIED";
}
