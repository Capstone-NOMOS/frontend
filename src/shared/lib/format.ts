// 포매터는 한 번만 만든다. toLocale*String은 부를 때마다 새로 만들어 줄이 많은 목록에서 렌더 시간의 대부분을 썼다 (docs/perf-activity.md)
const TIME = new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
const DATE = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" });

export function fmtTime(iso: string) {
  return TIME.format(new Date(iso));
}

export function fmtDate(iso: string) {
  return DATE.format(new Date(iso));
}

export function fmtDateTime(iso: string) {
  return `${fmtDate(iso)} ${fmtTime(iso)}`;
}

export function fmtKrw(n: number) {
  return `₩${Math.round(n).toLocaleString("ko-KR")}`;
}

export function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export function relTime(iso: string, now = Date.now()) {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

export function sameDay(a: string, b: string) {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

let counter = 0;
export function uid(prefix = "id") {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/** 받침에 맞는 조사를 붙인다. josa("민수", "이/가") → "민수가". 한글로 끝나지 않으면 받침 없는 쪽을 쓴다 */
export function josa(word: string, pair: "이/가" | "은/는" | "을/를" | "과/와") {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hasBatchim = code >= 0 && code <= 11171 && code % 28 !== 0;
  const [withBatchim, without] = pair.split("/");
  return word + (hasBatchim ? withBatchim : without);
}
