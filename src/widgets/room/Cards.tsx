"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  FileText,
  GitCommitHorizontal,
  Info,
  Link2,
  Lock,
  ShieldBan,
  Sparkles,
  TerminalSquare,
  X,
} from "lucide-react";
import { Badge, Button, Input } from "@/shared/ui";
import { cn, fmtKrw } from "@/shared/lib/format";
import type { Card, Message } from "@/entities/message";
import { DECIDER_META } from "@/entities/policy";
import { TaskBadge, type Task } from "@/entities/task";
import { useApp } from "@/lib/store";

function Frame({
  icon,
  title,
  tone = "neutral",
  children,
  right,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  tone?: "neutral" | "brand" | "warn" | "danger" | "success";
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  const toneCls = {
    neutral: "border-ink-200",
    brand: "border-brand-200",
    warn: "border-amber-200",
    danger: "border-red-200",
    success: "border-emerald-200",
  }[tone];
  const headCls = {
    neutral: "bg-ink-50 text-ink-700",
    brand: "bg-brand-50 text-brand-600",
    warn: "bg-human-bg text-human",
    danger: "bg-forbidden-bg text-forbidden",
    success: "bg-auto-bg text-auto",
  }[tone];
  return (
    <div className={cn("mt-2 w-full max-w-[640px] overflow-hidden rounded-xl border bg-white shadow-card", toneCls)}>
      <div className={cn("flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold", headCls)}>
        {icon}
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {right}
      </div>
      <div className="px-4 py-3.5">{children}</div>
    </div>
  );
}

// ---------- Spec / approval ----------
export function SpecCard({
  message,
  card,
  canDecide,
  projectId,
}: {
  message: Message;
  card: Extract<Card, { kind: "spec" }>;
  canDecide: boolean;
  projectId: string;
}) {
  const { actions } = useApp();
  const [note, setNote] = useState("");
  const [asking, setAsking] = useState(false);
  const status = card.status;
  return (
    <Frame
      icon={<Sparkles size={15} />}
      title={`기능 명세 초안 v${card.version} — ${card.title}`}
      tone="brand"
      right={
        status === "approved" ? (
          <Badge tone="success">
            <Check size={11} /> 승인됨
          </Badge>
        ) : status === "changes_requested" ? (
          <Badge tone="warn">수정 요청됨</Badge>
        ) : (
          <Badge tone="brand">승인 대기</Badge>
        )
      }
    >
      <div className="space-y-4">
        {card.features.map((f) => (
          <div key={f.id}>
            <div className="flex items-center gap-2 text-[13.5px] font-semibold">
              <span className="font-mono text-[12px] text-brand-600">{f.id}</span> {f.title}
            </div>
            <ul className="mt-1.5 space-y-1 text-[13px] text-ink-700">
              {f.acs.map((a, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0 font-mono text-[11px] text-ink-400 pt-0.5">AC{i + 1}</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <div className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">API 계약 초안</div>
          <pre className="mt-1.5 overflow-x-auto rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 font-mono text-[12px] leading-relaxed text-ink-800">
            {card.contract.join("\n")}
          </pre>
        </div>

        <div>
          <div className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">태스크 분해</div>
          <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {card.tasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 rounded-lg border border-ink-200 px-2.5 py-1.5 text-[13px]"
              >
                <Badge tone={t.role === "FE" ? "fe" : "be"}>{t.role}</Badge>
                <span className="shrink-0 whitespace-nowrap font-mono text-[12px] text-ink-500">{t.id}</span>
                <span className="truncate">{t.title}</span>
              </div>
            ))}
          </div>
        </div>

        {card.decisions.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-human-bg px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-human">
              <AlertTriangle size={13} /> 결정이 필요한 것
            </div>
            <ul className="mt-1.5 space-y-1 text-[13px] text-ink-800">
              {card.decisions.map((d, i) => (
                <li key={i} className="flex gap-2">
                  <span>·</span>
                  <span>{d.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {status === "approved" && (
          <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-500">
            <Lock size={12} /> 명세 v{card.version} LOCKED ·{" "}
            <Link href={`/p/${projectId}/docs/spec`} className="font-medium text-brand-600 hover:underline">
              문서에서 보기
            </Link>
          </div>
        )}

        {status === "pending" && canDecide && (
          <div className="border-t border-ink-100 pt-3">
            {asking ? (
              <div className="space-y-2">
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="무엇을 바꿔야 하나요? (예: 즐겨찾기 상한 100곡으로)"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      actions.decideSpec(message.id, "changes", note);
                      setAsking(false);
                      setNote("");
                    }}
                  >
                    수정 요청 보내기
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAsking(false)}>
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => actions.decideSpec(message.id, "approve")}>
                  <Check size={14} /> 승인
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAsking(true)} disabled={card.revisions >= 3}>
                  수정 요청 {card.revisions > 0 && `(${card.revisions}/3)`}
                </Button>
                <span className="text-[12px] text-ink-500">승인 전에는 어떤 태스크도 에이전트에 전달되지 않습니다</span>
              </div>
            )}
          </div>
        )}
        {status === "pending" && !canDecide && (
          <div className="text-[12.5px] text-ink-500">대표의 승인을 기다리는 중</div>
        )}
      </div>
    </Frame>
  );
}

// ---------- Dispatch ----------
export function DispatchCard({
  card,
  tasks,
  projectId,
}: {
  card: Extract<Card, { kind: "dispatch" }>;
  tasks: Task[];
  projectId: string;
}) {
  return (
    <Frame icon={<ClipboardCheck size={15} />} title={`태스크 전달 · ${card.taskIds.join(", ")}`}>
      <div className="space-y-2">
        {card.taskIds.map((id) => {
          const t = tasks.find((x) => x.id === id);
          return (
            <div key={id} className="flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-[13px]">
              <span className="font-mono text-[12px] text-ink-500">{id}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{t?.title ?? "태스크"}</span>
              {t && <TaskBadge state={t.state} />}
            </div>
          );
        })}
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href={`/p/${projectId}/docs/spec`}
            className="inline-flex items-center gap-1 rounded-md bg-ink-100 px-2 py-1 text-[12px] font-medium text-ink-700 hover:bg-ink-200"
          >
            <FileText size={12} /> {card.specRef}
          </Link>
          <Link
            href={`/p/${projectId}/docs/contract`}
            className="inline-flex items-center gap-1 rounded-md bg-ink-100 px-2 py-1 text-[12px] font-medium text-ink-700 hover:bg-ink-200"
          >
            <FileText size={12} /> {card.contractRef}
          </Link>
        </div>
      </div>
    </Frame>
  );
}

// ---------- Agent log ----------
export function LogCard({ card }: { card: Extract<Card, { kind: "log" }> }) {
  const [open, setOpen] = useState(card.live);
  const iconFor = (k: string) =>
    k === "mcp" ? "mcp" : k === "edit" ? "edit" : k === "test" ? "test" : k === "tool" ? "tool" : "·";
  return (
    <div className="mt-2 w-full max-w-[640px] overflow-hidden rounded-xl border border-ink-200 bg-ink-50">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[12.5px] font-medium text-ink-700 hover:bg-ink-100"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <TerminalSquare size={14} className="text-ink-500" />
        <span className="flex-1">작업 로그 · {card.taskId}</span>
        {card.live ? (
          <span className="inline-flex items-center gap-1.5 text-review">
            <span className="h-1.5 w-1.5 rounded-full bg-review pulse-dot" /> 실행 중
          </span>
        ) : (
          <span className="text-ink-500">{card.lines.length}줄</span>
        )}
      </button>
      {open && (
        <ol className="space-y-1 border-t border-ink-200 px-3.5 py-2.5 font-mono text-[12px] leading-5 text-ink-700">
          {card.lines.map((l, i) => (
            <li key={i} className="flex gap-2">
              <span
                className={cn(
                  "w-8 shrink-0 text-[10px] uppercase tracking-wide",
                  l.kind === "mcp"
                    ? "text-brand-600"
                    : l.kind === "edit"
                      ? "text-fe-500"
                      : l.kind === "test"
                        ? "text-auto"
                        : "text-ink-400",
                )}
              >
                {iconFor(l.kind)}
              </span>
              <span className="break-all">{l.text}</span>
            </li>
          ))}
          {card.live && <li className="text-ink-400">▍</li>}
        </ol>
      )}
    </div>
  );
}

// ---------- Question (agent → human) ----------
export function QuestionCard({
  message,
  card,
  canAnswer,
  answeredByName,
}: {
  message: Message;
  card: Extract<Card, { kind: "question" }>;
  canAnswer: boolean;
  answeredByName?: string;
}) {
  const { actions } = useApp();
  const [custom, setCustom] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const answered = Boolean(card.answer);
  return (
    <Frame
      icon={<CircleHelp size={15} />}
      title={`에이전트가 결정을 기다립니다 · ${card.taskId}`}
      tone={answered ? "success" : "warn"}
      right={answered ? <Badge tone="success">답변됨</Badge> : <Badge tone="warn">WAITING_HUMAN</Badge>}
    >
      <p className="text-[14px] font-medium leading-relaxed">{card.question}</p>
      <div className="mt-2.5 space-y-1.5">
        {card.options.map((o) => {
          const chosen = card.answer === o;
          return (
            <button
              key={o}
              disabled={answered || !canAnswer}
              onClick={() => actions.answerQuestion(message.id, o)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[13px] transition",
                chosen
                  ? "border-emerald-300 bg-auto-bg text-auto font-medium"
                  : "border-ink-200 hover:border-ink-300 hover:bg-ink-50 disabled:hover:bg-white",
                answered && !chosen && "text-ink-400",
              )}
            >
              {chosen ? <Check size={14} /> : <span className="h-3.5 w-3.5 rounded-full border border-ink-300" />}
              {o}
            </button>
          );
        })}
        {answered && !card.options.includes(card.answer!) && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-auto-bg px-3 py-2 text-[13px] font-medium text-auto">
            <Check size={14} /> {card.answer}
          </div>
        )}
      </div>
      <div className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-[12.5px] text-ink-600">
        <span className="font-semibold text-ink-700">맥락 </span>
        {card.context}
      </div>
      {!answered && canAnswer && (
        <div className="mt-3">
          {showCustom ? (
            <div className="flex gap-2">
              <Input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="직접 입력"
                autoFocus
                className="h-9"
              />
              <Button size="sm" onClick={() => custom.trim() && actions.answerQuestion(message.id, custom.trim())}>
                답변
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCustom(false)}>
                <X size={14} />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setShowCustom(true)}
              className="text-[12.5px] font-medium text-brand-600 hover:underline"
            >
              직접 입력
            </button>
          )}
          <p className="mt-2 text-[12px] text-ink-500">
            답하면 결정기록(ADR)에 저장되고 에이전트가 30초 안에 재기동됩니다. 에이전트 프로세스는 대기 중 토큰을 쓰지
            않습니다.
          </p>
        </div>
      )}
      {!answered && !canAnswer && (
        <p className="mt-3 text-[12.5px] text-ink-500">
          담당 개발자의 답변을 기다리는 중 · 4시간 무응답 시 PM이 대표에게 알립니다
        </p>
      )}
      {answered && (
        <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-ink-500">
          <FileText size={12} /> {card.adrId} 저장됨 · 결정자 {answeredByName ?? "담당자"}
        </p>
      )}
    </Frame>
  );
}

// ---------- Verification ----------
function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={cn("flex items-center gap-2 text-[13px]", ok ? "text-ink-800" : "text-forbidden")}>
      {ok ? <Check size={14} className="text-auto" /> : <X size={14} />} {label}
    </li>
  );
}

export function VerificationCard({ card }: { card: Extract<Card, { kind: "verification" }> }) {
  return (
    <Frame
      icon={<ClipboardCheck size={15} />}
      title={`제출 검증 · ${card.taskId}`}
      tone={card.passed ? "success" : "danger"}
      right={<Badge tone={card.passed ? "success" : "danger"}>{card.passed ? "DONE" : "반려"}</Badge>}
    >
      <ul className="space-y-1.5">
        <CheckRow ok={card.checks.scope} label="V1 스코프 — diff 경로가 전부 소유 레포 안" />
        <CheckRow ok={card.checks.tests} label="V2 테스트 — 브릿지(로컬)에서 실행, exit 0" />
        <CheckRow ok={card.checks.commit} label="V3 커밋 존재 — 제출한 해시가 레포에 있음" />
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-500">
        <span className="inline-flex items-center gap-1 rounded-md bg-ink-100 px-2 py-0.5 font-mono text-ink-700">
          <GitCommitHorizontal size={12} /> {card.commit}
        </span>
        <span>{card.testSummary}</span>
      </div>
    </Frame>
  );
}

// ---------- Report ----------
export function ReportCard({
  message,
  card,
  canDecide,
}: {
  message: Message;
  card: Extract<Card, { kind: "report" }>;
  canDecide: boolean;
}) {
  const { actions } = useApp();
  const [note, setNote] = useState("");
  const [asking, setAsking] = useState(false);
  const total = card.cost.FE + card.cost.BE + card.cost.PM;
  return (
    <Frame
      icon={<ClipboardCheck size={15} />}
      title={card.title}
      tone="brand"
      right={
        card.status === "approved" ? (
          <Badge tone="success">승인됨</Badge>
        ) : card.status === "changes_requested" ? (
          <Badge tone="warn">수정 요청됨</Badge>
        ) : (
          <Badge tone="brand">확인 대기</Badge>
        )
      }
    >
      <div className="grid grid-cols-3 gap-2">
        <Stat label="완료" value={`${card.done}/${card.total}`} />
        <Stat label="소요" value={card.duration} />
        <Stat label="비용" value={fmtKrw(total)} />
      </div>
      <div className="mt-3 text-[12.5px] text-ink-600">
        사람별 비용 — FE {fmtKrw(card.cost.FE)} · BE {fmtKrw(card.cost.BE)} · PM {fmtKrw(card.cost.PM)} (NOMOS 부담)
      </div>
      <Section title="결정된 사항" items={card.decisions} />
      <Section title="검증 결과" items={card.checks} check />
      <Section title="확인 부탁드리는 것" items={card.confirmItems} />
      {card.status === "pending" && canDecide && (
        <div className="mt-4 border-t border-ink-100 pt-3">
          {asking ? (
            <div className="space-y-2">
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder='예: 추천 탭 문구를 "오늘의 재즈"로 바꿔줘'
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    actions.decideReport(message.id, "changes", note);
                    setAsking(false);
                  }}
                >
                  수정 요청 보내기
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAsking(false)}>
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => actions.decideReport(message.id, "approve")}>
                <Check size={14} /> 승인
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAsking(true)}>
                수정 요청
              </Button>
              <span className="text-[12px] text-ink-500">수정 요청 시 관련 태스크만 재개방됩니다 (전체 롤백 아님)</span>
            </div>
          )}
        </div>
      )}
    </Frame>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-200 px-3 py-2">
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-500">{label}</div>
      <div className="mt-0.5 text-[15px] font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Section({ title, items, check }: { title: string; items: string[]; check?: boolean }) {
  if (!items.length) return null;
  return (
    <div className="mt-3">
      <div className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">{title}</div>
      <ul className="mt-1.5 space-y-1 text-[13px] text-ink-800">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            {check ? (
              <Check size={14} className="mt-0.5 shrink-0 text-auto" />
            ) : (
              <span className="text-ink-400">·</span>
            )}
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Policy denied ----------
export function PolicyCard({ card }: { card: Extract<Card, { kind: "policy" }> }) {
  const meta = DECIDER_META[card.decider];
  return (
    <Frame
      icon={<ShieldBan size={15} />}
      title={`정책 게이트 · ${card.actionKey}`}
      tone="danger"
      right={<Badge tone="danger">{meta.label}</Badge>}
    >
      <div className="font-mono text-[12.5px] text-ink-800 break-all">{card.path}</div>
      <p className="mt-2 text-[13px] text-ink-700">{card.reason}</p>
      <p className="mt-2 text-[12px] text-ink-500">
        탐지는 결정적입니다 — diff 경로 ∉ 소유 레포. 레벨과 무관하게 🔒 고정.
      </p>
    </Frame>
  );
}

// ---------- Repo connect ----------
export function RepoCard({
  card,
  canEdit,
  projectId,
}: {
  card: Extract<Card, { kind: "repo" }>;
  canEdit: boolean;
  projectId: string;
}) {
  const { actions } = useApp();
  const [url, setUrl] = useState(
    card.role === "FE" ? "https://github.com/Capstone-NOMOS/" : "https://github.com/Capstone-NOMOS/",
  );
  const [path, setPath] = useState("~/dev/");
  if (card.status === "connected") {
    return (
      <Frame
        icon={<Link2 size={15} />}
        title={`${card.role} 레포 연결됨`}
        tone="success"
        right={
          <Badge tone="success">
            <Check size={11} /> 연결됨
          </Badge>
        }
      >
        <div className="space-y-1 text-[13px]">
          <div className="flex gap-2">
            <span className="w-16 shrink-0 text-ink-500">URL</span>
            <span className="min-w-0 break-all font-mono text-[12.5px]">{card.url}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-16 shrink-0 text-ink-500">로컬 경로</span>
            <span className="font-mono text-[12.5px]">{card.localPath}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-16 shrink-0 text-ink-500">스코프</span>
            <span className="font-mono text-[12.5px]">{`${card.localPath}/**`}</span>
          </div>
        </div>
        <p className="mt-2 text-[12px] text-ink-500">
          서버는 코드를 보지 않습니다. URL과 경로만 알고, 에이전트는 이 경로 안에서만 실행됩니다.
        </p>
      </Frame>
    );
  }
  return (
    <Frame
      icon={<Link2 size={15} />}
      title={`${card.role} 레포 연결`}
      tone="brand"
      right={<Badge tone="brand">대기</Badge>}
    >
      {canEdit ? (
        <div className="space-y-2.5">
          <Input
            label="레포 URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/org/repo"
          />
          <Input
            label="로컬 경로"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="~/dev/repo"
            hint="브릿지가 이 경로에서 에이전트를 실행합니다"
          />
          <Button
            size="sm"
            onClick={() =>
              url.trim() && path.trim() && actions.connectRepo(projectId, card.role, url.trim(), path.trim())
            }
          >
            연결
          </Button>
        </div>
      ) : (
        <p className="text-[13px] text-ink-500">{card.role} 개발자가 레포를 연결하면 여기에 표시됩니다.</p>
      )}
    </Frame>
  );
}

// ---------- Notice ----------
export function Notice({ card }: { card: Extract<Card, { kind: "notice" }> }) {
  const cls = {
    info: "bg-ink-50 text-ink-600 border-ink-200",
    warn: "bg-human-bg text-human border-amber-200",
    success: "bg-auto-bg text-auto border-emerald-200",
    danger: "bg-forbidden-bg text-forbidden border-red-200",
  }[card.tone];
  const Icon =
    card.tone === "warn" ? AlertTriangle : card.tone === "success" ? Check : card.tone === "danger" ? ShieldBan : Info;
  return (
    <div
      className={cn(
        "my-1 inline-flex max-w-[640px] items-start gap-2 rounded-lg border px-3 py-2 text-[12.5px] leading-relaxed",
        cls,
      )}
    >
      <Icon size={14} className="mt-0.5 shrink-0" />
      <span>{card.text}</span>
    </div>
  );
}
