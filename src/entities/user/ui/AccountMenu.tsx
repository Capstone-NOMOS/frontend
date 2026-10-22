"use client";

import type { ReactNode } from "react";
import { Building2, LogOut } from "lucide-react";
import { Avatar } from "@/shared/ui";
import { useLogout } from "../api/userApi";
import { displayName, useCurrentUser } from "../model/session";

/** 헤더용: 표시 이름 · (조직 아이콘) 조직명 · 내 역할 · (children) · 로그아웃. children은 로그아웃 왼쪽에 놓을 아이콘 버튼(예: 설정) */
export function AccountMenu({ children }: { children?: ReactNode }) {
  const { me } = useCurrentUser();
  const logout = useLogout();
  if (!me) return null;
  const name = displayName(me);

  return (
    <div className="flex items-center gap-2">
      <Avatar name={name} size={26} />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[13px] font-medium text-ink-900">{name}</span>
        {me.orgName && (
          <span className="flex items-center gap-1 text-[11.5px] text-ink-500">
            <Building2 size={11} className="shrink-0" aria-label="조직" />
            <span className="truncate">{me.orgName}</span>
            {me.orgRole && <span className="shrink-0">· {me.orgRole === "REPRESENTATIVE" ? "대표" : "팀원"}</span>}
          </span>
        )}
      </span>
      {children}
      <button
        type="button"
        onClick={logout}
        aria-label="로그아웃"
        title="로그아웃"
        className="rounded-lg p-0.5 text-ink-500 hover:bg-ink-100 hover:text-ink-900"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}
