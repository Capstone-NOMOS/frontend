"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  BookOpen,
  ChevronDown,
  Eye,
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Plug,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import { ROOM_META, useApp, useProject } from "@/lib/store";
import { cn } from "@/lib/format";
import { AGENT_STATUS, Avatar, Badge, Button, Kbd, Logo, RoleBadge, StatusDot } from "@/components/ui";
import { CommandSearch } from "./CommandSearch";
import type { Room } from "@/lib/types";

export function AppShell({ projectId, children }: { projectId: string; children: ReactNode }) {
  const { state, hydrated, me } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);

  useEffect(() => {
    if (hydrated && !me) router.replace("/login");
  }, [hydrated, me, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const project = state.projects.find((p) => p.id === projectId);
  const member = me && state.members.find((m) => m.projectId === projectId && m.userId === me.id);

  if (!hydrated || !me) return <ShellSkeleton />;

  if (!project || !member) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <Logo />
        <h1 className="text-lg font-semibold">이 프로젝트에 접근할 수 없습니다</h1>
        <p className="max-w-sm text-sm text-ink-500">프로젝트가 없거나 멤버가 아닙니다. 초대 링크로 참여하거나 다른 프로젝트를 선택해주세요.</p>
        <Button href="/projects" variant="outline">
          프로젝트 목록
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-white">
      {/* desktop sidebar */}
      <aside className="hidden w-[264px] shrink-0 border-r border-ink-200 bg-ink-50/60 lg:flex lg:flex-col">
        <SidebarContent projectId={projectId} onSearch={() => setSearch(true)} />
      </aside>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="닫기" className="absolute inset-0 bg-ink-900/30" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[min(300px,85vw)] flex-col bg-white shadow-pop animate-rise">
            <SidebarContent projectId={projectId} onSearch={() => { setOpen(false); setSearch(true); }} onClose={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* mobile top bar */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-ink-200 px-3 lg:hidden" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
          <button aria-label="메뉴" onClick={() => setOpen(true)} className="rounded-lg p-2 text-ink-700 hover:bg-ink-100">
            <Menu size={20} />
          </button>
          <Link href={`/p/${projectId}`} className="min-w-0 flex-1 truncate text-[15px] font-semibold">
            {project.name}
          </Link>
          <button aria-label="검색" onClick={() => setSearch(true)} className="rounded-lg p-2 text-ink-700 hover:bg-ink-100">
            <Search size={19} />
          </button>
          <Link href={`/p/${projectId}/inbox`} aria-label="받은 편지함" className="rounded-lg p-2 text-ink-700 hover:bg-ink-100">
            <Inbox size={19} />
          </Link>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>

      {search && <CommandSearch projectId={projectId} onClose={() => setSearch(false)} />}
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex h-dvh w-full">
      <div className="hidden w-[264px] border-r border-ink-200 bg-ink-50/60 lg:block" />
      <div className="flex-1 p-6">
        <div className="h-6 w-40 animate-pulse rounded bg-ink-100" />
        <div className="mt-4 h-4 w-72 animate-pulse rounded bg-ink-100" />
      </div>
    </div>
  );
}

function NavItem({ href, icon, label, active, badge, trailing, onNavigate }: { href: string; icon: ReactNode; label: string; active: boolean; badge?: number; trailing?: ReactNode; onNavigate?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-medium transition-colors",
        active ? "bg-white text-ink-900 shadow-card" : "text-ink-700 hover:bg-ink-100",
      )}
    >
      <span className={cn("text-ink-500", active && "text-ink-900")}>{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
      {badge ? <span className="rounded-full bg-ink-900 px-1.5 text-[10px] font-semibold leading-4 text-white">{badge}</span> : null}
    </Link>
  );
}

function SidebarContent({ projectId, onSearch, onClose }: { projectId: string; onSearch: () => void; onClose?: () => void }) {
  const onNavigate = onClose;
  const { state, me, actions } = useApp();
  const { project, myRole, visibleRooms, tasks, agentFor, canWrite } = useProject(projectId);
  const pathname = usePathname();
  const router = useRouter();
  const [projOpen, setProjOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const myProjects = useMemo(() => state.projects.filter((p) => state.members.some((m) => m.projectId === p.id && m.userId === me?.id)), [state.projects, state.members, me]);
  const myAgent = me ? state.agents.find((a) => a.userId === me.id) : undefined;

  const inboxCount = useMemo(() => {
    if (!me || !project) return 0;
    const roomIds = new Set(visibleRooms.map((r) => r.id));
    return state.messages.filter((m) => {
      if (!roomIds.has(m.roomId)) return false;
      const c = m.card;
      if (!c) return false;
      const room = visibleRooms.find((r) => r.id === m.roomId)!;
      if (c.kind === "spec" && c.status === "pending" && myRole === "OWNER") return true;
      if (c.kind === "report" && c.status === "pending" && myRole === "OWNER") return true;
      if (c.kind === "question" && !c.answer && canWrite(room)) return true;
      if (c.kind === "repo" && c.status === "pending" && canWrite(room)) return true;
      return false;
    }).length;
  }, [state.messages, visibleRooms, myRole, me, project, canWrite]);

  const base = `/p/${projectId}`;
  const is = (p: string) => pathname === p;
  const startsWith = (p: string) => pathname.startsWith(p);

  const roomStatus = (room: Room) => {
    if (room.type === "OWNER") {
      const pending = state.messages.some((m) => m.roomId === room.id && ((m.card?.kind === "spec" && m.card.status === "pending") || (m.card?.kind === "report" && m.card.status === "pending")));
      return pending ? <span className="h-1.5 w-1.5 rounded-full bg-human" /> : null;
    }
    const agent = agentFor(room.type);
    const waiting = tasks.some((t) => t.role === room.type && t.state === "WAITING_HUMAN");
    if (waiting) return <span className="h-1.5 w-1.5 rounded-full bg-human" />;
    if (!agent) return null;
    return <StatusDot status={agent.status} pulse />;
  };

  if (!project) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-3 pt-4 pb-2">
        <div className="relative min-w-0 flex-1">
          <button onClick={() => setProjOpen((v) => !v)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-ink-100">
            <Logo size={16} wordmark={false} />
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{project.name}</span>
            <ChevronDown size={16} className="text-ink-500" />
          </button>
          {projOpen && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-ink-200 bg-white p-1.5 shadow-pop animate-rise">
              {myProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setProjOpen(false); router.push(`/p/${p.id}`); }}
                  className={cn("flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-ink-100", p.id === projectId && "font-semibold")}
                >
                  <span className="truncate">{p.name}</span>
                  <Badge tone="brand">{p.level}</Badge>
                </button>
              ))}
              <div className="my-1 border-t border-ink-100" />
              <Link href="/projects/new" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-ink-700 hover:bg-ink-100">
                <Plus size={14} /> 새 프로젝트
              </Link>
            </div>
          )}
        </div>
        {onClose && (
          <button aria-label="닫기" onClick={onClose} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="px-3 pb-2">
        <button onClick={onSearch} className="flex h-9 w-full items-center gap-2 rounded-lg border border-ink-200 bg-white px-2.5 text-[13px] text-ink-500 hover:bg-ink-50">
          <Search size={15} />
          <span className="flex-1 text-left">검색</span>
          <Kbd>⌘K</Kbd>
        </button>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-3">
        <div className="space-y-0.5">
          <NavItem href={`${base}/inbox`} icon={<Inbox size={16} />} label="받은 편지함" active={is(`${base}/inbox`)} badge={inboxCount} onNavigate={onNavigate} />
          <NavItem href={base} icon={<LayoutDashboard size={16} />} label="대시보드" active={is(base)} onNavigate={onNavigate} />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between px-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
            <span>Rooms</span>
            <Users size={12} />
          </div>
          <div className="space-y-0.5">
            {visibleRooms
              .slice()
              .sort((a, b) => ROOM_META[a.type].no - ROOM_META[b.type].no)
              .map((room) => (
                <NavItem
                  key={room.id}
                  href={`${base}/rooms/${room.id}`}
                  icon={<MessageSquare size={16} />}
                  label={ROOM_META[room.type].name}
                  active={startsWith(`${base}/rooms/${room.id}`)}
                  onNavigate={onNavigate}
                  trailing={
                    <span className="flex items-center gap-1.5">
                      {!canWrite(room) && <Eye size={13} className="text-ink-400" aria-label="읽기 전용" />}
                      {roomStatus(room)}
                    </span>
                  }
                />
              ))}
          </div>
        </div>

        <div>
          <div className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">문서 (MCP)</div>
          <div className="space-y-0.5">
            <NavItem href={`${base}/docs/constitution`} icon={<BookOpen size={16} />} label="헌법" active={is(`${base}/docs/constitution`)} onNavigate={onNavigate} />
            <NavItem href={`${base}/docs/spec`} icon={<FileText size={16} />} label="명세" active={is(`${base}/docs/spec`)} onNavigate={onNavigate} />
            <NavItem href={`${base}/docs/contract`} icon={<FileText size={16} />} label="계약" active={is(`${base}/docs/contract`)} onNavigate={onNavigate} />
            <NavItem href={`${base}/docs/adr`} icon={<FileText size={16} />} label="결정기록" active={is(`${base}/docs/adr`)} onNavigate={onNavigate} />
          </div>
        </div>

        <div className="space-y-0.5">
          <NavItem href={`${base}/activity`} icon={<Activity size={16} />} label="활동 · 비용" active={is(`${base}/activity`)} onNavigate={onNavigate} />
          <NavItem href={`${base}/settings`} icon={<Settings size={16} />} label="설정" active={is(`${base}/settings`)} onNavigate={onNavigate} />
        </div>
      </nav>

      <div className="relative border-t border-ink-200 p-3">
        <button onClick={() => setMenuOpen((v) => !v)} className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left hover:bg-ink-100">
          <Avatar name={me?.nickname ?? "?"} size={32} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[13.5px] font-semibold">{me?.nickname}</span>
              {myRole && <RoleBadge role={myRole} />}
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink-500">
              {myRole === "OWNER" ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> PM 에이전트 (서버)
                </>
              ) : myAgent ? (
                <>
                  <StatusDot status={myAgent.status} pulse /> Claude Code · {AGENT_STATUS[myAgent.status].label}
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-ink-300" /> 에이전트 미연결
                </>
              )}
            </span>
          </span>
          <ChevronDown size={14} className="text-ink-500" />
        </button>
        {menuOpen && (
          <div className="absolute bottom-full left-3 right-3 z-20 mb-1 rounded-xl border border-ink-200 bg-white p-1.5 shadow-pop animate-rise">
            <div className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">데모: 역할 전환</div>
            {state.members
              .filter((m) => m.projectId === projectId)
              .map((m) => {
                const u = state.users.find((x) => x.id === m.userId)!;
                return (
                  <button key={m.userId} onClick={() => { actions.switchUser(m.userId); setMenuOpen(false); router.push(base); }} className={cn("flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] hover:bg-ink-100", me?.id === u.id && "font-semibold")}>
                    <Avatar name={u.nickname} size={20} />
                    <span className="flex-1 truncate">{u.nickname}</span>
                    <RoleBadge role={m.role} />
                  </button>
                );
              })}
            <div className="my-1 border-t border-ink-100" />
            <Link href="/connect" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-ink-700 hover:bg-ink-100">
              <Plug size={14} /> 에이전트 연결
            </Link>
            <button onClick={() => { actions.resetDemo(); setMenuOpen(false); router.push("/projects"); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink-700 hover:bg-ink-100">
              <RefreshCcw size={14} /> 데모 데이터 초기화
            </button>
            <button onClick={() => { actions.logout(); router.push("/login"); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink-700 hover:bg-ink-100">
              <LogOut size={14} /> 로그아웃
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
