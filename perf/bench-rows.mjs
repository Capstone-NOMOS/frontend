// 줄 계산(belongsTo · toRows) 한 번에 걸리는 시간. 화면과 같은 순서로 부른다 (RoleRoomView)
//   node --experimental-strip-types perf/bench-rows.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { belongsTo, toRows } from "../src/widgets/room/feedRows.ts";
import { dummy } from "./mock-server.mjs";

const RUNS = 200;
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const out = {};
for (const n of [500, 2000]) {
  const { messages, questions, tasks } = dummy(n);
  const feed = [...messages].reverse(); // API는 최신 줄부터 준다
  const once = () => {
    const kept = [...feed].reverse().filter(belongsTo("FRONTEND", questions, tasks));
    return toRows(kept, questions);
  };
  for (let i = 0; i < 50; i++) once(); // JIT 예열
  const all = [];
  const rowsOnly = [];
  for (let i = 0; i < RUNS; i++) {
    let t = performance.now();
    once();
    all.push(performance.now() - t);
    const kept = [...feed].reverse().filter(belongsTo("FRONTEND", questions, tasks));
    t = performance.now();
    toRows(kept, questions);
    rowsOnly.push(performance.now() - t);
  }
  out[n] = {
    rows: once().length,
    filterAndRowsMs: { median: median(all), max: Math.max(...all) },
    toRowsMs: { median: median(rowsOnly), max: Math.max(...rowsOnly) },
  };
}
mkdirSync(new URL("./results/", import.meta.url), { recursive: true });
writeFileSync(
  new URL("./results/rows-node.json", import.meta.url),
  JSON.stringify({ node: process.version, runs: RUNS, ...out }, null, 2),
);
console.log(JSON.stringify(out, null, 2));
