// TODO(api): BE 응답 스키마 추가 시 교체 — 지금 schema.d.ts에서 산출물·검증 조회 응답은 unknown이다

/** 제출 시점에 고정된 가장 엄격한 판정. decider 값 중 FORBIDDEN은 제출 자체가 막혀 여기 오지 않는다 */
export type GateMode = "AUTO" | "PM_REVIEW" | "HUMAN";

export interface ApiArtifact {
  id: string;
  taskId: string;
  commitSha: string;
  changedPaths: string[];
  triggeredActions: string[];
  gateMode: GateMode;
  /** 1부터. 2 이상이면 재제출 */
  attempt: number;
  createdAt: string;
}

export type VerificationStage = "V1A" | "V1B" | "V2" | "V3" | "V4" | "INTEGRATION";
/** SKIPPED는 통과가 아니다 — "못 돌렸다"이고 사유가 detail.reason에 있다 */
export type VerificationResult = "PASS" | "FAIL" | "SKIPPED";

export interface ApiVerification {
  id: string;
  artifactId: string;
  stage: VerificationStage;
  result: VerificationResult;
  executedBy: "server" | "bridge";
  detail: { reason?: string } & Record<string, unknown>;
  durationMs: number | null;
}

/** 서버는 stage 이름순으로 준다. 화면은 실제 실행 순서로 보여준다 */
export const VERIFICATION_ORDER: VerificationStage[] = ["V1A", "V1B", "V3", "V2", "V4", "INTEGRATION"];

export function sortVerifications(list: ApiVerification[]) {
  return [...list].sort((a, b) => VERIFICATION_ORDER.indexOf(a.stage) - VERIFICATION_ORDER.indexOf(b.stage));
}
