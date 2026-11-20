// 룸 피드 측정 스크립트 (docs/perf-room-feed.md). 룸 화면(/p/perf-project/rooms/frontend)의 브라우저 콘솔에 붙여 넣는다.
//   await perfRoom.all("dev", "baseline")       아래 둘을 500줄 · 2,000줄에 대해 차례로 돌린다
//   await perfRoom.idle("dev-500-baseline")     처음 그리기 5회 + 새 줄 1개 5회   (목 서버: reset?n=500&running=0)
//   await perfRoom.running("dev-500-baseline")  "생각 중" 타이머 5틱              (목 서버: reset?n=500&running=1)
// 결과는 목 서버가 perf/results/<이름>.json으로 저장한다. NEXT_PUBLIC_PERF=1로 띄운 화면에서만 동작한다 (PerfProfiler)
(() => {
  const MOCK = "http://localhost:3900";
  const RUNS = 5;
  // 측정 전에 같은 동작을 버리는 횟수. 개발 모드는 JIT 예열 전후로 값이 몇 배 달라진다
  const WARMUP = 3;
  const FEED = "ol.space-y-1";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (ok, ms = 120_000) => {
    const t = performance.now();
    while (!ok()) {
      if (performance.now() - t > ms) throw new Error("perfRoom: timeout");
      await sleep(20);
    }
  };
  const commits = () => (window.__perf ??= []);
  const lines = () => document.querySelectorAll(`${FEED} > li`).length;
  const link = (suffix) =>
    [...document.querySelectorAll("a[href]")].find((a) => a.getAttribute("href").endsWith(suffix));
  const moreButton = () =>
    [...document.querySelectorAll("button")].find((b) => /이전 줄 더 보기|불러오는 중/.test(b.textContent));
  const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const stat = (xs) => ({ median: median(xs), max: Math.max(...xs), all: xs });

  /** "이전 줄 더 보기"를 끝까지 눌러 피드 전체를 불러온다 */
  async function loadAll() {
    await until(() => lines() > 0);
    for (let b = moreButton(); b; b = moreButton()) {
      if (!b.disabled) b.click();
      await sleep(30);
    }
    await sleep(500);
  }

  // ── 어떤 컴포넌트가 왜 다시 렌더됐나 (React DevTools와 같은 판정: PerformedWork 플래그 + 이번 렌더에서 시작) ──
  function currentRoot() {
    const el = document.querySelector("h1");
    let f = el[Object.keys(el).find((k) => k.startsWith("__reactFiber$"))];
    while (f.return) f = f.return;
    return f.stateNode.current;
  }
  const nameOf = (f) => {
    const t = f.type;
    return t?.displayName || t?.name || t?.render?.name || t?.type?.name || t?.type?.render?.name || "(이름 없음)";
  };
  function whyOf(f) {
    const prev = f.alternate;
    if (!prev) return "mount";
    for (let a = prev.memoizedState, b = f.memoizedState; a && b; a = a.next, b = b.next) {
      if (a.queue && a.memoizedState !== b.memoizedState) return "state";
    }
    const keys = Object.keys(f.memoizedProps ?? {}).filter((k) => prev.memoizedProps?.[k] !== f.memoizedProps[k]);
    return keys.length ? `props(${keys.join(",")})` : "parent";
  }
  /** since(커밋의 startTime) 이후에 렌더된 함수 컴포넌트를 이름별로 센다. Profiler("room") 아래만 */
  function rendered(since) {
    const out = {};
    const stack = [currentRoot()];
    let inside = null;
    while (stack.length) {
      const f = stack.pop();
      if (f === inside) {
        inside = null;
        continue;
      }
      if (f.tag === 12 && f.memoizedProps?.id === "room") {
        // Profiler 서브트리만 훑는다
        const sub = [f.child];
        while (sub.length) {
          const g = sub.pop();
          if (!g) continue;
          if ([0, 11, 14, 15].includes(g.tag) && g.flags & 1 && g.actualStartTime >= since) {
            const o = (out[nameOf(g)] ??= { count: 0, why: {} });
            o.count++;
            const w = whyOf(g);
            o.why[w] = (o.why[w] ?? 0) + 1;
          }
          sub.push(g.sibling, g.child);
        }
        continue;
      }
      if (f.sibling) stack.push(f.sibling);
      if (f.child) stack.push(f.child);
    }
    return out;
  }

  /** 처음 그리기: 피드가 캐시에 있는 채로 다른 화면에 갔다가 룸으로 돌아온다 → mount 커밋 */
  async function mountOnce() {
    link("/inbox").click();
    await until(() => !document.querySelector(FEED));
    await sleep(500);
    const from = commits().length;
    const t0 = performance.now();
    link("/rooms/frontend").click();
    await until(
      () =>
        commits()
          .slice(from)
          .some((c) => c.phase === "mount") && lines() > 0,
    );
    const paintedMs = performance.now() - t0;
    await sleep(2500); // 돌아온 뒤의 다시 읽기(staleTime 0)가 끝날 때까지
    const cs = commits().slice(from);
    return {
      ms: cs.find((c) => c.phase === "mount").actualDuration,
      clickToFeedMs: paintedMs,
      lines: lines(),
      commits: cs,
    };
  }

  /** 새 줄 1개: 목 서버가 줄을 더하고 room 신호를 보낸다 → invalidateQueries → 다시 읽기 → 다시 그리기 */
  async function newLineOnce(withWhy) {
    const from = commits().length;
    const t0 = performance.now();
    const { text } = await (await fetch(`${MOCK}/__perf/push`, { method: "POST" })).json();
    // 줄 수는 그대로일 수 있다 (불러온 페이지 수가 같으면 가장 오래된 줄이 다음 페이지로 밀린다) — 새 줄의 문장을 기다린다
    await until(() => document.querySelector(FEED).lastElementChild.textContent.includes(text));
    const signalToFeedMs = performance.now() - t0;
    await sleep(100);
    const cs = commits().slice(from);
    const big = cs.reduce((a, b) => (b.actualDuration > a.actualDuration ? b : a));
    const why = withWhy ? rendered(big.startTime) : undefined;
    await sleep(700);
    return { ms: big.actualDuration, signalToFeedMs, lines: lines(), commits: commits().slice(from), rendered: why };
  }

  /** "생각 중" 타이머 1틱: 다음 커밋 하나 */
  async function tickOnce(withWhy) {
    const from = commits().length;
    await until(() => commits().length > from, 5_000);
    const c = commits()[from];
    return {
      ms: c.actualDuration,
      lines: lines(),
      commits: [c],
      rendered: withWhy ? rendered(c.startTime) : undefined,
    };
  }

  async function save(name, scenarios) {
    const body = {
      name,
      at: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: location.href,
      summary: Object.fromEntries(Object.entries(scenarios).map(([k, runs]) => [k, stat(runs.map((r) => r.ms))])),
      scenarios,
    };
    await fetch(`${MOCK}/__perf/save?name=${encodeURIComponent(name)}`, { method: "POST", body: JSON.stringify(body) });
    return JSON.stringify({ name, lines: lines(), ...body.summary });
  }

  const thinking = () => !!document.querySelector(FEED)?.lastElementChild?.textContent.includes("생각 중");
  const reset = (n, running) => fetch(`${MOCK}/__perf/reset?n=${n}&running=${running}`, { method: "POST" });

  window.perfRoom = {
    loadAll,
    rendered,
    async idle(name) {
      await loadAll();
      for (let i = 0; i < WARMUP; i++) await mountOnce();
      const mount = [];
      for (let i = 0; i < RUNS; i++) mount.push(await mountOnce());
      for (let i = 0; i < WARMUP; i++) await newLineOnce(false);
      const newLine = [];
      for (let i = 0; i < RUNS; i++) newLine.push(await newLineOnce(i === 0));
      return save(`${name}-idle`, { mount, newLine });
    },
    /** 500줄 → 2,000줄, 각각 idle · running을 차례로 잰다. 예: await perfRoom.all("prod", "baseline") */
    async all(mode, label) {
      const out = [];
      for (const n of [500, 2000]) {
        await reset(n, 0);
        await until(() => !thinking());
        out.push(await this.idle(`${mode}-${n}-${label}`));
        await reset(n, 1);
        await until(thinking);
        out.push(await this.running(`${mode}-${n}-${label}`));
      }
      return out.join("\n");
    },
    async running(name) {
      await loadAll();
      if (!document.querySelector(FEED)?.textContent.includes("생각 중"))
        throw new Error('perfRoom: "생각 중"이 보이지 않는다');
      for (let i = 0; i < WARMUP; i++) await tickOnce(false);
      const tick = [];
      for (let i = 0; i < RUNS; i++) tick.push(await tickOnce(i === 0));
      return save(`${name}-running`, { tick });
    },
  };
  return "perfRoom ready";
})();
