import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPlaceholderAdapter } from "./adapter.ts";
import { listAdapters } from "./registry.ts";

describe("integration adapters", () => {
  it("returns Provider not configured instead of fabricated data", async () => {
    const adapter = createPlaceholderAdapter("nmvtis", "NMVTIS placeholder");
    const result = await adapter.execute({});
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.message, /Provider not configured/);
    }
  });

  it("registers sandbox, staging, and production placeholders", () => {
    const adapters = listAdapters();
    const types = new Set(adapters.map((a) => a.providerType));
    assert.ok(types.has("identity"));
    assert.ok(types.has("vin"));
    assert.ok(types.has("nmvtis"));
    assert.ok(types.has("elt"));
    assert.ok(types.has("evr"));
    const envs = new Set(adapters.map((a) => a.environment));
    assert.ok(envs.has("sandbox"));
    assert.ok(envs.has("staging"));
    assert.ok(envs.has("production"));
    assert.ok(adapters.every((a) => a.configured === false));
  });
});
