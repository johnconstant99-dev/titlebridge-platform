import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminTitleCasesFn } from "@/fn/session";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, Card } from "@/components/ui/card";
import { CASE_STATUS_LABELS, TITLE_STEP_LABELS, TITLE_TRANSACTION_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export const Route = createFileRoute("/internal/review")({ component: InternalReview });

function InternalReview() {
  const query = useQuery({ queryKey: ["admin-title-cases"], queryFn: () => adminTitleCasesFn() });
  const rows = query.data ?? [];
  const queue = rows.filter((item) =>
    ["under_review", "awaiting_customer", "documents_required", "verification_required"].includes(
      item.status,
    ),
  );

  return (
    <div>
      <PageHeader
        title="Internal review"
        description="TitleBridge operations review only. Approving a section does not file with a motor-vehicle department."
      />
      {query.error ? (
        <Card>
          <p className="text-sm text-danger">
            {query.error instanceof Error ? query.error.message : "Not authorized"}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <p className="text-xs uppercase tracking-wide text-muted">Awaiting staff</p>
            <p className="mt-2 font-display text-3xl tabular-nums">{queue.length}</p>
          </Card>
          <Card>
            {rows.length === 0 ? (
              <p className="text-sm text-muted">No title cases in this environment.</p>
            ) : (
              <>
                <div className="space-y-3 lg:hidden">
                  {rows.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-lg border border-border bg-stone px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          to="/internal/review/$titleCaseId"
                          params={{ titleCaseId: item.id }}
                          className="font-mono text-steel underline"
                        >
                          {item.caseNumber}
                        </Link>
                        <Badge>{CASE_STATUS_LABELS[item.status]}</Badge>
                      </div>
                      <p className="mt-2 text-sm">
                        {item.customerName}
                        {item.customerState ? ` · ${item.customerState}` : ""}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {TITLE_TRANSACTION_LABELS[item.transactionType]} ·{" "}
                        {TITLE_STEP_LABELS[item.currentStep]}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {item.assigneeName ?? "Unassigned"} · {formatDateTime(item.updatedAt)}
                      </p>
                    </article>
                  ))}
                </div>
                <div className="hidden lg:block">
                  <table className="w-full text-left text-sm">
                    <thead className="text-muted">
                      <tr>
                        <th className="py-2 pr-3 font-medium">Case</th>
                        <th className="py-2 pr-3 font-medium">Customer</th>
                        <th className="py-2 pr-3 font-medium">Type</th>
                        <th className="py-2 pr-3 font-medium">Step</th>
                        <th className="py-2 pr-3 font-medium">Status</th>
                        <th className="py-2 pr-3 font-medium">Assignee</th>
                        <th className="py-2 font-medium">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((item) => (
                        <tr key={item.id} className="border-t border-border">
                          <td className="py-3 pr-3">
                            <Link
                              to="/internal/review/$titleCaseId"
                              params={{ titleCaseId: item.id }}
                              className="font-mono text-steel underline"
                            >
                              {item.caseNumber}
                            </Link>
                          </td>
                          <td className="pr-3">
                            {item.customerName}
                            {item.customerState ? ` · ${item.customerState}` : ""}
                          </td>
                          <td className="pr-3">{TITLE_TRANSACTION_LABELS[item.transactionType]}</td>
                          <td className="pr-3">{TITLE_STEP_LABELS[item.currentStep]}</td>
                          <td className="pr-3">
                            <Badge>{CASE_STATUS_LABELS[item.status]}</Badge>
                          </td>
                          <td className="pr-3 text-muted">{item.assigneeName ?? "Unassigned"}</td>
                          <td className="text-muted">{formatDateTime(item.updatedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
