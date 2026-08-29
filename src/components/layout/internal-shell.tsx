import { Link, useRouterState } from "@tanstack/react-router";
import { Logo } from "@/components/branding/logo";
import { AccountMenu } from "./account-menu";
import { DevBanner } from "./dev-banner";
import { SiteFooter } from "./footer";
import { INTERNAL_NAV } from "./nav-items";
import { can } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import type { SessionSnapshot } from "@/lib/types";
import type { ReactNode } from "react";

export function InternalShell({
  snapshot,
  children,
}: {
  snapshot: SessionSnapshot;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = INTERNAL_NAV.filter((item) => can(snapshot.roles, item.permission));
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <DevBanner visible={snapshot.developmentData} />
      <div className="flex min-h-dvh flex-col lg:flex-row">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-ink text-primary-fg lg:flex lg:flex-col">
          <div className="px-5 py-6">
            <Link to="/internal" className="text-primary-fg">
              <span className="font-display text-lg">TitleBridge</span>
            </Link>
            <p className="mt-2 text-xs text-primary-fg/70">Internal console</p>
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-3">
            {items.map((item) => {
              const active =
                pathname === item.to ||
                (item.to !== "/internal" && pathname.startsWith(`${item.to}/`));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex min-h-11 items-center rounded-md px-3 text-sm",
                    active ? "bg-primary-fg/10 text-primary-fg" : "text-primary-fg/80 hover:bg-primary-fg/5",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="p-4">
            <Link to="/app" className="text-sm text-primary-fg/80 hover:underline">
              Customer workspace
            </Link>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
            <Link to="/internal" className="lg:hidden">
              <Logo />
            </Link>
            <div className="ml-auto">
              <AccountMenu
                firstName={snapshot.profile?.firstName}
                lastName={snapshot.profile?.lastName}
                email={snapshot.email}
              />
            </div>
          </header>
          <div className="flex gap-2 overflow-x-auto border-b border-border bg-surface px-3 py-2 lg:hidden">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-2 text-xs",
                  pathname === item.to ? "bg-primary text-primary-fg" : "bg-stone text-fg",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <main className="flex-1 px-4 py-6 sm:px-8">{children}</main>
          <SiteFooter />
        </div>
      </div>
    </div>
  );
}
