import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Logo } from "@/components/branding/logo";
import { SessionGate } from "@/components/auth/session-gate";
import { SiteFooter } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, HelperText, Input, Label, Select } from "@/components/ui/field";
import { PageSkeleton } from "@/components/ui/skeleton";
import { completeOnboardingFn } from "@/fn/session";
import { useSessionSnapshot } from "@/hooks/use-session-snapshot";
import { IDENTITY_NOTICE, US_STATES } from "@/lib/constants";

export const Route = createFileRoute("/onboarding")({ component: OnboardingPage });

function OnboardingPage() {
  return (
    <SessionGate>
      <OnboardingForm />
    </SessionGate>
  );
}

function OnboardingForm() {
  const navigate = useNavigate();
  const { snapshot, isPending, refetch } = useSessionSnapshot();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");
  const [notificationPreference, setNotificationPreference] = useState<"email" | "sms" | "none">("email");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptElectronic, setAcceptElectronic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (snapshot?.profile?.onboardingCompleted) void navigate({ to: "/app" });
  }, [snapshot, navigate]);

  if (isPending) return <PageSkeleton />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await completeOnboardingFn({
        data: {
          firstName,
          lastName,
          phone,
          state,
          notificationPreference,
          acceptTerms: acceptTerms ? true : undefined,
          acceptPrivacy: acceptPrivacy ? true : undefined,
          acceptElectronic: acceptElectronic ? true : undefined,
        },
      });
      await refetch();
      await navigate({ to: "/app" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save onboarding");
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
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-16">
        <Card className="rounded-2xl p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-steel">Onboarding</p>
          <h1 className="mt-2 font-display text-3xl">Tell us who you are</h1>
          <p className="mt-2 text-sm text-muted">{IDENTITY_NOTICE}</p>
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="first">First name</Label>
                <Input id="first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="last">Last name</Label>
                <Input id="last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Select id="state" value={state} onChange={(e) => setState(e.target.value)}>
                <option value="">Select</option>
                {US_STATES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </Select>
              <HelperText>Used only to prepare later jurisdiction workflows. No legal capability is claimed.</HelperText>
            </div>
            <div>
              <Label htmlFor="notify">Preferred notification method</Label>
              <Select
                id="notify"
                value={notificationPreference}
                onChange={(e) => setNotificationPreference(e.target.value as "email" | "sms" | "none")}
              >
                <option value="email">Email</option>
                <option value="sms">SMS (later)</option>
                <option value="none">None</option>
              </Select>
            </div>
            <fieldset className="space-y-2 text-sm">
              <label className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
                <span>I accept the TitleBridge terms of use (independent technology platform, not a government agency).</span>
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" checked={acceptPrivacy} onChange={(e) => setAcceptPrivacy(e.target.checked)} />
                <span>I accept the privacy notice and data-minimization practices.</span>
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" checked={acceptElectronic} onChange={(e) => setAcceptElectronic(e.target.checked)} />
                <span>I consent to electronic records and notices for this account.</span>
              </label>
            </fieldset>
            <FieldError>{error}</FieldError>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Saving…" : "Continue to workspace"}
            </Button>
          </form>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
