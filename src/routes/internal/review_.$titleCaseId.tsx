import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  accessDocumentFn,
  getTitleCaseFn,
  getVehicleFn,
  listAssignableStaffFn,
  reviewTitleCaseFn,
  updateStaffLienFn,
} from "@/fn/session";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { HelperText, Label, Select, Textarea } from "@/components/ui/field";
import { useSessionSnapshot } from "@/hooks/use-session-snapshot";
import {
  CASE_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  IDENTITY_NOTICE,
  LIEN_STATUS_LABELS,
  LIEN_STATUSES,
  OWNERSHIP_TYPE_LABELS,
  REVIEW_ACTION_LABELS,
  REVIEW_ACTIONS,
  REVIEW_SECTIONS,
  TITLE_STEP_LABELS,
  TITLE_SUBMIT_NOTICE,
  TITLE_TRANSACTION_LABELS,
} from "@/lib/constants";
import { displayName, formatDate, formatDateTime } from "@/lib/utils";
import { can } from "@/lib/rbac";
import type { LienStatus, ReviewAction, ReviewSection } from "@/lib/types";

export const Route = createFileRoute("/internal/review_/$titleCaseId")({
  component: TitleCaseReviewPage,
});

function TitleCaseReviewPage() {
  const { titleCaseId } = Route.useParams();
  const client = useQueryClient();
  const { snapshot } = useSessionSnapshot();
  const canAssign = can(snapshot?.roles ?? [], "case:assign");
  const canFlag = can(snapshot?.roles ?? [], "compliance:review");
  const allowedActions = REVIEW_ACTIONS.filter((item) => {
    if (item === "assigned" || item === "reassigned") return canAssign;
    if (item === "flagged") return canFlag;
    return true;
  });
  const query = useQuery({
    queryKey: ["title-case", titleCaseId],
    queryFn: () => getTitleCaseFn({ data: { titleCaseId } }),
  });
  const staff = useQuery({
    queryKey: ["assignable-staff"],
    queryFn: () => listAssignableStaffFn(),
    enabled: canAssign,
  });
  const vehicle = useQuery({
    queryKey: ["vehicle", query.data?.titleCase.vehicleId],
    queryFn: () => getVehicleFn({ data: { vehicleId: query.data!.titleCase.vehicleId } }),
    enabled: Boolean(query.data?.titleCase.vehicleId),
  });
  const [section, setSection] = useState<ReviewSection>("case");
  const [action, setAction] = useState<ReviewAction>("approved");
  const [note, setNote] = useState("");
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [lienStatus, setLienStatus] = useState<Exclude<LienStatus, "verified">>("under_review");
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["title-case", titleCaseId] });
    void client.invalidateQueries({ queryKey: ["admin-title-cases"] });
  };

  const review = useMutation({
    mutationFn: () =>
      reviewTitleCaseFn({
        data: {
          titleCaseId,
          section,
          action,
          note,
          assigneeUserId,
        },
      }),
    onSuccess: () => {
      setError(null);
      setNote("");
      refresh();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Review action failed"),
  });

  const lienUpdate = useMutation({
    mutationFn: (lienId: string) =>
      updateStaffLienFn({
        data: { lienId, status: lienStatus, note },
      }),
    onSuccess: () => {
      setError(null);
      refresh();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Lien update failed"),
  });

  const openDoc = useMutation({
    mutationFn: (documentId: string) => accessDocumentFn({ data: { documentId } }),
    onSuccess: (result) => window.open(result.url, "_blank", "noopener,noreferrer"),
    onError: (err) => setError(err instanceof Error ? err.message : "Document access denied"),
  });

  function onReview(event: FormEvent) {
    event.preventDefault();
    review.mutate();
  }

  if (query.isPending) return <p className="text-sm text-muted">Loading title case…</p>;
  if (query.error) {
    return (
      <Card>
        <p className="text-sm text-danger">
          {query.error instanceof Error ? query.error.message : "Unable to load this title case"}
        </p>
        <Link to="/internal/review" className="mt-3 inline-block text-sm text-steel underline">
          Back to review
        </Link>
      </Card>
    );
  }

  const detail = query.data!;
  const record = detail.titleCase;
  const customerName = displayName(
    detail.customer?.firstName ?? "",
    detail.customer?.lastName ?? "",
    "Customer",
  );
  const latestLien = detail.liens[0];

  return (
    <div>
      <PageHeader
        title={record.caseNumber}
        description={`${TITLE_TRANSACTION_LABELS[record.transactionType]} · ${TITLE_SUBMIT_NOTICE}`}
        actions={
          <Link to="/internal/review">
            <Button variant="secondary">All reviews</Button>
          </Link>
        }
      />
      <p className="mb-4 text-sm text-muted">{IDENTITY_NOTICE}</p>
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone="pine">{CASE_STATUS_LABELS[record.status]}</Badge>
        <Badge>{TITLE_STEP_LABELS[record.currentStep]}</Badge>
        {record.assignedTo ? (
          <Badge>
            Assigned {detail.assigneeName ?? record.assignedTo.slice(0, 8)}
          </Badge>
        ) : (
          <Badge>Unassigned</Badge>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="font-display text-xl">Customer and vehicle</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Customer</dt>
              <dd>{customerName}</dd>
            </div>
            <div>
              <dt className="text-muted">State</dt>
              <dd>{detail.customer?.state ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Vehicle</dt>
              <dd>{vehicle.data?.vehicle.displayName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Masked VIN</dt>
              <dd className="font-mono">{vehicle.data?.vehicle.vinMasked ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">VIN format</dt>
              <dd>
                {vehicle.data?.vehicle.vinFormatValid ? "VIN format validated" : "Not validated"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Verification</dt>
              <dd>{vehicle.data?.vehicle.verificationStatus.replaceAll("_", " ") ?? "unverified"}</dd>
            </div>
          </dl>
          {vehicle.data?.vehicle.providerMessage ? (
            <p className="mt-3 text-sm text-muted">{vehicle.data.vehicle.providerMessage}</p>
          ) : null}
        </Card>
        <Card>
          <h2 className="font-display text-xl">Title information</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Title state</dt>
              <dd>{record.titleState ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Title number last 4</dt>
              <dd className="font-mono">{record.titleNumberLast4 ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Issue date</dt>
              <dd>{formatDate(record.titleIssueDate)}</dd>
            </div>
          </dl>
          {record.titleNotes ? <p className="mt-3 text-sm">{record.titleNotes}</p> : null}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-xl">Ownership</h2>
          {detail.ownership.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No ownership record.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {detail.ownership.map((item) => (
                <li key={item.id} className="rounded-md bg-stone px-3 py-2">
                  {OWNERSHIP_TYPE_LABELS[item.ownershipType]} · {item.ownerName} ·{" "}
                  {item.verificationStatus.replaceAll("_", " ")}
                  {item.acquisitionDate ? ` · ${formatDate(item.acquisitionDate)}` : ""}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="font-display text-xl">Lien information</h2>
          {detail.liens.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No lien statement.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {detail.liens.map((item) => (
                <li key={item.id} className="rounded-md bg-stone px-3 py-2">
                  {LIEN_STATUS_LABELS[item.status]}
                  {item.lienholderName ? ` · ${item.lienholderName}` : ""}
                </li>
              ))}
            </ul>
          )}
          {latestLien ? (
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                lienUpdate.mutate(latestLien.id);
              }}
            >
              <Label htmlFor="lienStatus">Staff lien status</Label>
              <Select
                id="lienStatus"
                value={lienStatus}
                onChange={(e) => setLienStatus(e.target.value as typeof lienStatus)}
              >
                {LIEN_STATUSES.filter((status) => status !== "verified").map((status) => (
                  <option key={status} value={status}>
                    {LIEN_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
              <HelperText>Customer input is never marked verified. Verified requires a configured provider.</HelperText>
              <Button type="submit" size="sm" disabled={lienUpdate.isPending}>
                Update lien
              </Button>
            </form>
          ) : null}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-xl">Documents</h2>
          {detail.documents.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No documents uploaded.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {detail.documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-col gap-2 rounded-md bg-stone px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm">{doc.fileName}</p>
                    <p className="text-xs text-muted">
                      {DOCUMENT_TYPE_LABELS[doc.documentType]} · {formatDateTime(doc.createdAt)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openDoc.mutate(doc.id)}
                    disabled={openDoc.isPending}
                  >
                    Open securely
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="font-display text-xl">Odometer</h2>
          {detail.odometer.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No odometer record.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {detail.odometer.map((item) => (
                <li key={item.id} className="rounded-md bg-stone px-3 py-2">
                  {item.reading.toLocaleString()} {item.unit} · {item.source.replaceAll("_", " ")}
                  {item.recordedAt ? ` · ${formatDate(item.recordedAt)}` : ""}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="font-display text-xl">Review action</h2>
        <p className="mt-2 text-sm text-muted">
          Every action writes an audit event. Flag for compliance requires a compliance role.
        </p>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onReview}>
          <div>
            <Label htmlFor="section">Section</Label>
            <Select
              id="section"
              value={section}
              onChange={(e) => setSection(e.target.value as ReviewSection)}
            >
              {REVIEW_SECTIONS.map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="action">Action</Label>
            <Select
              id="action"
              className="min-h-11"
              value={action}
              onChange={(e) => setAction(e.target.value as ReviewAction)}
            >
              {allowedActions.map((item) => (
                <option key={item} value={item}>
                  {REVIEW_ACTION_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
          {(action === "assigned" || action === "reassigned") && canAssign ? (
            <div className="sm:col-span-2">
              <Label htmlFor="assigneeUserId">Assignee</Label>
              <Select
                id="assigneeUserId"
                className="min-h-11"
                value={assigneeUserId}
                onChange={(e) => setAssigneeUserId(e.target.value)}
              >
                <option value="">Assign to me</option>
                {(staff.data ?? []).map((item) => (
                  <option key={item.userId} value={item.userId}>
                    {displayName(item.firstName, item.lastName, item.userId)} · {item.roles.join(", ")}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <Label htmlFor="note">Note</Label>
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={review.isPending}>
              {review.isPending ? "Saving…" : "Record review"}
            </Button>
          </div>
        </form>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-xl">Review history</h2>
          {detail.reviews.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No review actions yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {detail.reviews.map((item) => (
                <li key={item.id} className="rounded-md bg-stone px-3 py-2">
                  <p>
                    {REVIEW_ACTION_LABELS[item.action]} · {item.section}
                  </p>
                  {item.note ? <p className="text-muted">{item.note}</p> : null}
                  <p className="text-xs text-muted">{formatDateTime(item.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="font-display text-xl">Audit history</h2>
          {detail.audit.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No related audit events.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {detail.audit.slice(0, 20).map((item) => (
                <li key={item.id} className="rounded-md bg-stone px-3 py-2">
                  <p className="font-mono text-xs">{item.action}</p>
                  <p className="text-xs text-muted">
                    {item.resourceType}
                    {item.actorRole ? ` · ${item.actorRole}` : ""} · {formatDateTime(item.timestamp)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
