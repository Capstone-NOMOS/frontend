"use client";

import { LogOut } from "lucide-react";
import { Avatar } from "@/shared/ui";
import { useLogout } from "../api/userApi";
import { displayName, useCurrentUser } from "../model/session";

/** 헤더용: 표시 이름 · 조직명 · 로그아웃 */
export function AccountMenu() {
  const { me } = useCurrentUser();
  const logout = useLogout();
  if (!me) return null;
  const name = displayName(me);

  return (
    <div className="flex items-center gap-2">
      <Avatar name={name} size={26} />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[13px] font-medium text-ink-900">{name}</span>
        {me.orgName && <span className="block truncate text-[11.5px] text-ink-500">{me.orgName}</span>}
      </span>
      <button
        type="button"
        onClick={logout}
        aria-label="로그아웃"
        title="로그아웃"
        className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-900"
      >
        <LogOut size={15} />
      </button>
    </div>
  );
}
