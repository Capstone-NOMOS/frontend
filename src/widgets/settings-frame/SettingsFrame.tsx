"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Logo, TabLinks } from "@/shared/ui";
import { AccountMenu, HomeLink } from "@/entities/user";

const TABS = [
  { href: "/settings/account", label: "계정" },
  { href: "/settings/org", label: "조직" },
];

/** 프로젝트 밖의 설정(/settings/*) 틀. 프로젝트 안에서는 프로젝트 설정 화면이 같은 탭을 함께 보여 준다 */
export function SettingsFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-dvh dots-bg">
      <header className="flex h-16 items-center justify-between px-5 sm:px-8">
        <HomeLink>
          <Logo />
        </HomeLink>
        <AccountMenu />
      </header>

      <main className="mx-auto max-w-[880px] space-y-4 px-4 pb-16 pt-4 sm:px-6">
        <div>
          <Link href="/projects" className="inline-flex items-center gap-1 text-[13px] text-ink-500 hover:text-ink-900">
            <ArrowLeft size={14} /> 프로젝트
          </Link>
          <h1 className="mt-2 text-[24px] font-semibold tracking-tight">설정</h1>
        </div>
        <TabLinks tabs={TABS.map((t) => ({ ...t, active: pathname.startsWith(t.href) }))} />
        {children}
      </main>
    </div>
  );
}
