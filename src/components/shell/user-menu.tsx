"use client";

import Link from "next/link";
import { LogOut, Upload, UserRound } from "lucide-react";
import { StudentAvatar } from "@/components/students/student-avatar";
import { ThemeSwitch } from "@/components/theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/server/actions/auth";

type Props = {
  student: { id: string; name: string; color: string; avatarUrl: string | null };
  subtitle: string;
  variant: "sidebar" | "compact";
};

export function UserMenu({ student, subtitle, variant }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={
          variant === "sidebar"
            ? "flex w-full cursor-pointer items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-background focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
            : "cursor-pointer rounded-full p-1 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
        }
        aria-label="Account menu"
      >
        <StudentAvatar student={student} size="sm" />
        {variant === "sidebar" && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{student.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={variant === "sidebar" ? "start" : "end"} side={variant === "sidebar" ? "top" : "bottom"} className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate font-medium">{student.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/students/${student.id}`}>
            <UserRound /> My profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="md:hidden">
          <Link href="/import">
            <Upload /> Import CSV
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-2 py-1.5 text-sm">
          <span>Theme</span>
          <ThemeSwitch />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            void signOutAction();
          }}
        >
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
