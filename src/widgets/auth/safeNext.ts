/** ?next=는 사용자가 조작할 수 있다. 같은 사이트 경로("/...")만 허용한다 ("//evil", "/\evil" 차단) */
export function safeNext(next: string | undefined): string | null {
  return next && /^\/(?![/\\])/.test(next) ? next : null;
}
