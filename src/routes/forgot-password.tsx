import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Logo } from "@/components/branding/logo";
import { SiteFooter } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, HelperText, Input, Label } from "@/components/ui/field";
import { emailSchema } from "@/lib/validation";

export const Route = createFileRoute("/forgot-password")({ component: ForgotPassword });

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email");
      return;
    }
    setBusy(true);
    try {
      // Outbound email is not wired in Phase 1B Private Beta (Better Auth has no sendResetPassword handler).
      setMessage(
        "Password reset architecture is in place, but outbound email delivery is not configured in this private beta. No reset message was sent.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="px-4 py-5">
        <Link to="/">
          <Logo />
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-16">
        <Card className="rounded-2xl p-8">
          <h1 className="font-display text-3xl">Reset password</h1>
          <p className="mt-2 text-sm text-muted">
            Email delivery is a later integration. This page exists so the reset
            flow is ready when a mail provider is configured.
          </p>
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <HelperText>We will never pretend a reset email was sent.</HelperText>
            </div>
            <FieldError>{error}</FieldError>
            {message ? <p className="text-sm text-fg">{message}</p> : null}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Checking…" : "Request reset"}
            </Button>
          </form>
          <p className="mt-6 text-sm">
            <Link to="/login" className="text-steel hover:underline">
              Back to sign in
            </Link>
          </p>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
