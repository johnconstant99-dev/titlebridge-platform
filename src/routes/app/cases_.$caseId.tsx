import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { addCaseNoteFn, getCaseFn } from "@/fn/session";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/field";
import { CASE_TYPE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export const Route = createFileRoute("/app/cases_/$caseId")({ component: CaseDetail });

function CaseDetail() {
  const { caseId } = Route.useParams();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => getCaseFn({ data: { caseId } }),
  });
  const [note, setNote] = useState("");
  const addNote = useMutation({
    mutationFn: () =>
      addCaseNoteFn({ data: { caseId, note, visibility: "customer" } }),
    onSuccess: async () => {
      setNote("");
      await client.invalidateQueries({ queryKey: ["case", caseId] });
    },
  });

  if (query.isPending) return <p className="text-sm text-muted">Loading case…</p>;
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

  const record = query.data!.case;
  return (
    <div>
      <PageHeader
        title={record.caseNumber}
        description={`${CASE_TYPE_LABELS[record.caseType]} · local draft only. Case numbers are identifiers, not access keys.`}
      />
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <h2 className="font-display text-xl">Customer notes</h2>
          <div className="mt-4 space-y-3">
            {query.data!.notes.length === 0 ? (
              <p className="text-sm text-muted">No customer-visible notes yet.</p>
            ) : (
              query.data!.notes.map((item) => (
                <div key={item.id} className="rounded-md bg-stone px-3 py-3 text-sm">
                  <p>{item.note}</p>
                  <p className="mt-1 text-xs text-muted">{formatDateTime(item.createdAt)}</p>
                </div>
              ))
            )}
          </div>
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              addNote.mutate();
            }}
          >
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note visible on your case"
            />
            <Button type="submit" disabled={addNote.isPending || !note.trim()}>
              Add note
            </Button>
          </form>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Status</p>
          <div className="mt-2">
            <Badge tone="pine">{record.status.replaceAll("_", " ")}</Badge>
          </div>
          <p className="mt-4 text-sm text-muted">
            Jurisdiction: {record.jurisdiction ?? "Not set"}
          </p>
          <p className="mt-2 text-sm text-muted">Opened {formatDateTime(record.createdAt)}</p>
        </Card>
      </div>
    </div>
  );
}
