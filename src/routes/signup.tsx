import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Logo } from "@/components/branding/logo";
import { SiteFooter } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, HelperText, Input, Label } from "@/components/ui/field";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { toAuthClientMessage } from "@/lib/errors";
import { signUpSchema } from "@/lib/validation";
import { recordLoginFn } from "@/fn/session";

export const Route = createFileRoute("/signup")({ component: Signup });

function Signup() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPending && user) void navigate({ to: "/onboarding" });
  }, [isPending, user, navigate]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = signUpSchema.safeParse({ email, password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    setBusy(true);
    const result = await authClient.signUp.email({
      email: parsed.data.email,
      password: parsed.data.password,
      name: parsed.data.email.split("@")[0] ?? "Customer",
    });
    setBusy(false);
    if (result.error) {
      setError(toAuthClientMessage(result.error.message, "Could not create the account. Please try again."));
      return;
    }
    void recordLoginFn().catch(() => undefined);
    await navigate({ to: "/onboarding" });
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
          <p className="text-xs uppercase tracking-[0.18em] text-steel">Create account</p>
          <h1 className="mt-2 font-display text-3xl">Start with identity, not a title.</h1>
          <p className="mt-2 text-sm text-muted">
            We collect only basic account details in this phase. No SSN or driver’s
            license number is requested.
          </p>
          {authEnabled ? (
            <>
              <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <HelperText>At least 10 characters, with a letter and a number.</HelperText>
                </div>
                <div>
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <FieldError>{error}</FieldError>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Creating account…" : "Create account"}
                </Button>
              </form>
              <div className="my-6 h-px bg-border" />
              <div className="space-y-2">
                {GROK_PROVIDERS.map((provider) => (
                  <Button
                    key={provider.providerId}
                    variant="secondary"
                    className="w-full"
                    onClick={() => signIn(provider.providerId, { callbackURL: "/onboarding" })}
                  >
                    Continue with {provider.label}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-6 text-sm text-muted">Sign-up is disabled.</p>
          )}
          <p className="mt-6 text-sm text-muted">
            Already have an account?{" "}
            <Link to="/login" className="text-fg underline">
              Sign in
            </Link>
          </p>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
