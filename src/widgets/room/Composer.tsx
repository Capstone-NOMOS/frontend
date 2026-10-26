"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, AtSign, Paperclip } from "lucide-react";
import { cn } from "@/shared/lib/format";

export function Composer({
  placeholder,
  mention,
  onSend,
  disabled,
  maxLength,
}: {
  placeholder: string;
  /** 있으면 멘션 칩을 그리고 본문 앞에 붙인다. 없으면 본문 그대로 */
  mention?: string;
  /** Promise를 돌려주면 성공한 뒤에만 입력을 비운다(실패하면 남겨 둔다) */
  onSend: (text: string) => void | Promise<unknown>;
  disabled?: boolean;
  maxLength?: number;
}) {
  const [text, setText] = useState("");
  const [withMention, setWithMention] = useState(true);
  const ref = useRef<HTMLTextAreaElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // 내용에 맞춰 높이를 다시 잰다. 잴 때 textarea를 0px로 줄이면 위의 피드가 그만큼 커지며 scrollTop이 깎여
  // 대화가 내려앉는다 — 재는 동안 바깥 틀 높이를 고정해 레이아웃이 바뀌지 않게 한다
  useEffect(() => {
    const el = ref.current;
    const box = boxRef.current;
    if (!el || !box) return;
    box.style.height = `${box.offsetHeight}px`;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
    box.style.height = "";
  }, [text]);

  const send = () => {
    const t = text.trim();
    if (!t || disabled) return;
    const sent = onSend(mention && withMention && !t.startsWith("@") ? `@${mention} ${t}` : t);
    if (sent)
      sent.then(
        () => setText(""),
        () => {},
      );
    else setText("");
  };

  return (
    <div
      ref={boxRef}
      className="rounded-2xl border border-ink-200 bg-white shadow-card transition focus-within:border-ink-300 focus-within:ring-4 focus-within:ring-ink-100"
    >
      {mention && (
        <div className="flex items-center gap-1.5 px-3 pt-2.5">
          <button
            type="button"
            onClick={() => setWithMention((v) => !v)}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[12px] font-medium transition",
              withMention ? "border-brand-200 bg-brand-50 text-brand-600" : "border-ink-200 bg-white text-ink-500",
            )}
            title="멘션 대상"
          >
            <AtSign size={12} /> {mention}
          </button>
        </div>
      )}
      <textarea
        ref={ref}
        rows={1}
        value={text}
        disabled={disabled}
        maxLength={maxLength}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            send();
          }
        }}
        placeholder={placeholder}
        className="block w-full resize-none bg-transparent px-4 py-2.5 text-[14.5px] leading-6 text-ink-900 outline-none placeholder:text-ink-400 disabled:opacity-60"
      />
      <div className="flex items-center justify-between px-2.5 pb-2.5">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
            title="파일 첨부 (v2)"
          >
            <Paperclip size={16} />
          </button>
          <span className="hidden text-[11.5px] text-ink-400 sm:inline">Enter 전송 · Shift+Enter 줄바꿈</span>
        </div>
        <button
          type="button"
          onClick={send}
          disabled={!text.trim() || disabled}
          aria-label="보내기"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink-900 text-white transition hover:bg-ink-700 disabled:bg-ink-200"
        >
          <ArrowUp size={16} />
        </button>
      </div>
    </div>
  );
}
