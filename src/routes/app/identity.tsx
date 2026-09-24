import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { getIdentityVerificationFn, refreshIdentityVerificationFn, startIdentityVerificationFn } from "@/fn/identity";

export const Route = createFileRoute("/app/identity")({ component: IdentityPage });

function IdentityPage() {
  const query = useQuery({ queryKey: ["identity"], queryFn: () => getIdentityVerificationFn() });
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const record = query.data?.record;

  async function start() {
    setError(null);
    setBusy(true);
    try {
      await startIdentityVerificationFn({ data: { gaveConsent: consent } });
      await query.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start verification");
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setError(null);
    setBusy(true);
    try {
      await refreshIdentityVerificationFn();
      await query.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh status");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Identity verification"
        description="Plaid Identity Verification confirms who is participating in a TitleBridge workflow. It does not file a title with any DMV."
      />
      <Card className="max-w-xl">
        <p className="text-xs uppercase tracking-[0.18em] text-steel">Plaid</p>
        <h2 className="mt-2 font-display text-2xl">Verify when required</h2>
        <p className="mt-2 text-sm text-muted">
          {query.data?.configured
            ? `Connected to Plaid ${query.data.environment}.`
            : "Plaid credentials are not on this environment yet. Add PLAID_CLIENT_ID, PLAID_SECRET, and PLAID_TEMPLATE_ID."}
        </p>
        <div className="mt-4 flex items-center justify-between rounded-md bg-stone px-3 py-3 text-sm">
          <span>Current status</span>
          <Badge>{record?.status?.replaceAll("_", " ") ?? "not started"}</Badge>
        </div>
        {record?.shareable_url ? (
          <a className="mt-4 inline-block text-sm underline" href={record.shareable_url} target="_blank" rel="noreferrer">
            Continue Plaid verification
          </a>
        ) : null}
        <label className="mt-6 flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>I consent to TitleBridge using Plaid to verify my identity for this account. No government filing occurs.</span>
        </label>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-4 flex gap-3">
          <Button onClick={() => void start()} disabled={busy || !query.data?.configured}>
            {busy ? "Working…" : "Start verification"}
          </Button>
          <Button variant="secondary" onClick={() => void refresh()} disabled={busy || !record}>
            Refresh status
          </Button>
        </div>
      </Card>
    </div>
  );
}
