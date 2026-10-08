"use client";

import Link from "next/link";
import {
  forwardRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/shared/lib/format";

export { Markdown } from "./Markdown";

// ---------- Button ----------
type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const variantCls: Record<Variant, string> = {
  primary: "bg-ink-900 text-white hover:bg-ink-700 disabled:bg-ink-300",
  secondary: "bg-ink-100 text-ink-900 hover:bg-ink-200 disabled:text-ink-400",
  outline: "bg-white border border-ink-200 text-ink-900 hover:bg-ink-50 disabled:text-ink-400",
  ghost: "bg-transparent text-ink-700 hover:bg-ink-100 disabled:text-ink-400",
  danger: "bg-forbidden text-white hover:bg-red-700 disabled:bg-red-300",
};
const sizeCls: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-5 text-[15px] gap-2 rounded-xl",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  href?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, href, children, ...rest },
  ref,
) {
  const cls = cn(
    "inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors select-none disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
    variantCls[variant],
    sizeCls[size],
    className,
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button ref={ref} className={cls} {...rest}>
      {children}
    </button>
  );
});

// ---------- Input ----------
export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }
>(function Input({ label, hint, className, id, ...rest }, ref) {
  const inputId = id ?? rest.name;
  return (
    <label className="block" htmlFor={inputId}>
      {label && <span className="mb-1.5 block text-[13px] font-medium text-ink-700">{label}</span>}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          "h-11 w-full rounded-xl border border-ink-200 bg-white px-3.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100",
          className,
        )}
        {...rest}
      />
      {hint && <span className="mt-1.5 block text-xs text-ink-500">{hint}</span>}
    </label>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full resize-none rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100",
        className,
      )}
      {...rest}
    />
  );
});

// ---------- Badge ----------
export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "success" | "warn" | "danger" | "info" | "fe" | "be" | "pm";
  className?: string;
}) {
  const tones = {
    neutral: "bg-ink-100 text-ink-700",
    brand: "bg-brand-50 text-brand-600",
    success: "bg-auto-bg text-auto",
    warn: "bg-human-bg text-human",
    danger: "bg-forbidden-bg text-forbidden",
    info: "bg-review-bg text-review",
    fe: "bg-fe-100 text-fe-500",
    be: "bg-be-100 text-be-500",
    pm: "bg-pm-100 text-pm-500",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-4 tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ---------- Avatar ----------
const palette = ["bg-brand-600", "bg-fe-500", "bg-be-500", "bg-amber-600", "bg-rose-600", "bg-sky-600"];
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({
  name,
  size = 32,
  className,
  tone,
}: {
  name: string;
  size?: number;
  className?: string;
  tone?: "fe" | "be" | "pm";
}) {
  const cls =
    tone === "fe"
      ? "bg-fe-500"
      : tone === "be"
        ? "bg-be-500"
        : tone === "pm"
          ? "bg-brand-600"
          : palette[hash(name) % palette.length];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        cls,
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.42) }}
      aria-hidden
    >
      {name.trim().slice(0, 1)}
    </span>
  );
}

export function AgentMark({
  tone,
  size = 32,
  className,
}: {
  tone: "fe" | "be" | "pm";
  size?: number;
  className?: string;
}) {
  const cls =
    tone === "fe" ? "bg-fe-100 text-fe-500" : tone === "be" ? "bg-be-100 text-be-500" : "bg-pm-100 text-pm-500";
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-lg", cls, className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="4" y="7" width="16" height="12" rx="3" />
        <path d="M12 3v4M8 12h.01M16 12h.01M9 16h6" />
      </svg>
    </span>
  );
}

// ---------- Misc ----------
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-ink-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-ink-500">
      {children}
    </kbd>
  );
}

export function Logo({
  size = 22,
  wordmark = true,
  className,
}: {
  size?: number;
  wordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className="inline-flex items-center justify-center rounded-lg bg-ink-900 text-white"
        style={{ width: size + 6, height: size + 6 }}
      >
        <svg
          width={size * 0.7}
          height={size * 0.7}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 19V5l14 14V5" />
        </svg>
      </span>
      {wordmark && <span className="text-[17px] font-semibold tracking-tight">NOMOS</span>}
    </span>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-[13px] font-semibold uppercase tracking-wide text-ink-500">{children}</h3>
      {action}
    </div>
  );
}

export function EmptyState({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 px-6 py-10 text-center">
      <p className="text-sm font-medium text-ink-700">{title}</p>
      {desc && <p className="mt-1 max-w-sm text-[13px] text-ink-500">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function CopyField({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);
  const copy = () => {
    const flash = (r: "ok" | "fail") => {
      setCopied(r);
      setTimeout(() => setCopied(null), 1500);
    };
    // clipboard는 https·localhost에서만 있다
    if (!navigator.clipboard) return flash("fail");
    navigator.clipboard.writeText(value).then(
      () => flash("ok"),
      () => flash("fail"),
    );
  };
  return (
    <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-3 py-2">
      <div className="min-w-0 flex-1">
        {label && <div className="text-[11px] font-medium uppercase tracking-wide text-ink-500">{label}</div>}
        <div className="truncate font-mono text-[13px] text-ink-900">{value}</div>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-live="polite"
        className={cn(
          "shrink-0 whitespace-nowrap rounded-lg border border-ink-200 bg-white px-2.5 py-1 text-xs font-medium hover:bg-ink-100",
          copied === "ok" ? "text-auto" : copied === "fail" ? "text-forbidden" : "text-ink-700",
        )}
      >
        {copied === "ok" ? "복사됨 ✓" : copied === "fail" ? "복사 실패" : "복사"}
      </button>
    </div>
  );
}

/** API가 없어 목업 데이터로 남은 영역 표시 (docs/architecture.md §10) */
export function MockBadge() {
  return (
    <Badge tone="neutral" className="font-medium">
      목업
    </Badge>
  );
}

/** 목업 전용 화면에 목업 데이터가 없을 때 (실제 프로젝트 id는 목업 스토어에 없다) */
export function MockEmpty() {
  return (
    <div className="p-6">
      <EmptyState
        title="아직 API가 연결되지 않은 화면입니다"
        desc="이 프로젝트의 목업 데이터가 없습니다."
        action={<MockBadge />}
      />
    </div>
  );
}

// ---------- Segmented ----------
/** 2~4개 중 하나를 고르는 토글. value는 undefined도 될 수 있다("지정 안 함") */
export function Segmented<T>({
  options,
  value,
  onChange,
  disabled = false,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn("inline-flex rounded-lg bg-ink-100 p-0.5", disabled && "opacity-60")} role="group">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          onClick={() => onChange(o.value)}
          disabled={disabled}
          aria-pressed={value === o.value}
          className={cn(
            "h-7 rounded-md px-3 text-[12.5px] font-medium",
            value === o.value ? "bg-white shadow-card" : "text-ink-600",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
