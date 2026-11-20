// perf/results/*.json을 한 줄씩 요약한다:  node perf/summarize.mjs [이름 일부]
import { readdirSync, readFileSync } from "node:fs";

const dir = new URL("./results/", import.meta.url);
const r1 = (x) => Math.round(x * 10) / 10;
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json") && f.includes(process.argv[2] ?? ""))) {
  const r = JSON.parse(readFileSync(new URL(file, dir), "utf8"));
  if (!r.scenarios) continue;
  console.log(`\n${r.name}`);
  for (const [k, runs] of Object.entries(r.scenarios)) {
    console.log(`  ${k}: median ${r1(r.summary[k].median)}ms · max ${r1(r.summary[k].max)}ms`);
    for (const x of runs) {
      const extra = x.clickToFeedMs
        ? ` click→feed ${Math.round(x.clickToFeedMs)}ms`
        : x.signalToFeedMs
          ? ` signal→feed ${Math.round(x.signalToFeedMs)}ms`
          : "";
      console.log(
        `    ${r1(x.ms)}ms · li ${x.lines}${extra} · commits ${x.commits.map((c) => c.phase[0] + Math.round(c.actualDuration)).join(" ")}`,
      );
    }
    const why = runs.find((x) => x.rendered)?.rendered;
    if (why) {
      const top = Object.entries(why)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 8);
      console.log(
        `    rendered: ${top
          .map(
            ([n, o]) =>
              `${n}×${o.count}[${Object.entries(o.why)
                .map(([w, c]) => `${w}:${c}`)
                .join(" ")}]`,
          )
          .join(" · ")}`,
      );
    }
  }
}
