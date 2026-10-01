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
  listening: "var(--skill-listening)",
  reading: "var(--skill-reading)",
  writing: "var(--skill-writing)",
  speaking: "var(--skill-speaking)",
  other: "var(--skill-other)",
};

/** Deeper, still-vivid shades for filled buttons/tiles: all ≥ 4.5:1 with white text. */
export const SKILL_SOLID: Record<Skill, string> = {
  listening: "#1d4ed8",
  reading: "#c2410c",
  writing: "#047857",
  speaking: "#b45309",
  other: "#be185d",
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
