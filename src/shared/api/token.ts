// 사람 토큰 보관. 쿠키를 쓰지 않고 sessionStorage에 둔다 (docs/adr/0007).
const KEY = "nomos.session";

export interface Session {
  accessToken: string;
  /** 만료 시각 (epoch ms) */
  expiresAt: number;
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const session = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as Session | null;
    if (!session || session.expiresAt <= Date.now()) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function setSession(session: Session) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}
