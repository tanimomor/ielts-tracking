import Link from "next/link";
import { Brand } from "@/components/brand";
import { BottomTabs, SidebarNav } from "@/components/shell/nav-links";
import { UserMenu } from "@/components/shell/user-menu";
import { requireStudent } from "@/server/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user, student } = await requireStudent();
  const menuStudent = { id: student.id, name: student.name, color: student.color, avatarUrl: student.avatarUrl };

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-background px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-dvh flex-col border-r bg-surface px-3 py-4 md:flex">
        <Link href="/log" className="mb-6 rounded-md px-2 py-1">
          <Brand />
        </Link>
        <SidebarNav />
        <div className="mt-auto border-t pt-3">
          <UserMenu student={menuStudent} email={user.email} variant="sidebar" />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
        <Link href="/log">
          <Brand />
        </Link>
        <UserMenu student={menuStudent} email={user.email} variant="compact" />
      </header>

      <main id="main" className="min-w-0 pb-24 md:pb-0">
        {children}
      </main>

      <BottomTabs />
    </div>
  );
}
