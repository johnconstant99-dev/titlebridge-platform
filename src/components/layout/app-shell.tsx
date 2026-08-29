import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Car, FileText, Folder, LayoutDashboard, Shield, User } from "lucide-react";
import { Logo } from "@/components/branding/logo";
import { AccountMenu } from "./account-menu";
import { DevBanner } from "./dev-banner";
import { SiteFooter } from "./footer";
import { CUSTOMER_NAV } from "./nav-items";
import { cn } from "@/lib/utils";
import type { SessionSnapshot } from "@/lib/types";
import type { ReactNode } from "react";

const ICONS = {
  layout: LayoutDashboard,
  car: Car,
  folder: Folder,
  file: FileText,
  bell: Bell,
  user: User,
  shield: Shield,
};

export function AppShell({
  snapshot,
  children,
}: {
  snapshot: SessionSnapshot;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const profile = snapshot.profile;
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <DevBanner visible={snapshot.developmentData} />
      <div className="flex min-h-dvh flex-col lg:flex-row">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-surface lg:flex lg:flex-col">
          <div className="px-5 py-6">
            <Link to="/app">
              <Logo />
            </Link>
            <p className="mt-2 text-xs text-muted">Customer workspace</p>
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-3">
            {CUSTOMER_NAV.map((item) => {
              const Icon = ICONS[item.icon];
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm",
                    active ? "bg-primary text-primary-fg" : "text-fg hover:bg-stone",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {snapshot.canAccessInternal ? (
            <div className="p-4">
              <Link to="/internal" className="text-sm text-steel hover:underline">
                Internal console
              </Link>
            </div>
          ) : null}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
            <Link to="/app" className="lg:hidden">
              <Logo wordmark={false} />
            </Link>
            <div className="ml-auto flex items-center gap-2">
              {snapshot.canAccessInternal ? (
                <Link
                  to="/internal"
                  className="rounded-md px-3 py-2 text-sm text-steel underline lg:hidden"
                >
                  Internal
                </Link>
              ) : null}
              <AccountMenu
                firstName={profile?.firstName}
                lastName={profile?.lastName}
                email={snapshot.email}
              />
            </div>
          </header>
          <main className="flex-1 px-4 py-6 sm:px-8">{children}</main>
          <SiteFooter />
          <nav className="sticky bottom-0 grid grid-cols-4 border-t border-border bg-surface lg:hidden">
            {CUSTOMER_NAV.slice(0, 4).map((item) => {
              const Icon = ICONS[item.icon];
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px]",
                    active ? "text-primary" : "text-muted",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label.replace("My ", "")}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
