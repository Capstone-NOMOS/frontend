import type { Schemas } from "@/shared/api";
import type { TeamRole } from "@/shared/model";

/** 서버 태스크 상태 8종. 목업의 TaskState와 다르다 (entities/task/model/types.ts는 목업 화면 전용) */
export type ApiTaskState = Schemas["Task"]["state"];

export interface TaskFilters {
  state?: ApiTaskState;
  teamRole?: TeamRole;
}
