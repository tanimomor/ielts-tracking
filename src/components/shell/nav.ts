import { BarChart3, GitCompareArrows, List, PenLine, Upload, Users } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/log", label: "Log", icon: PenLine, mobile: true },
  { href: "/attempts", label: "Attempts", icon: List, mobile: true },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3, mobile: true },
  { href: "/compare", label: "Compare", icon: GitCompareArrows, mobile: true },
  { href: "/students", label: "Students", icon: Users, mobile: true },
  { href: "/import", label: "Import", icon: Upload, mobile: false },
] as const;
