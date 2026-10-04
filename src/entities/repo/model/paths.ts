import type { Schemas } from "@/shared/api";

type RepoPath = Schemas["RepoPath"];

/** 조직 상한(.env 계열 등). 어떤 필드도 바꿀 수 없다 — 409 IMMUTABLE_ORG_CEILING */
export const ORG_CEILING_PRIORITY = 900;

/** 대표가 추가하는 규칙의 priority 대역 */
export const MANUAL_PRIORITY = { min: 200, max: 299 } as const;

export function isLocked(path: RepoPath) {
  return path.priority >= ORG_CEILING_PRIORITY;
}

/** `**` 행 = 레포 전체의 기본 소유 역할. 연결 때 ownerRole로 지정하거나 여기서 PATCH한다 */
export function findRootPath(paths: RepoPath[]) {
  return paths.find((p) => p.pathPattern === "**");
}

/**
 * 서버와 브릿지 settings.json의 glob 방언 차이를 막으려고 `**`, `*`, 리터럴만 허용한다.
 * 금지 문자가 있으면 그 문자를 돌려준다 (서버는 400 INVALID_GLOB_PATTERN)
 */
export function forbiddenGlobChar(pattern: string): string | null {
  const m = pattern.match(/[{}!?[\]]/);
  return m ? m[0] : null;
}

export const ACCESS_LABEL: Record<RepoPath["access"], string> = {
  write: "쓰기",
  read: "읽기",
  denied: "금지",
};

export const SOURCE_LABEL: Record<RepoPath["source"], string> = {
  seed: "기본",
  scan: "스캔",
  manual: "수동",
};
