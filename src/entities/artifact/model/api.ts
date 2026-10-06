import type { Schemas } from "@/shared/api";

/** 제출 시점에 고정된 가장 엄격한 판정 */
export type GateMode = Schemas["Artifact"]["gateMode"];

export type VerificationStage = Schemas["Verification"]["stage"];
/** SKIPPED는 통과가 아니다 — "못 돌렸다"이고 사유가 detail.reason에 있다 */
export type VerificationResult = Schemas["Verification"]["result"];

/** 서버는 stage 이름순으로 준다. 화면은 실제 실행 순서로 보여준다 */
export const VERIFICATION_ORDER: VerificationStage[] = ["V1A", "V1B", "V3", "V2", "V4", "INTEGRATION"];

export function sortVerifications(list: Schemas["Verification"][]) {
  return [...list].sort((a, b) => VERIFICATION_ORDER.indexOf(a.stage) - VERIFICATION_ORDER.indexOf(b.stage));
}
