import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  accessDocumentFn,
  listDocumentsFn,
  listVehiclesFn,
  uploadDocumentFn,
} from "@/fn/session";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HelperText, Label, Select } from "@/components/ui/field";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPES } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { DocumentType } from "@/lib/types";

export const Route = createFileRoute("/app/documents")({ component: DocumentsPage });

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

function DocumentsPage() {
  const client = useQueryClient();
  const docs = useQuery({ queryKey: ["documents"], queryFn: () => listDocumentsFn() });
  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: () => listVehiclesFn() });
  const [error, setError] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>("supporting_document");
  const [vehicleId, setVehicleId] = useState("");

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const contentBase64 = await readBase64(file);
      return uploadDocumentFn({
        data: {
          fileName: file.name,
          contentType: file.type,
          contentBase64,
          documentType,
          vehicleId: vehicleId || undefined,
        },
      });
    },
    onSuccess: () => {
      setError(null);
      void client.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Upload failed"),
  });

  const open = useMutation({
    mutationFn: (documentId: string) => accessDocumentFn({ data: { documentId } }),
    onSuccess: (result) => {
      window.open(result.url, "_blank", "noopener,noreferrer");
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Access denied"),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("file") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      setError("Choose a file");
      return;
    }
    upload.mutate(file);
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Private TitleBridge vault. Files are not published. Object-storage providers remain unconfigured; access uses a short-lived authenticated link."
      />
      <Card className="mb-6">
        <h2 className="font-display text-xl">Upload</h2>
        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="documentType">Category</Label>
            <Select
              id="documentType"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as DocumentType)}
            >
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {DOCUMENT_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="vehicleId">Vehicle (optional)</Label>
            <Select id="vehicleId" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              <option value="">Not linked</option>
              {(vehicles.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.displayName} · {item.vinMasked}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="file">File</Label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              className="block w-full text-sm"
            />
            <HelperText>PDF, JPEG, PNG, or WebP. 5 MB maximum. No public URLs are created.</HelperText>
          </div>
          <Button type="submit" disabled={upload.isPending}>
            {upload.isPending ? "Uploading…" : "Upload document"}
          </Button>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </form>
      </Card>
      <Card>
        {(docs.data ?? []).length === 0 ? (
          <div className="py-10 text-center">
            <p className="font-display text-2xl">No documents yet</p>
            <p className="mt-2 text-sm text-muted">Uploads stay in your private vault and are audited.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {docs.data?.map((doc) => (
              <li key={doc.id} className="flex flex-col gap-2 rounded-md bg-stone px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">{doc.fileName}</p>
                  <p className="text-xs text-muted">
                    {DOCUMENT_TYPE_LABELS[doc.documentType]} · {formatDateTime(doc.createdAt)}
                    {doc.byteSize ? ` · ${Math.ceil(doc.byteSize / 1024)} KB` : ""}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => open.mutate(doc.id)} disabled={open.isPending}>
                  Open securely
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
