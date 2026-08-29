import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  addCaseNoteFn,
  adminCasesFn,
  assignCaseFn,
  getCaseFn,
  listAssignableStaffFn,
  updateCaseStatusFn,
} from "@/fn/session";
import { useSessionSnapshot } from "@/hooks/use-session-snapshot";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Label, Select, Textarea } from "@/components/ui/field";
import { CASE_STATUS_LABELS, CASE_STATUSES, CASE_TYPE_LABELS } from "@/lib/constants";
import { can } from "@/lib/rbac";
import { displayName, formatDateTime } from "@/lib/utils";
import type { CaseStatus } from "@/lib/types";

export const Route = createFileRoute("/internal/cases")({ component: InternalCases });

function InternalCases() {
  const client = useQueryClient();
  const { snapshot } = useSessionSnapshot();
  const canAssign = can(snapshot?.roles ?? [], "case:assign");
  const query = useQuery({ queryKey: ["admin-cases"], queryFn: () => adminCasesFn() });
  const staff = useQuery({
    queryKey: ["assignable-staff"],
    queryFn: () => listAssignableStaffFn(),
    enabled: canAssign,
  });
  const [selected, setSelected] = useState<string | null>(null);
  const detail = useQuery({
    queryKey: ["case", selected],
    queryFn: () => getCaseFn({ data: { caseId: selected! } }),
    enabled: Boolean(selected),
  });
  const [status, setStatus] = useState<CaseStatus>("under_review");
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["admin-cases"] });
    void client.invalidateQueries({ queryKey: ["case", selected] });
  };
  const changeStatus = useMutation({
    mutationFn: () => updateCaseStatusFn({ data: { caseId: selected, status } }),
    onSuccess: () => {
      setError(null);
      refresh();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Update failed"),
  });
  const assign = useMutation({
    mutationFn: () =>
      assignCaseFn({ data: { caseId: selected, assigneeUserId } }),
    onSuccess: () => {
      setError(null);
      refresh();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Assignment failed"),
  });
  const addNote = useMutation({
    mutationFn: () =>
      addCaseNoteFn({ data: { caseId: selected, note, visibility: "internal" } }),
    onSuccess: () => {
      setNote("");
      void client.invalidateQueries({ queryKey: ["case", selected] });
    },
  });
  const selectedCase = query.data?.find((item) => item.id === selected);
  const assignedLabel = staff.data?.find((item) => item.userId === detail.data?.case.assignedTo);

  return (
    <div>
      <PageHeader
        title="Cases"
        description="Operations may review, assign, and apply permitted workflow statuses. Nothing is filed with a state."
      />
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          {query.error ? (
            <p className="text-sm text-danger">
              {query.error instanceof Error ? query.error.message : "Not authorized"}
            </p>
          ) : (
            <div className="space-y-2">
              {(query.data ?? []).length === 0 ? (
                <p className="text-sm text-muted">No cases in this environment.</p>
              ) : (
                query.data?.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item.id)}
                    className="flex min-h-11 w-full items-center justify-between rounded-md bg-stone px-3 py-3 text-left"
                  >
                    <span>
                      <span className="block font-mono text-sm">{item.caseNumber}</span>
                      <span className="text-xs text-muted">
                        {item.assignedTo ? "Assigned" : "Unassigned"}
                      </span>
                    </span>
                    <Badge>{item.status.replaceAll("_", " ")}</Badge>
                  </button>
                ))
              )}
            </div>
          )}
        </Card>
        <Card>
          {!selected ? (
            <p className="text-sm text-muted">Select a case to review.</p>
          ) : detail.data ? (
            <div className="space-y-4">
              <div>
                <p className="font-mono">{detail.data.case.caseNumber}</p>
                <p className="text-sm text-muted">
                  {CASE_TYPE_LABELS[detail.data.case.caseType]}
                </p>
                <p className="text-xs text-muted">
                  Opened {formatDateTime(detail.data.case.createdAt)}
                </p>
                <p className="mt-2 text-sm">
                  Assignee:{" "}
                  {assignedLabel
                    ? displayName(assignedLabel.firstName, assignedLabel.lastName, assignedLabel.userId)
                    : detail.data.case.assignedTo
                      ? "Assigned"
                      : "Unassigned"}
                </p>
              </div>
              {selectedCase?.titleCaseId ? (
                <Link
                  to="/internal/review/$titleCaseId"
                  params={{ titleCaseId: selectedCase.titleCaseId }}
                  className="inline-block text-sm text-steel underline"
                >
                  Open title-case review
                </Link>
              ) : null}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select
                  className="min-h-11 flex-1"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CaseStatus)}
                >
                  {CASE_STATUSES.map((item) => (
                    <option key={item} value={item}>
                      {CASE_STATUS_LABELS[item]}
                    </option>
                  ))}
                </Select>
                <Button size="sm" onClick={() => changeStatus.mutate()}>
                  Update status
                </Button>
              </div>
              {canAssign ? (
                <div className="space-y-2">
                  <Label htmlFor="assignee">Assign / reassign</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Select
                      id="assignee"
                      className="min-h-11 flex-1"
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
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => assign.mutate()}
                      disabled={assign.isPending}
                    >
                      {detail.data.case.assignedTo ? "Reassign" : "Assign"}
                    </Button>
                  </div>
                </div>
              ) : null}
              <div>
                <p className="mb-2 text-sm font-medium">Internal notes</p>
                <div className="space-y-2">
                  {detail.data.notes
                    .filter((item) => item.visibility === "internal")
                    .map((item) => (
                      <p key={item.id} className="rounded-md bg-stone px-3 py-2 text-sm">
                        {item.note}
                      </p>
                    ))}
                </div>
                <Textarea
                  className="mt-3"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Internal note (not visible to the customer)"
                />
                <Button
                  className="mt-2"
                  size="sm"
                  variant="secondary"
                  onClick={() => addNote.mutate()}
                  disabled={!note.trim()}
                >
                  Add internal note
                </Button>
              </div>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
            </div>
          ) : (
            <p className="text-sm text-muted">Loading…</p>
          )}
        </Card>
      </div>
    </div>
  );
}
