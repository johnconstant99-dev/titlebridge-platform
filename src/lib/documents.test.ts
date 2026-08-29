import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DOCUMENT_URL_TTL_SECONDS } from "./constants.ts";
import {
  assertAllowedUpload,
  decodeBase64,
  sanitizeFileName,
  sniffContentType,
} from "./documents.ts";

function pdfBytes(): Uint8Array {
  return new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
}

describe("document vault helpers", () => {
  it("sanitizes path traversal and odd characters", () => {
    assert.equal(sanitizeFileName("../../etc/passwd.pdf"), "passwd.pdf");
    assert.equal(sanitizeFileName("My Title (scan).PDF"), "My_Title_scan_.PDF");
  });

  it("sniffs PDF, JPEG, PNG, and WebP magic bytes", () => {
    assert.equal(sniffContentType(pdfBytes()), "application/pdf");
    assert.equal(sniffContentType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
    assert.equal(
      sniffContentType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
      "image/png",
    );
    const webp = new Uint8Array(12);
    webp.set([0x52, 0x49, 0x46, 0x46], 0);
    webp.set([0x57, 0x45, 0x42, 0x50], 8);
    assert.equal(sniffContentType(webp), "image/webp");
    assert.equal(sniffContentType(new Uint8Array([0x4d, 0x5a])), null);
  });

  it("allows a PDF under the size limit", () => {
    const bytes = pdfBytes();
    const allowed = assertAllowedUpload({
      fileName: "title.pdf",
      declaredType: "application/pdf",
      byteLength: bytes.byteLength,
      bytes,
    });
    assert.equal(allowed.contentType, "application/pdf");
    assert.equal(allowed.fileName, "title.pdf");
  });

  it("rejects disallowed types", () => {
    assert.throws(
      () =>
        assertAllowedUpload({
          fileName: "payload.exe",
          declaredType: "application/octet-stream",
          byteLength: 4,
          bytes: new Uint8Array([0x4d, 0x5a, 0x90, 0x00]),
        }),
      /not allowed/,
    );
  });

  it("rejects files over 5 MB", () => {
    const bytes = pdfBytes();
    assert.throws(
      () =>
        assertAllowedUpload({
          fileName: "huge.pdf",
          declaredType: "application/pdf",
          byteLength: 5 * 1024 * 1024 + 1,
          bytes,
        }),
      /5 MB/,
    );
  });

  it("rejects mismatched magic bytes and declared type", () => {
    assert.throws(
      () =>
        assertAllowedUpload({
          fileName: "not-a-pdf.pdf",
          declaredType: "application/pdf",
          byteLength: 3,
          bytes: new Uint8Array([0xff, 0xd8, 0xff]),
        }),
      /do not match/,
    );
  });

  it("decodes a data-URL or raw base64 payload", () => {
    const encoded = Buffer.from("%PDF-1.4").toString("base64");
    const fromRaw = decodeBase64(encoded);
    assert.equal(fromRaw[0], 0x25);
    const fromDataUrl = decodeBase64(`data:application/pdf;base64,${encoded}`);
    assert.deepEqual(Array.from(fromDataUrl), Array.from(fromRaw));
  });

  it("keeps signed download URLs at five minutes", () => {
    assert.equal(DOCUMENT_URL_TTL_SECONDS, 5 * 60);
  });
});
