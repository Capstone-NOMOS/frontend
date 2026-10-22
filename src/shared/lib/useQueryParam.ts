"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * 탭·필터처럼 뒤로가기로 돌아왔을 때 남아 있어야 하는 화면 상태를 주소의 ?key=에 둔다.
 * allowed에 없는 값(직접 고친 주소 등)은 null. 바꿀 때는 기록을 쌓지 않는다(replace)
 */
export function useQueryParam<T extends string>(key: string, allowed: readonly T[]) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = searchParams.get(key);
  const value = allowed.includes(raw as T) ? (raw as T) : null;

  const setValue = useCallback(
    (next: T | null) => {
      const q = new URLSearchParams(searchParams.toString());
      if (next === null) q.delete(key);
      else q.set(key, next);
      const s = q.toString();
      router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    },
    [key, pathname, router, searchParams],
  );

  return [value, setValue] as const;
}
