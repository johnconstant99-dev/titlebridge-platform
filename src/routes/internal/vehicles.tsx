import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { accessDocumentFn, adminVehiclesFn, getVehicleFn, updateStaffLienFn } from "@/fn/session";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { HelperText, Label, Select } from "@/components/ui/field";
import {
  DOCUMENT_TYPE_LABELS,
  LIEN_STATUS_LABELS,
  LIEN_STATUSES,
  OWNERSHIP_TYPE_LABELS,
  VIN_FORMAT_VALIDATED,
} from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { LienStatus } from "@/lib/types";

export const Route = createFileRoute("/internal/vehicles")({ component: InternalVehicles });

function InternalVehicles() {
  const client = useQueryClient();
  const list = useQuery({ queryKey: ["admin-vehicles"], queryFn: () => adminVehiclesFn() });
  const [selected, setSelected] = useState<string | null>(null);
  const [lienStatus, setLienStatus] = useState<Exclude<LienStatus, "verified">>("under_review");
  const [error, setError] = useState<string | null>(null);
  const detail = useQuery({
    queryKey: ["vehicle", selected],
    queryFn: () => getVehicleFn({ data: { vehicleId: selected! } }),
    enabled: Boolean(selected),
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["vehicle", selected] });
    void client.invalidateQueries({ queryKey: ["admin-vehicles"] });
  };
  const lienUpdate = useMutation({
    mutationFn: (lienId: string) =>
      updateStaffLienFn({ data: { lienId, status: lienStatus } }),
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
  const latestLien = detail.data?.liens[0];

  return (
    <div>
      <PageHeader
        title="Vehicles"
        description="Staff may inspect customer vehicle records, liens, and private documents. VIN format is validated locally. External vehicle verification is not connected."
      />
      {list.error ? (
        <Card>
          <p className="text-sm text-danger">
            {list.error instanceof Error ? list.error.message : "Not authorized"}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Card>
            {(list.data ?? []).length === 0 ? (
              <p className="text-sm text-muted">No vehicles in this environment.</p>
            ) : (
              <div className="space-y-2">
                {list.data?.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item.id)}
                    className="flex min-h-11 w-full items-center justify-between rounded-md bg-stone px-3 py-3 text-left"
                  >
                    <span>
                      <span className="block font-medium">{item.displayName}</span>
                      <span className="font-mono text-xs text-muted">{item.vinMasked}</span>
                    </span>
                    <Badge tone={item.vinFormatValid ? "success" : "neutral"}>
                      {item.vinFormatValid ? VIN_FORMAT_VALIDATED : "VIN not validated"}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </Card>
          <Card>
            {!selected ? (
              <p className="text-sm text-muted">Select a vehicle to inspect.</p>
            ) : detail.data ? (
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-display text-xl">{detail.data.vehicle.displayName}</p>
                  <p className="font-mono text-muted">{detail.data.vehicle.vinMasked}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge>Ownership: {detail.data.vehicle.ownershipStatus.replaceAll("_", " ")}</Badge>
                  <Badge>Lien: {detail.data.vehicle.lienStatus.replaceAll("_", " ")}</Badge>
                  <Badge>
                    Title case: {detail.data.vehicle.titleCaseStatus?.replaceAll("_", " ") ?? "none"}
                  </Badge>
                </div>
                <dl className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-muted">Color</dt>
                    <dd>{detail.data.vehicle.color ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Plate</dt>
                    <dd>
                      {detail.data.vehicle.plateNumber ?? "—"} {detail.data.vehicle.plateState ?? ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Verification</dt>
                    <dd>{detail.data.vehicle.verificationStatus.replaceAll("_", " ")}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Added</dt>
                    <dd>{formatDateTime(detail.data.vehicle.createdAt)}</dd>
                  </div>
                </dl>
                {detail.data.vehicle.providerMessage ? (
                  <p className="text-muted">{detail.data.vehicle.providerMessage}</p>
                ) : null}
                <div>
                  <p className="font-medium">Ownership</p>
                  {detail.data.ownership.length === 0 ? (
                    <p className="text-muted">None recorded.</p>
                  ) : (
                    <ul className="mt-1 space-y-1">
                      {detail.data.ownership.map((item) => (
                        <li key={item.id}>
                          {OWNERSHIP_TYPE_LABELS[item.ownershipType]} · {item.ownerName} ·{" "}
                          {item.verificationStatus.replaceAll("_", " ")}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="font-medium">Liens</p>
                  {detail.data.liens.length === 0 ? (
                    <p className="text-muted">None recorded.</p>
                  ) : (
                    <ul className="mt-1 space-y-1">
                      {detail.data.liens.map((item) => (
                        <li key={item.id}>
                          {LIEN_STATUS_LABELS[item.status as LienStatus]}
                          {item.lienholderName ? ` · ${item.lienholderName}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                  {latestLien ? (
                    <form
                      className="mt-3 space-y-2"
                      onSubmit={(event: FormEvent) => {
                        event.preventDefault();
                        lienUpdate.mutate(latestLien.id);
                      }}
                    >
                      <Label htmlFor="staffLienStatus">Staff lien status</Label>
                      <Select
                        id="staffLienStatus"
                        className="min-h-11"
                        value={lienStatus}
                        onChange={(e) => setLienStatus(e.target.value as typeof lienStatus)}
                      >
                        {LIEN_STATUSES.filter((status) => status !== "verified").map((status) => (
                          <option key={status} value={status}>
                            {LIEN_STATUS_LABELS[status]}
                          </option>
                        ))}
                      </Select>
                      <HelperText>
                        Customer input is never marked verified. Verified requires a configured provider.
                      </HelperText>
                      <Button type="submit" size="sm" disabled={lienUpdate.isPending}>
                        Update lien
                      </Button>
                    </form>
                  ) : null}
                </div>
                <div>
                  <p className="font-medium">Odometer</p>
                  {detail.data.odometer.length === 0 ? (
                    <p className="text-muted">None recorded.</p>
                  ) : (
                    <ul className="mt-1 space-y-1">
                      {detail.data.odometer.map((item) => (
                        <li key={item.id}>
                          {item.reading.toLocaleString()} {item.unit}
                          {item.recordedAt ? ` · ${formatDate(item.recordedAt)}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="font-medium">Private documents</p>
                  {detail.data.documents.length === 0 ? (
                    <p className="text-muted">None uploaded.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {detail.data.documents.map((doc) => (
                        <li
                          key={doc.id}
                          className="flex flex-col gap-2 rounded-md bg-stone px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p>{doc.fileName}</p>
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
                </div>
                {error ? <p className="text-danger">{error}</p> : null}
              </div>
            ) : (
              <p className="text-sm text-muted">Loading…</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
