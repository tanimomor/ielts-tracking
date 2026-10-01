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

/** Fixed per-skill hues for charts (distinct from student colours by shape/labels too). */
export const SKILL_COLORS: Record<Skill, string> = {
  listening: "#0e7490",
  reading: "#4338ca",
  writing: "#b45309",
  speaking: "#be185d",
  other: "#667085",
};

export function SkillBadge({ skill, className }: { skill: Skill; className?: string }) {
  const Icon = SKILL_ICONS[skill];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium", className)}
      style={{ backgroundColor: `${SKILL_COLORS[skill]}14`, color: SKILL_COLORS[skill] }}
    >
      <Icon className="size-3.5" aria-hidden />
      {SKILL_LABELS[skill]}
    </span>
  );
}
