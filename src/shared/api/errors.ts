import { ApiError } from "./client";

// 에러 코드 → 사용자 문구. 출처: schema.d.ts + Notion "NOMOS API 명세서" 에러 코드 표.
// 서버 message는 고정 문구가 아니므로 분기 조건으로 쓰지 않는다. 분기는 code로만.
const ERROR_MESSAGES: Record<string, string> = {
  NETWORK_ERROR: "서버에 연결할 수 없습니다. 네트워크를 확인해 주세요.",

  // 400
  VALIDATION_ERROR: "입력값을 다시 확인해 주세요.",
  ORG_NAME_REQUIRED: "조직 이름을 입력해 주세요.",
  INVALID_GLOB_PATTERN: "허용되지 않는 경로 패턴입니다.",
  INVALID_CONNECT_REQUEST: "연결 키가 올바르지 않습니다.",
  INVALID_DEVICE_CODE: "연결 코드가 올바르지 않습니다. 터미널에서 다시 실행해 주세요.",

  // 401
  UNAUTHENTICATED: "로그인이 만료되었습니다. 다시 로그인해 주세요.",
  INVALID_CREDENTIALS: "아이디 또는 비밀번호가 올바르지 않습니다.",
  INVALID_REFRESH_TOKEN: "인증이 만료되었습니다. 다시 연결해 주세요.",
  POLICY_STALE: "정책이 변경되었습니다. 다시 시도해 주세요.",

  // 403
  NOT_REPRESENTATIVE: "조직 대표만 할 수 있는 작업입니다.",
  NOT_IN_ORG: "아직 조직에 속해 있지 않습니다.",
  CROSS_ORG_ACCESS: "다른 조직의 자원에는 접근할 수 없습니다.",
  PROJECT_HALTED: "프로젝트가 정지된 상태입니다.",
  NOT_PROJECT_MEMBER: "프로젝트 멤버가 아닙니다.",
  SCOPE_DENIED: "허용되지 않은 범위의 작업입니다.",
  FORBIDDEN_PATH: "접근이 금지된 경로입니다.",
  TASK_ROLE_MISMATCH: "다른 역할의 태스크입니다.",
  NOT_TASK_ASSIGNEE: "이 태스크의 담당자가 아닙니다.",
  AGENT_NOT_IN_ORG: "이 조직에 속한 에이전트가 아닙니다.",
  PROJECT_STARTED: "프로젝트가 시작된 뒤에는 멤버를 바꿀 수 없습니다.",
  VERIFICATION_STAGE_NOT_REPORTABLE: "보고할 수 없는 검증 단계입니다.",

  // 404
  NOT_FOUND: "요청한 주소를 찾을 수 없습니다.",
  REPO_NOT_FOUND: "레포지토리를 찾을 수 없습니다.",
  PATH_NOT_FOUND: "경로 규칙을 찾을 수 없습니다.",
  INVITE_NOT_FOUND: "초대를 찾을 수 없습니다.",
  TASK_NOT_FOUND: "태스크를 찾을 수 없습니다.",
  ARTIFACT_NOT_FOUND: "산출물을 찾을 수 없습니다.",
  PROJECT_NOT_FOUND: "프로젝트를 찾을 수 없습니다.",
  MEMBER_NOT_FOUND: "멤버를 찾을 수 없습니다.",
  PLAN_NOT_FOUND: "계획을 찾을 수 없습니다.",
  APPROVAL_NOT_FOUND: "승인 요청을 찾을 수 없습니다.",
  DEVICE_REQUEST_NOT_FOUND: "연결 요청을 찾을 수 없습니다. 코드를 확인하거나 터미널에서 다시 실행해 주세요.",

  // 409
  LOGIN_ID_TAKEN: "이미 사용 중인 아이디입니다.",
  ALREADY_IN_ORG: "이미 다른 조직에 속해 있습니다.",
  GITHUB_ACCOUNT_TAKEN: "이 GitHub 계정은 다른 사용자에게 연결되어 있습니다.",
  REPO_ALREADY_CONNECTED: "이미 연결된 레포지토리입니다.",
  PATH_PATTERN_DUPLICATE: "같은 경로 패턴이 이미 있습니다.",
  PATH_PRIORITY_TAKEN: "같은 우선순위의 규칙이 이미 있습니다.",
  IMMUTABLE_ORG_CEILING: "조직 상한 규칙은 수정할 수 없습니다.",
  TASK_ALREADY_CLAIMED: "다른 에이전트가 먼저 태스크를 가져갔습니다.",
  TASK_DEPS_NOT_DONE: "선행 태스크가 아직 끝나지 않았습니다.",
  TASK_STATE_INVALID: "현재 상태에서는 할 수 없는 작업입니다.",
  VERIFICATION_ALREADY_RECORDED: "이미 기록된 검증 결과입니다.",
  REPO_IN_ACTIVE_PROJECT: "이 레포지토리를 사용하는 진행 중인 프로젝트가 있습니다.",
  ROLE_ALREADY_ASSIGNED: "이미 배정된 역할입니다.",
  AGENT_ALREADY_ASSIGNED: "이미 배정된 에이전트입니다.",
  AGENT_IN_ANOTHER_PROJECT: "이 에이전트는 다른 진행 중인 프로젝트를 맡고 있습니다.",
  DEVICE_REQUEST_ALREADY_DECIDED: "이미 승인 또는 거부한 연결 요청입니다.",
  PROJECT_ALREADY_STARTED: "이미 시작된 프로젝트입니다.",
  PROJECT_NOT_STARTED: "프로젝트가 아직 시작되지 않았습니다.",
  PROJECT_NOT_OPEN: "끝났거나 정지된 프로젝트에는 명세·태스크를 추가할 수 없습니다.",
  NOTES_UNACKNOWLEDGED: "확인하지 않은 새 인계 노트가 있습니다.",
  PM_PLAN_IN_PROGRESS: "PM이 이미 계획을 작성하고 있습니다. 끝난 뒤 다시 요청해 주세요.",
  PM_BUDGET_EXCEEDED: "PM 예산을 넘어 요청할 수 없습니다.",
  PLAN_NOT_APPLICABLE: "검토 대기 중인 초안만 적용·수정 요청·반려할 수 있습니다.",
  PLAN_REVISION_LIMIT: "수정 요청 한도를 넘었습니다. 새 계획을 요청해 주세요.",
  APPROVAL_ALREADY_DECIDED: "이미 승인 또는 반려된 요청입니다.",
  APPROVAL_STALE: "태스크가 더 이상 승인 대기 상태가 아닙니다.",

  // 410
  INVITE_EXPIRED: "만료된 초대입니다.",
  INVITE_ALREADY_USED: "이미 사용된 초대입니다.",
  DEVICE_REQUEST_EXPIRED: "만료된 연결 요청입니다. 터미널에서 다시 실행해 주세요.",

  // 422
  NOTE_INVALID: "인계 노트 형식이 올바르지 않습니다.",
  INVALID_AUTONOMY_PRESET: "허용 레벨은 L1~L4 중 하나여야 합니다.",
  REPO_OWNERSHIP_NOT_SET: "경로 소유 역할이 지정되지 않은 레포지토리입니다.",
  // 아래 둘은 details: [{ where, message }]에 이유가 전부 온다. 화면은 details를 목록으로 함께 보여준다
  PROJECT_START_INVALID: "프로젝트를 시작할 수 없습니다.",
  PLAN_INVALID: "명세·태스크 검증을 통과하지 못했습니다.",

  // 5xx
  INTERNAL_ERROR: "서버에서 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  GITHUB_UNAVAILABLE: "GitHub에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
  DB_UNAVAILABLE: "서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해 주세요.",
  PM_UNAVAILABLE: "서버에 PM이 설정되지 않았습니다.",
};

/** 맵에 없는 코드는 서버 message를 그대로 보여준다 */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return ERROR_MESSAGES[error.code] ?? error.message;
  return "알 수 없는 오류가 발생했습니다.";
}

export interface ErrorDetail {
  where: string;
  message: string;
}

/**
 * 422 PROJECT_START_INVALID·PLAN_INVALID의 details: [{ where, message }].
 * message는 서버가 한국어로 준다 — 그대로 보여준다. 형식이 다르면 빈 배열
 */
export function errorDetails(error: unknown): ErrorDetail[] {
  if (!(error instanceof ApiError) || !Array.isArray(error.details)) return [];
  return error.details.filter(
    (d): d is ErrorDetail =>
      typeof d === "object" && d !== null && typeof d.where === "string" && typeof d.message === "string",
  );
}
