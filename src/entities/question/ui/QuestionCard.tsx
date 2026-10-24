"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { errorMessage, type Schemas } from "@/shared/api";
import { Badge, Button, Input, Textarea } from "@/shared/ui";
import { cn, fmtDateTime, relTime } from "@/shared/lib/format";
import { useAnswerQuestion, useSetGold } from "../api/questionApi";

type AgentQuestion = Schemas["AgentQuestion"];

// PM 질문은 PM 에이전트가 초안만 쓰고 대표가 확정한다
const ROLE: Record<AgentQuestion["targetRole"], { label: string; tone: "fe" | "be" | "pm" }> = {
  FRONTEND: { label: "FE", tone: "fe" },
  BACKEND: { label: "BE", tone: "be" },
  PM: { label: "PM(대표)", tone: "pm" },
};

type GoldTarget = "FRONTEND" | "BACKEND" | "PM" | "SELF";
const GOLD: { value: GoldTarget; label: string }[] = [
  { value: "FRONTEND", label: "FE" },
  { value: "BACKEND", label: "BE" },
  { value: "PM", label: "PM(대표)" },
  { value: "SELF", label: "질문한 쪽 스스로" },
];

const SOURCE: Record<NonNullable<AgentQuestion["answerSource"]>, string> = {
  agent: "에이전트가 답함 · 사람 미확인",
  human: "사람이 답함",
  agent_confirmed: "에이전트 답을 사람이 확인함",
  human_override: "사람이 에이전트 답을 뒤집음",
};

const STATUS: Record<
  AgentQuestion["status"],
  { label: string; tone: "warn" | "info" | "success" | "danger" | "neutral" }
> = {
  pending: { label: "답 기다리는 중", tone: "warn" },
  agent_answered: { label: "상대 에이전트가 코드에서 답함 · 확인 권장", tone: "info" },
  answered: { label: "답함", tone: "success" },
  expired: { label: "만료 · 태스크는 대표에게 넘어감", tone: "danger" },
  self_owned: { label: "스스로 정할 일로 돌려보냄", tone: "neutral" },
};

/** multiSelect는 고른 label을 "a, b"처럼 쉼표로 이어 보낸다 */
function toggleLabel(value: string, label: string) {
  const picked = value.split(", ").filter(Boolean);
  return (picked.includes(label) ? picked.filter((x) => x !== label) : [...picked, label]).join(", ");
}

/**
 * 에이전트가 다른 역할에게 물은 질문 카드. 답할 역할의 담당자와 대표만 답한다(canAnswer) — 최종 판정은 403 NOT_QUESTION_TARGET.
 * 한 카드의 질문(최대 4개)을 전부 답해야 보낼 수 있다. 초안(draft)이 있으면 그 답을 기본값으로 채운다
 */
export function QuestionCard({
  question: q,
  canAnswer,
  canLabel = false,
  taskHref,
  taskTitle,
}: {
  question: AgentQuestion;
  canAnswer: boolean;
  /** 대표 전용 평가 — 답이 끝난 질문에 "원래 누구에게 갔어야 했나"를 붙인다 */
  canLabel?: boolean;
  taskHref: string;
  taskTitle?: string;
}) {
  const answer = useAnswerQuestion();
  const isPm = q.targetRole === "PM";
  const agentAnswered = q.status === "agent_answered";
  const open = q.status === "pending" || agentAnswered;
  // 에이전트가 이미 답했으면 그 답, 아니면 상담 초안
  const initial = agentAnswered ? q.answers : q.draft?.answers;
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(q.questions.map((x) => [x.question, initial?.[x.question] ?? ""])),
  );
  const set = (question: string, v: string) => setValues((prev) => ({ ...prev, [question]: v }));

  const complete = q.questions.every((x) => values[x.question].trim() !== "");
  // 손대지 않은 답은 원문 그대로 보낸다 — 공백만 달라도 서버는 "뒤집기"로 본다
  const original = (question: string) => (agentAnswered ? q.answers?.[question] : undefined);
  const unchanged = (question: string) => values[question].trim() === original(question)?.trim();
  const overriding = agentAnswered && q.questions.some((x) => !unchanged(x.question));

  const submit = () =>
    answer.mutate({
      id: q.id,
      answers: Object.fromEntries(
        q.questions.map((x) => [x.question, unchanged(x.question) ? original(x.question)! : values[x.question].trim()]),
      ),
    });

  return (
    <div id={q.id} className="card scroll-mt-6 p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={ROLE[q.askerRole].tone}>{ROLE[q.askerRole].label} 에이전트</Badge>
        <ArrowRight size={13} className="text-ink-400" aria-label="질문 대상" />
        <Badge tone={ROLE[q.targetRole].tone}>{ROLE[q.targetRole].label}</Badge>
        <Badge tone={STATUS[q.status].tone}>{STATUS[q.status].label}</Badge>
        {/* 상담 초안이 있으면 몇 개를 코드에서 확인했는지 */}
        {q.status === "pending" && q.draft && (
          <Badge tone="info">
            {q.questions.filter((x) => q.draft?.decided[x.question]).length}/{q.questions.length} 코드에서 확인
          </Badge>
        )}
        <Link href={taskHref} className="min-w-0 flex-1 truncate text-[13px] font-medium hover:underline">
          {taskTitle ?? "태스크 보기"}
        </Link>
        <span className="text-[11.5px] text-ink-500" title={fmtDateTime(q.createdAt)}>
          {relTime(q.createdAt)}
        </span>
      </div>
      {q.routedBy.startsWith("fallback:") && (
        <p className="mt-1.5 text-[11.5px] text-ink-500">
          자동 분류에 실패해 대표에게 왔습니다{q.routing.fallback && ` · ${q.routing.fallback}`}
        </p>
      )}

      <ol className="mt-3 space-y-4">
        {q.questions.map((x) => {
          const decided = q.draft?.decided[x.question];
          const basis = q.draft?.basis[x.question] ?? [];
          return (
            <li key={x.question}>
              <div className="flex flex-wrap items-center gap-1.5">
                {x.header && <Badge>{x.header}</Badge>}
                {/* decided=false: 코드에 없는 결정 — 사람이 정해야 한다 */}
                {open && decided === false && <Badge tone="warn">코드에 없는 결정 · 사람이 정해야 함</Badge>}
                {open && isPm && q.draft ? (
                  <Badge tone="pm">PM 초안 — 대표 확인 필요</Badge>
                ) : (
                  open && decided === true && <Badge tone="info">에이전트 초안</Badge>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[14px] font-medium leading-6">{x.question}</p>

              {open && canAnswer ? (
                <>
                  {x.options.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {x.options.map((o) => {
                        const picked = x.multiSelect
                          ? values[x.question].split(", ").includes(o.label)
                          : values[x.question] === o.label;
                        return (
                          <li key={o.label}>
                            <button
                              type="button"
                              aria-pressed={picked}
                              disabled={answer.isPending}
                              onClick={() =>
                                set(x.question, x.multiSelect ? toggleLabel(values[x.question], o.label) : o.label)
                              }
                              className={cn(
                                "w-full rounded-lg border px-3 py-2 text-left text-[13px]",
                                picked ? "border-ink-900 bg-white" : "border-ink-200 hover:bg-ink-50",
                              )}
                            >
                              <span className="font-medium">{o.label}</span>
                              {o.description && <span className="block text-[12px] text-ink-500">{o.description}</span>}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <Textarea
                    rows={2}
                    className="mt-2"
                    value={values[x.question]}
                    onChange={(e) => set(x.question, e.target.value)}
                    disabled={answer.isPending}
                    placeholder={
                      x.options.length > 0
                        ? "선택지를 고르거나 직접 쓰세요. 근거를 덧붙이면 에이전트가 그것까지 따릅니다"
                        : "답을 쓰세요. 근거를 덧붙이면 에이전트가 그것까지 따릅니다"
                    }
                    aria-label={`답: ${x.question}`}
                  />
                </>
              ) : (
                <p className="mt-1.5 whitespace-pre-wrap rounded-lg bg-ink-50 px-3 py-2 text-[13px] text-ink-900">
                  {(open ? initial : q.answers)?.[x.question] ?? (
                    <span className="text-ink-500">아직 답이 없습니다</span>
                  )}
                </p>
              )}
              {basis.length > 0 && (
                <p className="mt-1 text-[11.5px] text-ink-500">
                  근거 <span className="font-mono">{basis.join(", ")}</span>
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {!open ? (
        <p className="mt-3 text-[12.5px] text-ink-500">
          {q.answerSource && SOURCE[q.answerSource]}
          {q.answeredAt && ` · ${fmtDateTime(q.answeredAt)}`}
        </p>
      ) : !canAnswer ? (
        <p className="mt-3 text-[12.5px] text-ink-500">
          {isPm ? "대표가 확정합니다" : `${ROLE[q.targetRole].label} 담당자나 대표가 답합니다`} ·{" "}
          {fmtDateTime(q.expiresAt)}까지
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {agentAnswered && (
            <p className="rounded-lg bg-human-bg px-3 py-2 text-[12.5px] text-human">
              에이전트가 이미 이 답을 묻는 쪽에 전달했습니다. 답을 바꾸면 뒤집기가 되는데, 이미 그 답으로 구현됐을 수
              있습니다. 고치는 태스크는 자동으로 생기지 않습니다.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={overriding ? "danger" : "primary"}
              disabled={!complete || answer.isPending}
              onClick={submit}
            >
              {answer.isPending
                ? "보내는 중…"
                : overriding
                  ? "답 뒤집기"
                  : agentAnswered
                    ? "이 답으로 확인"
                    : "답 보내기"}
            </Button>
            <span className="text-[12px] text-ink-500">
              {!complete ? "모든 질문에 답해야 보낼 수 있습니다 · " : ""}
              {fmtDateTime(q.expiresAt)}까지 답이 없으면 만료됩니다
            </span>
          </div>
        </div>
      )}
      {answer.isError && <p className="mt-2 text-[12.5px] text-forbidden">{errorMessage(answer.error)}</p>}
      {canLabel && q.status === "answered" && <GoldLabel id={q.id} />}
    </div>
  );
}

/** 발표 평가용 정답 담당자. 서비스 동작은 바뀌지 않는다. 다시 저장하면 바뀐다 */
function GoldLabel({ id }: { id: string }) {
  const gold = useSetGold();
  const [target, setTarget] = useState<GoldTarget | "">("");
  const [note, setNote] = useState("");
  return (
    <details className="mt-3 border-t border-ink-100 pt-2 text-[12.5px]">
      <summary className="cursor-pointer text-ink-500">평가</summary>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-ink-700">원래 누구에게 갔어야 했나</span>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value as GoldTarget)}
          disabled={gold.isPending}
          aria-label="정답 담당자"
          className="h-8 rounded-lg border border-ink-200 bg-white px-2"
        >
          <option value="" disabled>
            선택
          </option>
          {GOLD.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={gold.isPending}
          placeholder="근거 (선택)"
          aria-label="근거"
          className="h-8 min-w-0 flex-1 text-[12.5px]"
        />
        <Button
          size="sm"
          disabled={!target || gold.isPending}
          onClick={() => target && gold.mutate({ id, target, note: note.trim() || undefined })}
        >
          {gold.isPending ? "저장 중…" : "저장"}
        </Button>
      </div>
      {gold.isSuccess && (
        <p className="mt-1 text-ink-500">저장됨 · {GOLD.find((g) => g.value === gold.data.goldTarget)?.label}</p>
      )}
      {gold.isError && <p className="mt-1 text-forbidden">{errorMessage(gold.error)}</p>}
    </details>
  );
}
