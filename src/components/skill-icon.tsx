import { BookOpen, Headphones, Mic, PenLine, Sparkles, type LucideIcon } from "lucide-react";
import { SKILL_LABELS, type Skill } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const SKILL_ICONS: Record<Skill, LucideIcon> = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
  speaking: Mic,
  other: Sparkles,
};

/** Fixed per-skill series colours (categorical slots 1–5, never re-ordered). */
export const SKILL_COLORS: Record<Skill, string> = {
  listening: "#2a78d6",
  reading: "#eb6834",
  writing: "#1baf7a",
  speaking: "#eda100",
  other: "#e87ba4",
};

export function SkillBadge({ skill, className }: { skill: Skill; className?: string }) {
  const Icon = SKILL_ICONS[skill];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-secondary-foreground", className)}
    >
      <Icon className="size-3.5" style={{ color: SKILL_COLORS[skill] }} aria-hidden />
      {SKILL_LABELS[skill]}
    </span>
  );
}
