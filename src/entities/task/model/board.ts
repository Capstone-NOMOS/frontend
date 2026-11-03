import type { ApiTaskState } from "./api";

/** 대시보드 칸반 4열. 이동은 서버 전이로만 일어난다 (드래그 금지 — adr/0003) */
export const TASK_BOARD: { key: string; label: string; states: ApiTaskState[] }[] = [
  // 에이전트는 CLAIMED 상태로 작업한다(IN_PROGRESS를 거의 거치지 않는다) — 서버도 CLAIMED부터 진행 중으로 센다
  { key: "waiting", label: "대기", states: ["READY"] },
  { key: "progress", label: "진행", states: ["CLAIMED", "IN_PROGRESS", "VERIFYING"] },
  { key: "human", label: "사람 필요", states: ["AWAITING_APPROVAL", "BLOCKED", "ESCALATED"] },
  { key: "done", label: "완료", states: ["DONE", "CANCELLED"] },
];
