import React from "react";
import { cn } from "@/lib/utils";

export type StatusPillTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple"
  | "neutral";

interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: StatusPillTone;
  label?: React.ReactNode;
  children?: React.ReactNode;
  dot?: boolean;
  size?: "xs" | "sm" | "md";
}

const TONE_STYLES: Record<StatusPillTone, { badge: string; dot: string }> = {
  success: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    dot: "bg-emerald-500",
  },
  warning: {
    badge: "bg-amber-50 text-amber-700 border-amber-200/80",
    dot: "bg-amber-500",
  },
  danger: {
    badge: "bg-rose-50 text-rose-600 border-rose-200/80",
    dot: "bg-rose-500",
  },
  info: {
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    dot: "bg-indigo-500",
  },
  purple: {
    badge: "bg-purple-50 text-purple-700 border-purple-200/80",
    dot: "bg-purple-500",
  },
  neutral: {
    badge: "bg-slate-100 text-slate-600 border-slate-200/80",
    dot: "bg-slate-400",
  },
};

const SIZE_STYLES = {
  xs: "px-2 py-0.5 text-[10px] gap-1 font-semibold",
  sm: "px-2.5 py-0.5 text-xs gap-1.5 font-medium",
  md: "px-3 py-1 text-xs gap-1.5 font-semibold",
};

export function StatusPill({
  tone = "neutral",
  label,
  children,
  dot = true,
  size = "sm",
  className,
  ...props
}: StatusPillProps) {
  const styles = TONE_STYLES[tone] ?? TONE_STYLES.neutral;
  const content = children ?? label;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border tracking-tight select-none transition-colors",
        styles.badge,
        SIZE_STYLES[size],
        className
      )}
      {...props}
    >
      {dot && <span className={cn("size-1.5 rounded-full shrink-0", styles.dot)} aria-hidden="true" />}
      <span>{content}</span>
    </span>
  );
}

export default StatusPill;
