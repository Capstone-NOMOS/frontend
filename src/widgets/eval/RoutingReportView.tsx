"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { errorMessage } from "@/shared/api";
import { Button, EmptyState, SectionTitle } from "@/shared/ui";
import { fmtDateTime } from "@/shared/lib/format";
import { useDownloadRoutingDataset, useRoutingReport } from "@/entities/question";
import { useCurrentUser } from "@/entities/user";

const ROUTER_LABEL: Record<string, string> = {
  "baseline:asker": "기존 방식(질문한 사람에게)",
  "fallback:representative": "분류 실패 → 대표",
};
const routerName = (r: string) => ROUTER_LABEL[r] ?? r;

const STAGE_LABEL: Record<string, string> = {
  implementation: "구현 중",
  feature_spec: "기능 명세",
  contract: "API 계약",
};

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
const ms = (v: number | null) => (v === null ? "—" : `${Math.round(v)}ms`);
const usd = (v: number | null) => (v === null ? "—" : `$${v.toFixed(4)}`);

const TH = "px-3 py-2 text-left font-medium text-ink-500";
const TD = "px-3 py-2";

/** 대표 전용 발표 평가 화면. 라우터별 최초 수신자-정답 일치율 · 지연 · 비용과 질문별 판정. 사이드바에 없고 URL로만 들어온다 */
export function RoutingReportView({ projectId }: { projectId: string }) {
  const isRep = useCurrentUser().me?.orgRole === "REPRESENTATIVE";
  const report = useRoutingReport(projectId, isRep);

  return (
    <div className="no-scrollbar h-full overflow-y-auto">
      <div className="mx-auto max-w-[1100px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[22px] font-semibold tracking-tight">질문 라우팅 평가</h1>
          {isRep && <DatasetDownload projectId={projectId} />}
        </div>
        {!isRep ? (
          <EmptyState title="대표만 볼 수 있습니다" />
        ) : report.isPending ? (
          <p className="text-[13px] text-ink-500">불러오는 중…</p>
        ) : report.isError ? (
          <p className="text-[13px] text-forbidden">{errorMessage(report.error)}</p>
        ) : (
          <>
            <p className="text-[13px] text-ink-500">
              질문 {report.data.questions}개 · 정답 붙음 {report.data.labeled}개 · 답한 질문{" "}
              {report.data.answer.answered}개 (답까지 중앙값{" "}
              {report.data.answer.medianMs === null ? "—" : `${Math.round(report.data.answer.medianMs / 60000)}분`})
            </p>

            <section>
              <SectionTitle>라우터별</SectionTitle>
              <div className="card overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead className="border-b border-ink-100">
                    <tr>
                      <th className={TH}>라우터</th>
                      <th className={TH}>구분</th>
                      <th className={TH}>판정</th>
                      <th className={TH}>실패</th>
                      <th className={TH}>일치율</th>
                      <th className={TH}>평균 지연</th>
                      <th className={TH}>p95 지연</th>
                      <th className={TH}>요청당 비용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.data.routers.map((r) => (
                      <tr key={r.router} className="border-b border-ink-100 last:border-0">
                        <td className={`${TD} font-mono`}>{routerName(r.router)}</td>
                        <td className={TD}>{r.mode}</td>
                        <td className={TD}>{r.decisions}</td>
                        <td className={TD}>{r.errors}</td>
                        <td className={TD}>
                          {pct(r.alignmentRate)}{" "}
                          <span className="text-ink-500">
                            ({r.aligned}/{r.labeled})
                          </span>
                        </td>
                        <td className={TD}>{ms(r.avgLatencyMs)}</td>
                        <td className={TD}>{ms(r.p95LatencyMs)}</td>
                        <td className={TD}>{usd(r.avgCostUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <SectionTitle>단계별</SectionTitle>
              <div className="card overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead className="border-b border-ink-100">
                    <tr>
                      <th className={TH}>단계</th>
                      <th className={TH}>질문</th>
                      <th className={TH}>정답 붙음</th>
                      <th className={TH}>라우터별 일치율</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.data.byStage.map((st) => (
                      <tr key={st.stage} className="border-b border-ink-100 last:border-0">
                        <td className={TD}>{STAGE_LABEL[st.stage] ?? st.stage}</td>
                        <td className={TD}>{st.questions}</td>
                        <td className={TD}>{st.labeled}</td>
                        <td className={TD}>
                          {st.routers.length === 0
                            ? "—"
                            : st.routers.map((r) => (
                                <span key={r.router} className="mr-3 inline-block">
                                  <span className="font-mono">{routerName(r.router)}</span> {pct(r.alignmentRate)}{" "}
                                  <span className="text-ink-500">
                                    ({r.aligned}/{r.labeled})
                                  </span>
                                </span>
                              ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <SectionTitle>질문별</SectionTitle>
              {report.data.rows.length === 0 ? (
                <EmptyState title="아직 질문이 없습니다" />
              ) : (
                <div className="card overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead className="border-b border-ink-100">
                      <tr>
                        <th className={TH}>질문</th>
                        <th className={TH}>물은 쪽</th>
                        <th className={TH}>정답</th>
                        {report.data.routers.map((r) => (
                          <th key={r.router} className={TH}>
                            {routerName(r.router)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.data.rows.map((row) => (
                        <tr key={row.questionId} className="border-b border-ink-100 last:border-0">
                          <td className={`${TD} max-w-[320px]`}>
                            <p className="truncate" title={row.firstQuestion}>
                              {row.firstQuestion}
                            </p>
                            <p className="text-[11.5px] text-ink-500">
                              {fmtDateTime(row.askedAt)} · {STAGE_LABEL[row.stage] ?? row.stage} · {row.status}
                            </p>
                          </td>
                          <td className={TD}>{row.askerRole}</td>
                          <td className={`${TD} font-medium`}>{row.goldTarget ?? "—"}</td>
                          {report.data.routers.map((r) => (
                            <td key={r.router} className={TD}>
                              {row.decisions[r.router] ?? "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

/** 오프라인 평가용 데이터셋(라우터가 본 입력 그대로)을 JSON 파일로 내려받는다 */
function DatasetDownload({ projectId }: { projectId: string }) {
  const download = useDownloadRoutingDataset(projectId);
  const [labeledOnly, setLabeledOnly] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
      <label className="flex items-center gap-1.5 text-ink-700">
        <input
          type="checkbox"
          checked={labeledOnly}
          onChange={(e) => setLabeledOnly(e.target.checked)}
          disabled={download.isPending}
        />
        정답 붙은 질문만
      </label>
      <Button
        size="sm"
        variant="outline"
        disabled={download.isPending}
        onClick={() => download.mutate({ labeledOnly })}
      >
        <Download size={14} /> {download.isPending ? "받는 중…" : "데이터셋 JSON 내려받기"}
      </Button>
      {download.isSuccess && <span className="text-ink-500">{download.data}개 저장됨</span>}
      {download.isError && <span className="text-forbidden">{errorMessage(download.error)}</span>}
    </div>
  );
}
