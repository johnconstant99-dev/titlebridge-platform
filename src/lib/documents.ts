import {
  DOCUMENT_MAX_BYTES,
  DOCUMENT_MIME_ALLOWLIST,
} from "./constants.ts";

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function sanitizeFileName(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop() ?? "document";
  const cleaned = base
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._]+/, "")
    .slice(0, 120);
  return cleaned || "document";
}

export function inferContentType(fileName: string, declared?: string | null): string | null {
  const ext = (fileName.split(".").pop() ?? "").toLowerCase();
  const fromName = MIME_BY_EXT[ext];
  if (declared && DOCUMENT_MIME_ALLOWLIST.includes(declared as (typeof DOCUMENT_MIME_ALLOWLIST)[number])) {
    if (fromName && fromName !== declared) return null;
    return declared;
  }
  return fromName ?? null;
}

export function sniffContentType(bytes: Uint8Array): string | null {
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "application/pdf";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function assertAllowedUpload(input: {
  fileName: string;
  declaredType?: string | null;
  byteLength: number;
  bytes: Uint8Array;
}): { fileName: string; contentType: string } {
  if (input.byteLength <= 0) throw new Error("File is empty");
  if (input.byteLength > DOCUMENT_MAX_BYTES) {
    throw new Error("File exceeds the 5 MB limit");
  }
  const fileName = sanitizeFileName(input.fileName);
  const sniffed = sniffContentType(input.bytes);
  const inferred = inferContentType(fileName, input.declaredType);
  const contentType = sniffed ?? inferred;
  if (!contentType || !DOCUMENT_MIME_ALLOWLIST.includes(contentType as (typeof DOCUMENT_MIME_ALLOWLIST)[number])) {
    throw new Error("File type is not allowed. Use PDF, JPEG, PNG, or WebP.");
  }
  if (sniffed && inferred && sniffed !== inferred) {
    throw new Error("File contents do not match the file type");
  }
  return { fileName, contentType };
}

export function decodeBase64(value: string): Uint8Array {
  const cleaned = value.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
  const buffer = Buffer.from(cleaned, "base64");
  if (buffer.length === 0) throw new Error("File is empty");
  return new Uint8Array(buffer);
}
