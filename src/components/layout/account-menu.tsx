import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { recordLogoutFn } from "@/fn/session";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function AccountMenu({
  firstName,
  lastName,
  email,
}: {
  firstName?: string;
  lastName?: string;
  email?: string | null;
}) {
  const { user, isPending } = useCurrentUserState();
  const [signingOut, setSigningOut] = useState(false);
  if (isPending) {
    return <div className="size-9 animate-pulse rounded-full bg-border" />;
  }
  if (!user) {
    return (
      <Link to="/login">
        <Button size="sm">Sign in</Button>
      </Link>
    );
  }
  const label = `${firstName ?? ""} ${lastName ?? ""}`.trim() || user.displayName || email || "Account";
  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-right text-sm sm:block">
        <span className="block font-medium leading-tight">{label}</span>
        {email ? <span className="block text-xs text-muted">{email}</span> : null}
      </span>
      <span className="grid size-9 place-items-center rounded-full bg-primary text-xs font-medium text-primary-fg">
        {initials(firstName || label, lastName || "")}
      </span>
      <Button
        variant="ghost"
        size="sm"
        disabled={signingOut}
        onClick={() => {
          setSigningOut(true);
          void recordLogoutFn()
            .catch(() => undefined)
            .then(() => signOut("/"))
            .catch(() => setSigningOut(false));
        }}
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </Button>
    </div>
  );
}
