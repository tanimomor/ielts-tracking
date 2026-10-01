import { BarChart3, List, Trophy, Upload, Users } from "lucide-react";

/** Logging lives in the quick-entry dialog (button / FAB / "N"), not in the nav. */
export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3, mobile: true, tint: "#7c3aed" },
  { href: "/attempts", label: "Attempts", icon: List, mobile: true, tint: "#2563eb" },
  { href: "/scoreboard", label: "Scoreboard", icon: Trophy, mobile: true, tint: "#ea580c" },
  { href: "/students", label: "Students", icon: Users, mobile: true, tint: "#059669" },
  { href: "/import", label: "Import", icon: Upload, mobile: false, tint: "#db2777" },
] as const;
