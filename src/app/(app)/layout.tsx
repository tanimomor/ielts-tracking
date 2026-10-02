import Link from "next/link";
import { Brand } from "@/components/brand";
import { LiveBadge, LiveUpdates } from "@/components/live-updates";
import { QuickLogButton, QuickLogFab, QuickLogProvider } from "@/components/log/quick-log";
import { BottomTabs, SidebarNav } from "@/components/shell/nav-links";
import { UserMenu } from "@/components/shell/user-menu";
import { today } from "@/lib/dates";
import { listSeries } from "@/server/queries/books";
import { listTagSuggestions } from "@/server/queries/tags";
import { requireStudent } from "@/server/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user, student } = await requireStudent();
  const [series, tags] = await Promise.all([listSeries(), listTagSuggestions()]);
  const menuStudent = { id: student.id, name: student.name, color: student.color, avatarUrl: student.avatarUrl };

  return (
    <LiveUpdates me={student.id}>
    <QuickLogProvider today={today()} series={series} tagSuggestions={tags} student={menuStudent}>
      <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-background px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          Skip to content
        </a>

        <aside className="sticky top-0 hidden h-dvh flex-col border-r bg-surface px-3 py-4 md:flex">
          <Link href="/dashboard" className="mb-5 rounded-md px-2 py-1">
            <Brand />
          </Link>
          <QuickLogButton className="mb-5 w-full" />
          <SidebarNav />
          <div className="mt-auto border-t pt-3">
            <div className="mb-2 px-2">
              <LiveBadge />
            </div>
            <UserMenu student={menuStudent} subtitle={`@${user.username}`} variant="sidebar" />
          </div>
        </aside>

        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
          <Link href="/dashboard">
            <Brand />
          </Link>
          <UserMenu student={menuStudent} subtitle={`@${user.username}`} variant="compact" />
        </header>

        <main id="main" className="min-w-0 pb-28 md:pb-0">
          {children}
        </main>

        <QuickLogFab />
        <BottomTabs />
      </div>
    </QuickLogProvider>
    </LiveUpdates>
  );
}
