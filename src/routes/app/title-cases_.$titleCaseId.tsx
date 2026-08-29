import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  accessDocumentFn,
  advanceTitleCaseFn,
  getTitleCaseFn,
  getVehicleFn,
  saveLienFn,
  saveOwnershipFn,
  saveTitleInfoFn,
  submitTitleCaseFn,
  uploadDocumentFn,
} from "@/fn/session";
import { PageHeader } from "@/components/layout/page-header";
import { TitleStepper } from "@/components/workflow/stepper";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { HelperText, Input, Label, Select, Textarea } from "@/components/ui/field";
import {
  CUSTOMER_LIEN_STATUSES,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPES,
  IDENTITY_NOTICE,
  LIEN_STATUS_LABELS,
  OWNERSHIP_TYPE_LABELS,
  OWNERSHIP_TYPES,
  TITLE_SUBMIT_NOTICE,
  TITLE_TRANSACTION_LABELS,
  US_STATES,
} from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { DocumentType, TitleStep } from "@/lib/types";

export const Route = createFileRoute("/app/title-cases_/$titleCaseId")({
  component: TitleCaseWizard,
});

function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function TitleCaseWizard() {
  const { titleCaseId } = Route.useParams();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["title-case", titleCaseId],
    queryFn: () => getTitleCaseFn({ data: { titleCaseId } }),
  });
  const vehicle = useQuery({
    queryKey: ["vehicle", query.data?.titleCase.vehicleId],
    queryFn: () => getVehicleFn({ data: { vehicleId: query.data!.titleCase.vehicleId } }),
    enabled: Boolean(query.data?.titleCase.vehicleId),
  });
  const [error, setError] = useState<string | null>(null);
  const [docType, setDocType] = useState<DocumentType>("title");

  const refresh = () => void client.invalidateQueries({ queryKey: ["title-case", titleCaseId] });

  const advance = useMutation({
    mutationFn: (step: Exclude<TitleStep, "vehicle" | "submitted">) =>
      advanceTitleCaseFn({ data: { titleCaseId, step } }),
    onSuccess: refresh,
  });
  const own = useMutation({
    mutationFn: (form: FormData) =>
      saveOwnershipFn({
        data: {
          vehicleId: query.data!.titleCase.vehicleId,
          ownershipType: String(form.get("ownershipType") ?? "sole"),
          ownerName: String(form.get("ownerName") ?? ""),
          acquisitionDate: String(form.get("acquisitionDate") ?? ""),
          purchasePrice: String(form.get("purchasePrice") ?? ""),
          sellerName: String(form.get("sellerName") ?? ""),
        },
      }),
    onSuccess: () => {
      setError(null);
      advance.mutate("title");
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not save"),
  });
  const titleInfo = useMutation({
    mutationFn: (form: FormData) =>
      saveTitleInfoFn({
        data: {
          titleCaseId,
          titleState: String(form.get("titleState") ?? ""),
          titleNumberLast4: String(form.get("titleNumberLast4") ?? ""),
          titleIssueDate: String(form.get("titleIssueDate") ?? ""),
          titleNotes: String(form.get("titleNotes") ?? ""),
        },
      }),
    onSuccess: () => {
      setError(null);
      refresh();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not save"),
  });
  const lien = useMutation({
    mutationFn: (form: FormData) =>
      saveLienFn({
        data: {
          vehicleId: query.data!.titleCase.vehicleId,
          titleCaseId,
          status: String(form.get("status") ?? "unknown"),
          lienholderName: String(form.get("lienholderName") ?? ""),
          note: String(form.get("note") ?? ""),
        },
      }),
    onSuccess: () => {
      setError(null);
      advance.mutate("documents");
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not save"),
  });
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const contentBase64 = await readBase64(file);
      return uploadDocumentFn({
        data: {
          fileName: file.name,
          contentType: file.type,
          contentBase64,
          documentType: docType,
          vehicleId: query.data!.titleCase.vehicleId,
          titleCaseId,
          caseId: query.data!.titleCase.caseId,
        },
      });
    },
    onSuccess: () => {
      setError(null);
      refresh();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Upload failed"),
  });
  const submit = useMutation({
    mutationFn: () => submitTitleCaseFn({ data: { titleCaseId } }),
    onSuccess: () => {
      setError(null);
      refresh();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Submit failed"),
  });
  const openDoc = useMutation({
    mutationFn: (documentId: string) => accessDocumentFn({ data: { documentId } }),
    onSuccess: (result) => window.open(result.url, "_blank", "noopener,noreferrer"),
  });

  if (query.isPending) return <p className="text-sm text-muted">Loading title case…</p>;
  if (query.error) {
    return (
      <Card>
        <p className="text-sm text-danger">
          {query.error instanceof Error ? query.error.message : "Unable to load this case"}
        </p>
        <Link to="/app/cases" className="mt-3 inline-block text-sm text-steel underline">
          Back to cases
        </Link>
      </Card>
    );
  }

  const detail = query.data!;
  const record = detail.titleCase;
  const locked =
    record.currentStep === "submitted" ||
    ["under_review", "completed", "rejected", "cancelled", "processing"].includes(record.status);
  const step = record.currentStep;

  return (
    <div>
      <PageHeader
        title={record.caseNumber}
        description={`${TITLE_TRANSACTION_LABELS[record.transactionType]} · ${TITLE_SUBMIT_NOTICE}`}
      />
      <p className="mb-4 text-sm text-muted">{IDENTITY_NOTICE}</p>
      <TitleStepper current={step} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone="pine">{record.status.replaceAll("_", " ")}</Badge>
        {vehicle.data ? (
          <Badge>
            {vehicle.data.vehicle.displayName} · {vehicle.data.vehicle.vinMasked}
          </Badge>
        ) : null}
      </div>

      {step === "ownership" && !locked ? (
        <Card>
          <h2 className="font-display text-xl">Ownership</h2>
          <p className="mt-2 text-sm text-muted">Begins as self-reported. Not verified automatically.</p>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              own.mutate(new FormData(event.currentTarget));
            }}
          >
            <div>
              <Label htmlFor="ownershipType">Ownership type</Label>
              <Select id="ownershipType" name="ownershipType" defaultValue="sole">
                {OWNERSHIP_TYPES.map((type) => (
                  <option key={type} value={type}>{OWNERSHIP_TYPE_LABELS[type]}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="ownerName">Owner name</Label>
              <Input id="ownerName" name="ownerName" required />
            </div>
            <div>
              <Label htmlFor="acquisitionDate">Acquisition date</Label>
              <Input id="acquisitionDate" name="acquisitionDate" type="date" />
            </div>
            <div>
              <Label htmlFor="purchasePrice">Purchase price (optional)</Label>
              <Input id="purchasePrice" name="purchasePrice" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="sellerName">Seller name (optional)</Label>
              <Input id="sellerName" name="sellerName" />
            </div>
            <Button type="submit" disabled={own.isPending}>Continue to title information</Button>
          </form>
        </Card>
      ) : null}

      {step === "title" && !locked ? (
        <Card>
          <h2 className="font-display text-xl">Title information</h2>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              titleInfo.mutate(new FormData(event.currentTarget));
            }}
          >
            <div>
              <Label htmlFor="titleState">Title state</Label>
              <Select id="titleState" name="titleState" required defaultValue="">
                <option value="" disabled>Select</option>
                {US_STATES.map((state) => (
                  <option key={state.code} value={state.code}>{state.code} — {state.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="titleNumberLast4">Title number last 4 (optional)</Label>
              <Input id="titleNumberLast4" name="titleNumberLast4" maxLength={4} />
            </div>
            <div>
              <Label htmlFor="titleIssueDate">Issue date (optional)</Label>
              <Input id="titleIssueDate" name="titleIssueDate" type="date" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="titleNotes">Notes (optional)</Label>
              <Textarea id="titleNotes" name="titleNotes" />
            </div>
            <Button type="submit" disabled={titleInfo.isPending}>Continue to lien information</Button>
          </form>
        </Card>
      ) : null}

      {step === "lien" && !locked ? (
        <Card>
          <h2 className="font-display text-xl">Lien information</h2>
          <HelperText>Never marked verified from customer input.</HelperText>
          <form
            className="mt-4 space-y-3"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              lien.mutate(new FormData(event.currentTarget));
            }}
          >
            <div>
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" defaultValue="unknown">
                {CUSTOMER_LIEN_STATUSES.map((status) => (
                  <option key={status} value={status}>{LIEN_STATUS_LABELS[status]}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="lienholderName">Lienholder name</Label>
              <Input id="lienholderName" name="lienholderName" />
            </div>
            <div>
              <Label htmlFor="note">Note</Label>
              <Textarea id="note" name="note" />
            </div>
            <Button type="submit" disabled={lien.isPending}>Continue to documents</Button>
          </form>
        </Card>
      ) : null}

      {(step === "documents" || step === "review") && !locked ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="font-display text-xl">Documents</h2>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                const input = event.currentTarget.elements.namedItem("file") as HTMLInputElement | null;
                const file = input?.files?.[0];
                if (!file) {
                  setError("Choose a file");
                  return;
                }
                upload.mutate(file);
              }}
            >
              <Select value={docType} onChange={(e) => setDocType(e.target.value as DocumentType)}>
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>{DOCUMENT_TYPE_LABELS[type]}</option>
                ))}
              </Select>
              <input id="file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="block w-full text-sm" />
              <Button type="submit" disabled={upload.isPending}>{upload.isPending ? "Uploading…" : "Upload"}</Button>
            </form>
            <ul className="mt-4 space-y-2 text-sm">
              {detail.documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between rounded-md bg-stone px-3 py-2">
                  <span>{doc.fileName}</span>
                  <Button size="sm" variant="ghost" onClick={() => openDoc.mutate(doc.id)}>Open</Button>
                </li>
              ))}
            </ul>
            {step === "documents" ? (
              <Button className="mt-4" variant="secondary" onClick={() => advance.mutate("review")}>
                Continue to review
              </Button>
            ) : null}
          </Card>
          {step === "review" ? (
            <Card>
              <h2 className="font-display text-xl">Review</h2>
              <ul className="mt-4 space-y-2 text-sm">
                <li>Ownership records: {detail.ownership.length}</li>
                <li>Lien statements: {detail.liens.length}</li>
                <li>Documents: {detail.documents.length}</li>
                <li>Title state: {record.titleState ?? "—"}</li>
              </ul>
              <p className="mt-4 text-sm text-muted">{TITLE_SUBMIT_NOTICE}</p>
              <Button className="mt-4" onClick={() => submit.mutate()} disabled={submit.isPending}>
                {submit.isPending ? "Submitting…" : "Submit for Internal Review"}
              </Button>
            </Card>
          ) : null}
        </div>
      ) : null}

      {locked ? (
        <Card>
          <h2 className="font-display text-xl">
            {record.status === "rejected"
              ? "Rejected"
              : record.status === "completed"
                ? "Completed"
                : "Submitted for internal review"}
          </h2>
          <p className="mt-2 text-sm text-muted">{TITLE_SUBMIT_NOTICE}</p>
          <p className="mt-4 text-sm">Status: {record.status.replaceAll("_", " ")}</p>
          {record.submittedAt ? <p className="text-sm text-muted">{formatDateTime(record.submittedAt)}</p> : null}
          <Link to="/app/cases" className="mt-4 inline-block text-sm text-steel underline">Back to cases</Link>
        </Card>
      ) : null}

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
