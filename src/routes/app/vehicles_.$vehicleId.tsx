import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  createTitleCaseFn,
  getVehicleFn,
  saveLienFn,
  saveOwnershipFn,
} from "@/fn/session";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { HelperText, Input, Label, Select, Textarea } from "@/components/ui/field";
import {
  CUSTOMER_LIEN_STATUSES,
  IDENTITY_NOTICE,
  LIEN_STATUS_LABELS,
  OWNERSHIP_TYPE_LABELS,
  OWNERSHIP_TYPES,
  TITLE_TRANSACTION_LABELS,
  TITLE_TRANSACTION_TYPES,
  VIN_FORMAT_VALIDATED,
} from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { LienStatus, TitleTransactionType } from "@/lib/types";

export const Route = createFileRoute("/app/vehicles_/$vehicleId")({
  component: VehicleProfile,
});

function VehicleProfile() {
  const { vehicleId } = Route.useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["vehicle", vehicleId],
    queryFn: () => getVehicleFn({ data: { vehicleId } }),
  });
  const [ownError, setOwnError] = useState<string | null>(null);
  const [lienError, setLienError] = useState<string | null>(null);
  const [caseError, setCaseError] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<TitleTransactionType>("title_transfer");

  const saveOwn = useMutation({
    mutationFn: (form: FormData) =>
      saveOwnershipFn({
        data: {
          vehicleId,
          ownershipType: String(form.get("ownershipType") ?? "sole"),
          ownerName: String(form.get("ownerName") ?? ""),
          acquisitionDate: String(form.get("acquisitionDate") ?? ""),
          purchasePrice: String(form.get("purchasePrice") ?? ""),
          sellerName: String(form.get("sellerName") ?? ""),
        },
      }),
    onSuccess: () => {
      setOwnError(null);
      void client.invalidateQueries({ queryKey: ["vehicle", vehicleId] });
    },
    onError: (err) => setOwnError(err instanceof Error ? err.message : "Could not save ownership"),
  });

  const saveLien = useMutation({
    mutationFn: (form: FormData) =>
      saveLienFn({
        data: {
          vehicleId,
          status: String(form.get("status") ?? "unknown"),
          lienholderName: String(form.get("lienholderName") ?? ""),
          note: String(form.get("note") ?? ""),
        },
      }),
    onSuccess: () => {
      setLienError(null);
      void client.invalidateQueries({ queryKey: ["vehicle", vehicleId] });
    },
    onError: (err) => setLienError(err instanceof Error ? err.message : "Could not save lien"),
  });

  const startCase = useMutation({
    mutationFn: () => createTitleCaseFn({ data: { vehicleId, transactionType } }),
    onSuccess: async (record) => {
      await navigate({ to: "/app/title-cases/$titleCaseId", params: { titleCaseId: record.id } });
    },
    onError: (err) => setCaseError(err instanceof Error ? err.message : "Could not start title case"),
  });

  if (query.isPending) return <p className="text-sm text-muted">Loading vehicle…</p>;
  if (query.error) {
    return (
      <Card>
        <p className="text-sm text-danger">
          {query.error instanceof Error ? query.error.message : "Unable to load this vehicle"}
        </p>
        <Link to="/app/vehicles" className="mt-3 inline-block text-sm text-steel underline">
          Back to vehicles
        </Link>
      </Card>
    );
  }

  const { vehicle, ownership, liens, odometer, documents } = query.data!;
  const latestOwn = ownership[0];
  const latestLien = liens[0];

  return (
    <div>
      <PageHeader
        title={vehicle.displayName}
        description="Self-reported vehicle record. VIN format is validated locally. External vehicle verification is not connected."
        actions={
          <Link to="/app/vehicles">
            <Button variant="secondary">All vehicles</Button>
          </Link>
        }
      />
      <p className="mb-4 text-sm text-muted">{IDENTITY_NOTICE}</p>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">{vehicle.vinFormatValid ? VIN_FORMAT_VALIDATED : "VIN not validated"}</Badge>
            <Badge>Ownership: {vehicle.ownershipStatus.replaceAll("_", " ")}</Badge>
            <Badge>Lien: {vehicle.lienStatus.replaceAll("_", " ")}</Badge>
            <Badge>Title case: {vehicle.titleCaseStatus?.replaceAll("_", " ") ?? "none"}</Badge>
            <Badge>Documents: {vehicle.documentCount}</Badge>
          </div>
          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-muted">Year</dt><dd>{vehicle.year ?? "—"}</dd></div>
            <div><dt className="text-muted">Make</dt><dd>{vehicle.make ?? "—"}</dd></div>
            <div><dt className="text-muted">Model</dt><dd>{vehicle.model ?? "—"}</dd></div>
            <div><dt className="text-muted">Trim</dt><dd>{vehicle.trim ?? "—"}</dd></div>
            <div><dt className="text-muted">Color</dt><dd>{vehicle.color ?? "—"}</dd></div>
            <div><dt className="text-muted">Masked VIN</dt><dd className="font-mono">{vehicle.vinMasked}</dd></div>
            <div><dt className="text-muted">Plate</dt><dd>{vehicle.plateNumber ?? "—"} {vehicle.plateState ?? ""}</dd></div>
            <div>
              <dt className="text-muted">Verification</dt>
              <dd>{vehicle.verificationStatus.replaceAll("_", " ")}</dd>
            </div>
          </dl>
          {vehicle.providerMessage ? (
            <p className="mt-4 text-sm text-muted">{vehicle.providerMessage}</p>
          ) : null}
          {odometer[0] ? (
            <p className="mt-4 text-sm">
              Odometer {odometer[0].reading.toLocaleString()} {odometer[0].unit}
              {odometer[0].recordedAt ? ` · ${formatDate(odometer[0].recordedAt)}` : ""}
              <span className="text-muted"> · {odometer[0].source.replaceAll("_", " ")}</span>
            </p>
          ) : null}
        </Card>
        <Card>
          <h2 className="font-display text-xl">Start Title Case</h2>
          <p className="mt-2 text-sm text-muted">
            Internal TitleBridge review only — not a DMV filing.
          </p>
          <Select
            className="mt-4"
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value as TitleTransactionType)}
          >
            {TITLE_TRANSACTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {TITLE_TRANSACTION_LABELS[type]}
              </option>
            ))}
          </Select>
          <Button className="mt-3 w-full" onClick={() => startCase.mutate()} disabled={startCase.isPending}>
            {startCase.isPending ? "Creating…" : "Start Title Case"}
          </Button>
          {caseError ? <p className="mt-2 text-sm text-danger">{caseError}</p> : null}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-xl">Ownership</h2>
          {latestOwn ? (
            <p className="mt-2 text-sm">
              {OWNERSHIP_TYPE_LABELS[latestOwn.ownershipType]} · {latestOwn.ownerName} ·{" "}
              {latestOwn.verificationStatus.replaceAll("_", " ")}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted">No ownership record yet. Entries begin as self-reported.</p>
          )}
          <form
            className="mt-4 space-y-3"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              saveOwn.mutate(new FormData(event.currentTarget));
            }}
          >
            <div>
              <Label htmlFor="ownershipType">Ownership type</Label>
              <Select id="ownershipType" name="ownershipType" defaultValue="sole">
                {OWNERSHIP_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {OWNERSHIP_TYPE_LABELS[type]}
                  </option>
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
            <div>
              <Label htmlFor="sellerName">Seller name (optional)</Label>
              <Input id="sellerName" name="sellerName" />
            </div>
            <HelperText>This record is stored as self-reported. It is not marked verified.</HelperText>
            <Button type="submit" disabled={saveOwn.isPending}>Save ownership</Button>
            {ownError ? <p className="text-sm text-danger">{ownError}</p> : null}
          </form>
        </Card>
        <Card>
          <h2 className="font-display text-xl">Lien information</h2>
          {latestLien ? (
            <p className="mt-2 text-sm">
              {LIEN_STATUS_LABELS[latestLien.status as LienStatus]}
              {latestLien.lienholderName ? ` · ${latestLien.lienholderName}` : ""}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted">No lien statement yet. Customer input is never auto-verified.</p>
          )}
          <form
            className="mt-4 space-y-3"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              saveLien.mutate(new FormData(event.currentTarget));
            }}
          >
            <div>
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" defaultValue="unknown">
                {CUSTOMER_LIEN_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {LIEN_STATUS_LABELS[status]}
                  </option>
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
            <Button type="submit" disabled={saveLien.isPending}>Save lien statement</Button>
            {lienError ? <p className="text-sm text-danger">{lienError}</p> : null}
          </form>
        </Card>
      </div>
      <Card className="mt-4">
        <h2 className="font-display text-xl">Documents</h2>
        {documents.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No documents on this vehicle.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {documents.map((doc) => (
              <li key={doc.id} className="rounded-md bg-stone px-3 py-2">
                {doc.fileName} · {doc.documentType.replaceAll("_", " ")} · {formatDateTime(doc.createdAt)}
              </li>
            ))}
          </ul>
        )}
        <Link to="/app/documents" className="mt-3 inline-block text-sm text-steel underline">
          Manage documents
        </Link>
      </Card>
    </div>
  );
}
