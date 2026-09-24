import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Lock, Scale, Waypoints } from "lucide-react";
import { Logo } from "@/components/branding/logo";
import { SiteFooter } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { APP_NAME, APP_TAGLINE, IDENTITY_NOTICE, PHASE_LABEL } from "@/lib/constants";
import { SignedIn, SignedOut } from "@/lib/auth/gates";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <SignedOut>
            <Link to="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link to="/early-access">
              <Button>Request early access</Button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link to="/app">
              <Button>Open workspace</Button>
            </Link>
          </SignedIn>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:pt-16">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-steel">
          {PHASE_LABEL} · Independent platform
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight text-fg sm:text-6xl">
          {APP_TAGLINE}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          Secure identity verification. Organized documentation. Clear workflow
          tracking. {APP_NAME} is a private technology layer for customers,
          operators, and future authorized providers. It is not a DMV, AAMVA,
          NMVTIS, or government-authorized service.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to="/early-access">
            <Button size="lg" className="w-full sm:w-auto">
              Request early access
              <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link to="/early-access" search={{ intent: "demo" }}>
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              Request a business demo
            </Button>
          </Link>
        </div>
        <p className="mt-3 text-sm text-muted">
          Already invited?{" "}
          <Link to="/login" className="underline text-fg">
            Sign in
          </Link>
          {" "}or{" "}
          <Link to="/signup" className="underline text-fg">
            create an account
          </Link>
          .
        </p>
        <p className="mt-6 max-w-2xl text-sm text-muted">{IDENTITY_NOTICE}</p>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          <Card>
            <Lock className="size-5 text-primary" />
            <h2 className="mt-4 font-display text-xl">Account security first</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Authentication, roles, vehicles, VIN format checks, documents, and
              internal title-case review are live. Government filing is not.
            </p>
          </Card>
          <Card>
            <Scale className="size-5 text-primary" />
            <h2 className="mt-4 font-display text-xl">Regulated by design</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Consent records, append-only audit history, and least-privilege
              staff roles prepare the platform for later compliance work.
            </p>
          </Card>
          <Card>
            <Waypoints className="size-5 text-primary" />
            <h2 className="mt-4 font-display text-xl">Provider-ready adapters</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Identity, VIN, NMVTIS, ELT, EVR, payments, and e-signature
              adapters exist as placeholders and return “Provider not configured.”
            </p>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
