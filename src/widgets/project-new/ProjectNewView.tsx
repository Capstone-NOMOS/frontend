"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUp, Check, Loader2 } from "lucide-react";
import { ApiError, errorMessage, type Schemas } from "@/shared/api";
import { AgentMark, Badge, Button, CopyField, Input, Logo } from "@/shared/ui";
import { cn, fmtDateTime } from "@/shared/lib/format";
import type { Level, TeamRole } from "@/shared/model";
import { useCreateInvite } from "@/entities/org";
import { LEVELS, LevelGates } from "@/entities/policy";
import { useCreateProject } from "@/entities/project";
import { CreateGithubRepo, OwnershipBadge, useRepos } from "@/entities/repo";
import { TEAM_ROLE_META, TeamRoleBadge } from "@/entities/task";
import { useCurrentUser } from "@/entities/user";

type Step = "name" | "repos" | "invite" | "level" | "pmBudget" | "extras";
type Line = { from: "nomos" | "me"; text: ReactNode };

const STEPS: { key: Step; label: string }[] = [
  { key: "name", label: "이름" },
  { key: "repos", label: "레포" },
  { key: "invite", label: "초대" },
  { key: "level", label: "레벨" },
  { key: "pmBudget", label: "PM 예산" },
  { key: "extras", label: "선택" },
];

const PROMPTS: Record<Step, string> = {
  name: "새 프로젝트를 만들어볼까요? 이름이 뭔가요?",
  repos: "이 프로젝트에서 쓸 레포를 골라주세요. 소유 역할(FE·BE)이 지정된 레포만 넣을 수 있습니다.",
  invite:
    "같이 일할 FE·BE 개발자에게 보낼 초대 링크를 만들 수 있습니다. 이미 조직에 있는 사람은 건너뛰세요. 링크는 나중에 설정 > 조직에서도 만들 수 있습니다.",
  level:
    "에이전트 허용 레벨을 정해주세요. 레벨은 자율성이 아니라 '행동마다 누가 승인하는가'를 정한 표입니다. 기본값은 L2입니다.",
  pmBudget: "PM 예산(USD)을 정해주세요. PM은 NOMOS 키로 돌기 때문에 상한이 꼭 필요합니다.",
  extras: "프로젝트 전체 예산과 마감일을 정할 수 있습니다. 둘 다 선택입니다.",
};

/** 소수 둘째 자리까지의 양수 */
const USD = /^(?:\d+)(?:\.\d{1,2})?$/;
const parseUsd = (v: string) => (USD.test(v.trim()) && Number(v) > 0 ? Number(v) : null);

export function ProjectNewView() {
  // AuthGate 안쪽이므로 me와 orgId가 있다
  const me = useCurrentUser().me!;
  const orgId = me.orgId!;
  const isRep = me.orgRole === "REPRESENTATIVE";
  const router = useRouter();

  const [step, setStep] = useState<Step>("name");
  const [lines, setLines] = useState<Line[]>([{ from: "nomos", text: PROMPTS.name }]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [form, setForm] = useState({ name: "", repoIds: [] as string[], level: "L2" as Level, pmBudgetUsd: 0 });
  // 409 REPO_IN_ACTIVE_PROJECT로 레포만 다시 고르는 중. 고르면 레벨·예산을 다시 묻지 않고 마지막 단계로 간다
  const [returning, setReturning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 프로젝트 생성은 대표 전용 (403 NOT_REPRESENTATIVE). 팀원은 목록으로
  useEffect(() => {
    if (!isRep) router.replace("/projects");
  }, [isRep, router]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lines, typing, step]);

  const textStep = step === "name" || step === "pmBudget";
  useEffect(() => {
    if (!typing && textStep) inputRef.current?.focus();
  }, [typing, textStep]);

  const answer = (text: ReactNode, next: Step) => {
    setLines((l) => [...l, { from: "me", text }]);
    setTyping(true);
    setTimeout(() => {
      setLines((l) => [...l, { from: "nomos", text: PROMPTS[next] }]);
      setTyping(false);
      setStep(next);
    }, 500);
  };

  const budgetValue = parseUsd(input);
  const submitText = () => {
    const v = input.trim();
    if (step === "name" && v) {
      setForm((f) => ({ ...f, name: v }));
      setInput("");
      answer(v, "repos");
    } else if (step === "pmBudget" && budgetValue !== null) {
      setForm((f) => ({ ...f, pmBudgetUsd: budgetValue }));
      setInput("");
      answer(`$${budgetValue}`, "extras");
    }
  };

  if (!isRep) return null;
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="flex h-dvh flex-col bg-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-ink-200 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/projects" aria-label="프로젝트 목록">
            <Logo />
          </Link>
          <span className="hidden text-ink-300 sm:inline">/</span>
          <span className="hidden text-[13.5px] font-medium sm:inline">새 프로젝트</span>
        </div>
        <ol className="flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <li
              key={s.key}
              className={cn(
                "flex items-center gap-1 text-[11.5px]",
                i < stepIndex ? "text-auto" : i === stepIndex ? "font-medium text-ink-900" : "text-ink-400",
              )}
            >
              {i < stepIndex ? (
                <Check size={11} />
              ) : (
                <span className={cn("h-1.5 w-1.5 rounded-full", i === stepIndex ? "bg-ink-900" : "bg-ink-300")} />
              )}
              <span className="hidden sm:inline">{s.label}</span>
            </li>
          ))}
        </ol>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[720px] space-y-4 px-4 py-6 sm:px-6">
          {lines.map((l, i) =>
            l.from === "nomos" ? (
              <div key={i} className="flex gap-2.5 animate-rise">
                <AgentMark tone="pm" size={30} />
                <div className="min-w-0 pt-1">
                  <div className="mb-0.5 text-[12px] font-semibold text-ink-500">NOMOS</div>
                  <p className="max-w-[560px] text-[15px] leading-7 text-ink-900">{l.text}</p>
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-end animate-rise">
                <div className="max-w-[80%] rounded-2xl rounded-br-md bg-ink-100 px-4 py-2.5 text-[15px] leading-6">
                  {l.text}
                </div>
              </div>
            ),
          )}

          {typing ? (
            <Typing />
          ) : step === "repos" ? (
            <RepoPicker
              orgId={orgId}
              onDone={(repos) => {
                setForm((f) => ({ ...f, repoIds: repos.map((r) => r.id) }));
                answer(repos.map((r) => r.fullName).join(", "), returning ? "extras" : "invite");
                setReturning(false);
              }}
            />
          ) : step === "invite" ? (
            <InviteStep
              orgId={orgId}
              onDone={(made) =>
                answer(made.length > 0 ? `${made.join("·")} 초대 링크를 만들었어요` : "초대는 나중에 할게요", "level")
              }
            />
          ) : step === "level" ? (
            <LevelPicker
              onPick={(level) => {
                setForm((f) => ({ ...f, level }));
                answer(`${level} · ${LEVELS.find((l) => l.id === level)!.title}`, "pmBudget");
              }}
            />
          ) : step === "extras" ? (
            <Extras
              orgId={orgId}
              form={form}
              onCreated={(projectId) => router.push(`/p/${projectId}/settings`)}
              onBackToRepos={() => {
                setLines((l) => [...l, { from: "nomos", text: PROMPTS.repos }]);
                setReturning(true);
                setStep("repos");
              }}
            />
          ) : null}
        </div>
      </div>

      {textStep && (
        <div className="shrink-0 border-t border-ink-100 bg-white safe-bottom">
          <div className="mx-auto max-w-[720px] px-3 py-3 sm:px-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitText();
              }}
              className="flex items-center gap-2 rounded-2xl border border-ink-200 bg-white px-2 py-1.5 shadow-card focus-within:border-ink-300 focus-within:ring-4 focus-within:ring-ink-100"
            >
              {step === "pmBudget" && <span className="pl-2 text-[15px] text-ink-500">$</span>}
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={typing}
                maxLength={step === "name" ? 128 : 12}
                inputMode={step === "pmBudget" ? "decimal" : undefined}
                placeholder={step === "name" ? "예: 스터디 관리 웹앱" : "예: 40"}
                className="h-10 flex-1 bg-transparent px-2 text-[15px] outline-none placeholder:text-ink-400"
              />
              <button
                type="submit"
                disabled={typing || (step === "name" ? !input.trim() : budgetValue === null)}
                aria-label="보내기"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink-900 text-white disabled:bg-ink-200"
              >
                <ArrowUp size={16} />
              </button>
            </form>
            {step === "pmBudget" && input.trim() !== "" && budgetValue === null && (
              <div className="mt-1.5 text-center text-[11.5px] text-forbidden">0보다 큰 금액 (소수 둘째 자리까지)</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Typing() {
  return (
    <div className="flex items-center gap-2.5">
      <AgentMark tone="pm" size={30} />
      <span className="inline-flex items-center gap-1 rounded-2xl bg-ink-100 px-3 py-2">
        <span className="h-1.5 w-1.5 rounded-full bg-ink-400 pulse-dot" />
        <span className="h-1.5 w-1.5 rounded-full bg-ink-400 pulse-dot [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-ink-400 pulse-dot [animation-delay:300ms]" />
      </span>
    </div>
  );
}

function ChatCard({ children }: { children: ReactNode }) {
  return <div className="card ml-0 p-4 animate-rise sm:ml-10">{children}</div>;
}

const selectable = (r: Schemas["RepoListItem"]) => r.ownershipAssigned && r.activeProjectId === null;

function RepoPicker({ orgId, onDone }: { orgId: string; onDone: (repos: { id: string; fullName: string }[]) => void }) {
  const repos = useRepos(orgId);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  // 이 화면은 대표 전용이라 "새 레포 만들기"를 항상 보여 준다. 만든 레포는 소유 역할이 있어 바로 고를 수 있다
  const createRepo = creating ? (
    <div className="mt-3">
      <CreateGithubRepo
        orgId={orgId}
        onClose={() => setCreating(false)}
        onCreated={(repo) => {
          setPicked((prev) => new Set(prev).add(repo.id));
          setCreating(false);
        }}
      />
    </div>
  ) : (
    <Button variant="outline" size="sm" className="mt-3" onClick={() => setCreating(true)}>
      새 레포 만들기
    </Button>
  );

  if (repos.isPending) {
    return (
      <ChatCard>
        <div className="flex justify-center py-4 text-ink-400" aria-busy="true">
          <Loader2 size={16} className="animate-spin" aria-label="불러오는 중" />
        </div>
      </ChatCard>
    );
  }
  if (repos.isError) {
    return (
      <ChatCard>
        <p className="text-[13px] text-forbidden">{errorMessage(repos.error)}</p>
      </ChatCard>
    );
  }
  if (repos.data.length === 0) {
    return (
      <ChatCard>
        <p className="text-[13.5px] text-ink-700">
          연결된 레포가 없습니다. 새 레포를 만들거나{" "}
          <Link href="/settings/org" target="_blank" className="font-medium text-ink-900 underline underline-offset-2">
            조직에서 기존 레포를 연결
          </Link>
          하세요.
        </p>
        {createRepo}
      </ChatCard>
    );
  }

  return (
    <ChatCard>
      <ul className="divide-y divide-ink-100">
        {repos.data.map((r) => (
          <li key={r.id} className="py-2">
            <label
              className={cn(
                "flex items-center gap-2.5 text-[13.5px]",
                selectable(r) ? "cursor-pointer" : "text-ink-400",
              )}
            >
              {/* 소유 역할이 없으면 422 REPO_OWNERSHIP_NOT_SET, 진행 중 프로젝트가 쓰면 409 REPO_IN_ACTIVE_PROJECT — 미리 막는다 */}
              <input
                type="checkbox"
                disabled={!selectable(r)}
                checked={picked.has(r.id)}
                onChange={() =>
                  setPicked((prev) => {
                    const next = new Set(prev);
                    if (next.has(r.id)) next.delete(r.id);
                    else next.add(r.id);
                    return next;
                  })
                }
              />
              <span className="font-mono">{r.fullName}</span>
              <span className="ml-auto">
                <OwnershipBadge assigned={r.ownershipAssigned} />
              </span>
            </label>
            {r.activeProjectId ? (
              <p className="mt-1 pl-6 text-[12px] text-ink-500">
                &lsquo;{r.activeProjectName}&rsquo; 프로젝트에서 사용 중입니다
              </p>
            ) : (
              !r.ownershipAssigned && (
                <p className="mt-1 pl-6 text-[12px] text-ink-500">
                  소유 역할을 먼저 지정하세요 ·{" "}
                  {/* 새 탭으로 연다 — 이 대화(화면 상태)를 잃지 않게. 돌아오면 창 포커스로 레포 목록을 다시 읽는다 */}
                  <Link
                    href={`/org/repos/${r.id}`}
                    target="_blank"
                    className="font-medium text-ink-900 underline underline-offset-2"
                  >
                    지정하러 가기
                  </Link>
                </p>
              )
            )}
          </li>
        ))}
      </ul>
      {createRepo}
      <div>
        <Button
          size="sm"
          className="mt-3"
          disabled={picked.size === 0 || creating}
          onClick={() => onDone(repos.data.filter((r) => picked.has(r.id)))}
        >
          {picked.size > 0 ? `${picked.size}개 선택` : "선택"}
        </Button>
      </div>
    </ChatCard>
  );
}

const INVITE_ROLES: TeamRole[] = ["FRONTEND", "BACKEND"];

/** 레포를 고른 직후 FE·BE 초대 링크를 만든다. 초대는 조직 단위라 프로젝트가 생기기 전에 만들어도 된다. 건너뛸 수 있다 */
function InviteStep({ orgId, onDone }: { orgId: string; onDone: (made: string[]) => void }) {
  const [made, setMade] = useState<string[]>([]);
  return (
    <ChatCard>
      <ul className="space-y-4">
        {INVITE_ROLES.map((role) => (
          <InviteRow
            key={role}
            orgId={orgId}
            role={role}
            onMade={() => setMade((m) => [...m, TEAM_ROLE_META[role].label])}
          />
        ))}
      </ul>
      <p className="mt-4 text-[12px] text-ink-500">
        링크는 한 번 쓰면 만료되고 7일 뒤에도 만료됩니다. 들어온 사람의 에이전트는 프로젝트 설정에서 역할에 배정합니다.
      </p>
      <Button size="sm" className="mt-3" onClick={() => onDone(made)}>
        {made.length > 0 ? "다음" : "건너뛰기"}
      </Button>
    </ChatCard>
  );
}

function InviteRow({ orgId, role, onMade }: { orgId: string; role: TeamRole; onMade: () => void }) {
  const invite = useCreateInvite(orgId);
  return (
    <li>
      <div className="flex items-center gap-2">
        <TeamRoleBadge role={role} />
        <span className="flex-1 text-[13.5px] font-medium">{TEAM_ROLE_META[role].label} 개발자 초대</span>
        {!invite.data && (
          <Button
            variant="outline"
            size="sm"
            disabled={invite.isPending}
            onClick={() => invite.mutate({ teamRole: role, expiresInDays: 7 }, { onSuccess: onMade })}
          >
            {invite.isPending ? "만드는 중…" : "링크 만들기"}
          </Button>
        )}
      </div>
      {invite.isError && <p className="mt-1.5 text-[12.5px] text-forbidden">{errorMessage(invite.error)}</p>}
      {invite.data && (
        <div className="mt-2 space-y-1">
          <CopyField value={invite.data.url} />
          <p className="text-[12px] text-ink-500">{fmtDateTime(invite.data.expiresAt)}까지</p>
        </div>
      )}
    </li>
  );
}

function LevelPicker({ onPick }: { onPick: (level: Level) => void }) {
  return (
    <div className="ml-0 grid grid-cols-1 gap-2 animate-rise sm:ml-10 sm:grid-cols-2">
      {LEVELS.map((l) => (
        <button
          key={l.id}
          onClick={() => onPick(l.id)}
          className="rounded-xl border border-ink-200 p-3.5 text-left transition hover:border-ink-900 hover:ring-2 hover:ring-ink-900/10"
        >
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[15px] font-semibold">
              {l.id} <span className="font-medium">{l.title}</span>
            </span>
            {l.id === "L2" ? <Badge>기본값</Badge> : <span className="text-[11.5px] text-ink-400">{l.blurb}</span>}
          </div>
          <LevelGates level={l.id} />
        </button>
      ))}
    </div>
  );
}

function Extras({
  orgId,
  form,
  onCreated,
  onBackToRepos,
}: {
  orgId: string;
  form: { name: string; repoIds: string[]; level: Level; pmBudgetUsd: number };
  onCreated: (projectId: string) => void;
  onBackToRepos: () => void;
}) {
  const create = useCreateProject(orgId);
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [questionRelay, setQuestionRelay] = useState(true);
  const budgetUsd = budget.trim() === "" ? undefined : parseUsd(budget);

  const submit = () =>
    create.mutate(
      {
        name: form.name,
        repoIds: form.repoIds,
        autonomyPreset: form.level,
        pmBudgetUsd: form.pmBudgetUsd,
        ...(budgetUsd != null && { budgetUsd }),
        // <input type="date">는 YYYY-MM-DD 문자열을 준다. Date로 바꾸지 않는다(타임존)
        ...(deadline && { deadline }),
        // 생략하면 켜짐
        ...(!questionRelay && { questionRelay }),
      },
      { onSuccess: (detail) => onCreated(detail.project.id) },
    );

  const error = create.error;
  return (
    <ChatCard>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Input
            label="전체 예산 (USD, 선택)"
            inputMode="decimal"
            placeholder="비우면 상한 없음"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            aria-invalid={budgetUsd === null}
          />
          {budgetUsd === null && <p className="mt-1 text-[12px] text-forbidden">0보다 큰 금액 (소수 둘째 자리까지)</p>}
        </div>
        <Input label="마감일 (선택)" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </div>
      <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-[13.5px]">
        <input
          type="checkbox"
          className="mt-1"
          checked={questionRelay}
          onChange={(e) => setQuestionRelay(e.target.checked)}
        />
        <span>
          질문 중계
          <span className="block text-[12px] text-ink-500">
            끄면 에이전트가 다른 역할에게 묻지 않고 가정하고 진행합니다(대조군 실험 등). 시작 전까지 설정에서 바꿀 수
            있습니다.
          </span>
        </span>
      </label>
      {error && (
        <div className="mt-3 text-[12.5px] text-forbidden">
          {error instanceof ApiError && error.code === "REPO_OWNERSHIP_NOT_SET" ? (
            <>
              {errorMessage(error)} ·{" "}
              <Link href="/settings/org" className="font-medium underline underline-offset-2">
                조직에서 지정
              </Link>
            </>
          ) : error instanceof ApiError && error.code === "REPO_IN_ACTIVE_PROJECT" ? (
            <>
              {errorMessage(error)}
              <ul className="mt-1 space-y-0.5 text-ink-700">
                {inUse(error).map((d) => (
                  <li key={d.repoId}>
                    <span className="font-mono">{d.fullName}</span> · &lsquo;{d.projectName}&rsquo;에서 사용 중
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="sm" className="mt-2" onClick={onBackToRepos}>
                레포 다시 고르기
              </Button>
            </>
          ) : (
            errorMessage(error)
          )}
        </div>
      )}
      <Button className="mt-4" onClick={submit} disabled={budgetUsd === null || create.isPending || create.isSuccess}>
        {create.isPending || create.isSuccess ? "만드는 중…" : "프로젝트 만들기"}
      </Button>
    </ChatCard>
  );
}

type RepoInUse = { repoId: string; fullName: string; projectId: string; projectName: string };

/** 409 REPO_IN_ACTIVE_PROJECT의 details: 겹치는 레포 전부. 형식이 다르면 빈 배열 */
function inUse(error: ApiError): RepoInUse[] {
  if (!Array.isArray(error.details)) return [];
  return error.details.filter(
    (d): d is RepoInUse => typeof d === "object" && d !== null && typeof d.fullName === "string",
  );
}
