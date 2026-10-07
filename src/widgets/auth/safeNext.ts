/**
 * ?next=는 사용자가 조작할 수 있다. 같은 사이트 경로("/...")만 허용한다 ("//evil", "/\evil" 차단).
 * 탭·개행도 거부한다 — URL 파서가 지워서 "/\t/evil"이 "//evil"(외부)이 된다
 */
export function safeNext(next: string | undefined): string | null {
  return next && /^\/(?![/\\])[^\t\n\r]*$/.test(next) ? next : null;
}
