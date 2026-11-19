import { useEffect, useRef } from "react";

/**
 * 열린 메뉴를 바깥 클릭이나 Esc로 닫는다. 돌려준 ref를 버튼과 메뉴를 함께 감싼 요소에 건다.
 * setOpen은 useState의 setter를 그대로 넘긴다 (참조가 고정이라 리스너를 다시 달지 않는다)
 */
export function useDismiss<T extends HTMLElement>(open: boolean, setOpen: (open: false) => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);
  return ref;
}
