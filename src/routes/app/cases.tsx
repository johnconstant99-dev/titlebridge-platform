import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createCaseFn, createTitleCaseFn, listCasesFn, listTitleCasesFn, listVehiclesFn } from "@/fn/session";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import {
  CASE_TYPE_LABELS,
  CASE_TYPES,
  TITLE_SUBMIT_NOTICE,
  TITLE_TRANSACTION_LABELS,
  TITLE_TRANSACTION_TYPES,
} from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { CaseType, TitleTransactionType } from "@/lib/types";

export const Route = createFileRoute("/app/cases")({ component: CasesPage });

function CasesPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const cases = useQuery({ queryKey: ["cases"], queryFn: () => listCasesFn() });
  const titleCases = useQuery({ queryKey: ["title-cases"], queryFn: () => listTitleCasesFn() });
  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: () => listVehiclesFn() });
  const [caseType, setCaseType] = useState<CaseType>("title_transfer");
  const [transactionType, setTransactionType] = useState<TitleTransactionType>("title_transfer");
  const [vehicleId, setVehicleId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => createCaseFn({ data: { caseType } }),
    onSuccess: async (record) => {
      await client.invalidateQueries({ queryKey: ["cases"] });
      await navigate({ to: "/app/cases/$caseId", params: { caseId: record.id } });
    },
  });

  const startTitle = useMutation({
    mutationFn: () => createTitleCaseFn({ data: { vehicleId, transactionType } }),
    onSuccess: async (record) => {
      await client.invalidateQueries({ queryKey: ["title-cases"] });
      await navigate({ to: "/app/title-cases/$titleCaseId", params: { titleCaseId: record.id } });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not start title case"),
  });

  return (
    <div>
      <PageHeader
        title="My Cases"
        description={TITLE_SUBMIT_NOTICE}
      />
      <Card className="mb-6">
        <h2 className="font-display text-xl">Start Title Case</h2>
        <p className="mt-2 text-sm text-muted">
          Vehicle → Ownership → Title → Lien → Documents → Review → Submit for internal review.
        </p>
        {(vehicles.data ?? []).length === 0 ? (
          <p className="mt-4 text-sm">
            Add a vehicle first.{" "}
            <Link to="/app/vehicles" className="text-steel underline">My Vehicles</Link>
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              <option value="">Select vehicle</option>
              {(vehicles.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.displayName} · {item.vinMasked}
                </option>
              ))}
            </Select>
            <Select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value as TitleTransactionType)}
            >
              {TITLE_TRANSACTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {TITLE_TRANSACTION_LABELS[type]}
                </option>
              ))}
            </Select>
            <Button
              onClick={() => startTitle.mutate()}
              disabled={!vehicleId || startTitle.isPending}
            >
              {startTitle.isPending ? "Creating…" : "Start Title Case"}
            </Button>
          </div>
        )}
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      </Card>
      <Card className="mb-6">
        <h2 className="font-display text-xl">Title cases</h2>
        {(titleCases.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted">No title cases yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-2 font-medium">Case</th>
                  <th className="py-2 font-medium">Type</th>
                  <th className="py-2 font-medium">Step</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {titleCases.data?.map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="py-3">
                      <Link
                        to="/app/title-cases/$titleCaseId"
                        params={{ titleCaseId: item.id }}
                        className="font-mono text-steel hover:underline"
                      >
                        {item.caseNumber}
                      </Link>
                    </td>
                    <td>{TITLE_TRANSACTION_LABELS[item.transactionType]}</td>
                    <td>{item.currentStep}</td>
                    <td><Badge>{item.status.replaceAll("_", " ")}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-xl">Other draft records</h2>
            <p className="mt-1 text-sm text-muted">Generic workspace drafts. Not filed with a state.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={caseType} onChange={(e) => setCaseType(e.target.value as CaseType)}>
              {CASE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {CASE_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
            <Button variant="secondary" onClick={() => create.mutate()} disabled={create.isPending}>
              New draft
            </Button>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {(cases.data ?? []).length === 0 ? (
            <p className="text-sm text-muted">No generic drafts.</p>
          ) : (
            cases.data?.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-md bg-stone px-3 py-3 text-sm">
                <Link to="/app/cases/$caseId" params={{ caseId: item.id }} className="font-mono text-steel hover:underline">
                  {item.caseNumber}
                </Link>
                <span className="text-muted">{formatDateTime(item.createdAt)}</span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
