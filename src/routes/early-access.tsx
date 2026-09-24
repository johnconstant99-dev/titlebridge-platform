import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { Logo } from "@/components/branding/logo";
import { SiteFooter } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, HelperText, Input, Label } from "@/components/ui/field";
import { US_STATES } from "@/lib/constants";

type Search = { intent?: string };

export const Route = createFileRoute("/early-access")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    intent: typeof search.intent === "string" ? search.intent : undefined,
  }),
  component: EarlyAccess,
});

function EarlyAccess() {
  const { intent } = Route.useSearch();
  const defaultAudience = intent === "demo" ? "business" : "consumer";
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [state, setState] = useState("");
  const [audience, setAudience] = useState(defaultAudience);
  const [problem, setProblem] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const heading = useMemo(
    () =>
      intent === "demo"
        ? "Request a private demonstration"
        : "Help shape the next generation of vehicle transaction technology",
    [intent],
  );

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim() || !state || !audience) {
      setError("Name, email, state, and audience are required.");
      return;
    }
    if (!email.includes("@")) {
      setError("Enter a valid email.");
      return;
    }
    const payload = {
      name: name.trim(),
      organization: organization.trim(),
      email: email.trim(),
      role: role.trim(),
      state,
      audience,
      problem: problem.trim(),
      intent: intent === "demo" ? "demo" : "early-access",
      submittedAt: new Date().toISOString(),
    };
    try {
      const existing = JSON.parse(window.localStorage.getItem("tb-early-access") || "[]");
      window.localStorage.setItem("tb-early-access", JSON.stringify([payload, ...existing].slice(0, 20)));
    } catch {
      /* ignore storage failures */
    }
    setDone(true);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="px-4 py-5">
        <Link to="/">
          <Logo />
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 pb-16">
        <Card className="rounded-2xl p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-steel">
            {intent === "demo" ? "Business demo" : "Early access"}
          </p>
          <h1 className="mt-2 font-display text-3xl">{heading}</h1>
          <p className="mt-2 text-sm text-muted">
            We do not collect driver’s-license numbers, SSNs, title documents, or
            other sensitive identity information on this form.
          </p>
          {done ? (
            <p className="mt-6 text-sm leading-relaxed text-fg">
              Thank you. We received your request and will follow up at {email}.
              You can also{" "}
              <Link to="/signup" className="underline">
                create a private-beta account
              </Link>
              {" "}if you already have an invitation.
            </p>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="org">Business / organization</Label>
                <Input
                  id="org"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                />
              </div>
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
                <Label htmlFor="role">Role</Label>
                <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <select
                  id="state"
                  className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                >
                  <option value="">Select a state</option>
                  {US_STATES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="audience">Consumer or business</Label>
                <select
                  id="audience"
                  className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                >
                  <option value="consumer">Consumer</option>
                  <option value="business">Business</option>
                </select>
              </div>
              <div>
                <Label htmlFor="problem">What problem would you like TitleBridge to solve?</Label>
                <textarea
                  id="problem"
                  className="mt-1 min-h-24 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                />
                <HelperText>Do not include VINs, license numbers, or account credentials.</HelperText>
              </div>
              <FieldError>{error}</FieldError>
              <Button type="submit" className="w-full">
                {intent === "demo" ? "Request a demo" : "Request early access"}
              </Button>
            </form>
          )}
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
