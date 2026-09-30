import { ApiError, errorMessage } from "@/shared/api";
import { Button, Logo } from "@/shared/ui";

/** 프로젝트 하위 화면의 접근 실패. 문구는 code로만 고른다 */
function projectErrorTitle(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === "NOT_PROJECT_MEMBER") return "이 프로젝트에 접근할 권한이 없습니다";
    if (error.code === "PROJECT_HALTED") return "프로젝트가 정지된 상태입니다";
    if (error.status === 404) return "프로젝트를 찾을 수 없습니다";
  }
  return errorMessage(error);
}

export function ProjectErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const retryable = !(error instanceof ApiError && (error.status === 403 || error.status === 404));
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <Logo />
      <h1 className="text-lg font-semibold">{projectErrorTitle(error)}</h1>
      <div className="flex gap-2">
        {retryable && onRetry && (
          <Button variant="outline" onClick={onRetry}>
            다시 시도
          </Button>
        )}
        <Button href="/projects" variant="outline">
          프로젝트 목록
        </Button>
      </div>
    </div>
  );
}
