import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Logo } from "@/components/branding/logo";
import { SiteFooter } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/field";
import { recordLoginFn } from "@/fn/session";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { toAuthClientMessage } from "@/lib/errors";
import { signInSchema } from "@/lib/validation";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPending && user) void navigate({ to: "/app" });
  }, [isPending, user, navigate]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    setBusy(true);
    const result = await authClient.signIn.email({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setBusy(false);
    if (result.error) {
      setError(toAuthClientMessage(result.error.message, "Sign-in failed. Check your email and password."));
      return;
    }
    void recordLoginFn().catch(() => undefined);
    await navigate({ to: "/app" });
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
          <p className="text-xs uppercase tracking-[0.18em] text-steel">Sign in</p>
          <h1 className="mt-2 font-display text-3xl">Welcome back</h1>
          <p className="mt-2 text-sm text-muted">
            Use your TitleBridge account. This is not a government portal.
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
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <FieldError>{error}</FieldError>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Signing in…" : "Sign in"}
                </Button>
              </form>
              <p className="mt-3 text-right text-sm">
                <Link to="/forgot-password" className="text-steel hover:underline">
                  Forgot password
                </Link>
              </p>
              <div className="my-6 h-px bg-border" />
              <div className="space-y-2">
                {GROK_PROVIDERS.map((provider) => (
                  <Button
                    key={provider.providerId}
                    variant="secondary"
                    className="w-full"
                    onClick={() => signIn(provider.providerId, { callbackURL: "/app" })}
                  >
                    Continue with {provider.label}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-6 text-sm text-muted">Sign-in is disabled.</p>
          )}
          <p className="mt-6 text-sm text-muted">
            No account?{" "}
            <Link to="/signup" className="text-fg underline">
              Create one
            </Link>
          </p>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
