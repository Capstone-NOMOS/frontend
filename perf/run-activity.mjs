// 활동 화면 측정을 헤드리스 Chrome에서 끝까지 돌린다 (docs/perf-activity.md). 의존성 없음 (Node 22의 WebSocket · fetch)
//   node perf/run-activity.mjs prod-3000-baseline
// 목 서버(3900)와 화면(3001)이 떠 있어야 한다. 보이는 창은 가려지면 Chrome이 프레임을 초당 1회로 줄여 스크롤 값을 못 쓴다
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const name = process.argv[2] ?? "prod-3000-run";
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const APP = "http://localhost:3001";
const MOCK = "http://localhost:3900";
const PORT = 9335;

await fetch(`${MOCK}/__perf/events/reset?n=3000`, { method: "POST" });
const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "perf-"))}`,
    "--window-size=1440,900",
    "about:blank",
  ],
  { stdio: "ignore" },
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 40 && !target; i++) {
  await sleep(250);
  try {
    target = (await (await fetch(`http://localhost:${PORT}/json`)).json()).find((t) => t.type === "page");
  } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) pending.get(m.id)(m.result ?? m.error);
};
const send = (method, params = {}) =>
  new Promise((r) => {
    pending.set(++id, r);
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result?.value;
};

try {
  await send("Page.enable");
  await send("Performance.enable");
  await send("Page.navigate", { url: `${APP}/login` });
  await sleep(3000);
  await evaluate(
    `sessionStorage.setItem("nomos.session", JSON.stringify({ accessToken: "perf", expiresAt: Date.now() + 864e5 }))`,
  );
  await send("Page.navigate", { url: `${APP}/p/perf-project/activity` });
  await sleep(5000);
  await evaluate(
    `new Promise((r) => { const s = document.createElement("script"); s.src = "${MOCK}/__perf/collect.js"; s.onload = r; document.head.append(s); })`,
  );
  console.log(await evaluate(`perfActivity.run(${JSON.stringify(name)})`));

  // 전부 펼친 채로 남은 화면의 크기. GC 뒤의 heap이라 performance.memory보다 믿을 만하다
  await send("HeapProfiler.collectGarbage");
  const m = Object.fromEntries((await send("Performance.getMetrics")).metrics.map((x) => [x.name, x.value]));
  const cdp = { domNodes: m.Nodes, heapUsedMB: Math.round((m.JSHeapUsedSize / 1048576) * 10) / 10 };
  const file = new URL(`./results/${name}-activity.json`, import.meta.url);
  writeFileSync(file, JSON.stringify({ ...JSON.parse(readFileSync(file, "utf8")), cdp }, null, 2));
  console.log(JSON.stringify(cdp));
} finally {
  ws.close();
  chrome.kill();
}
process.exit(0);
