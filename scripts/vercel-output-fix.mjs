#!/usr/bin/env node
/**
 * Nitro 3 beta (vercel preset) sometimes emits functions + static under
 * .vercel/output but omits Build Output API routing files:
 *   - config.json          (edge routing)
 *   - __server.func/.vc-config.json  (function runtime metadata)
 *
 * Without those, Vercel marks the deploy READY and still returns
 * x-vercel-error: NOT_FOUND for every path (including static assets).
 *
 * This script is idempotent: it only writes missing files after `vite build`.
 */
import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = join(root, ".vercel", "output");
const configPath = join(outputDir, "config.json");
const funcDir = join(outputDir, "functions", "__server.func");
const vcConfigPath = join(funcDir, ".vc-config.json");
const serverEntry = join(funcDir, "index.mjs");

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(outputDir))) {
    console.log("[vercel-output-fix] no .vercel/output — skip (not a Vercel Nitro build)");
    return;
  }

  if (!(await exists(serverEntry))) {
    console.warn(
      "[vercel-output-fix] .vercel/output exists but functions/__server.func/index.mjs is missing — skip",
    );
    return;
  }

  let wrote = false;

  if (!(await exists(vcConfigPath))) {
    await mkdir(funcDir, { recursive: true });
    const vcConfig = {
      runtime: "nodejs24.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
      supportsResponseStreaming: true,
    };
    await writeFile(vcConfigPath, JSON.stringify(vcConfig, null, 2) + "\n");
    console.log("[vercel-output-fix] wrote functions/__server.func/.vc-config.json");
    wrote = true;
  } else {
    console.log("[vercel-output-fix] .vc-config.json already present");
  }

  if (!(await exists(configPath))) {
    // Mirrors Nitro's generateBuildConfig catch-all: serve static files first,
    // then route everything else to the Nitro server function at /__server.
    const config = {
      version: 3,
      framework: {
        name: "nitro",
        version: "3.0.260610-beta",
      },
      routes: [
        {
          src: "/assets/(.*)",
          headers: { "cache-control": "public,max-age=31536000,immutable" },
          continue: true,
        },
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/__server" },
      ],
    };
    await writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
    console.log("[vercel-output-fix] wrote config.json (filesystem + /__server catch-all)");
    wrote = true;
  } else {
    console.log("[vercel-output-fix] config.json already present");
  }

  if (!wrote) {
    console.log("[vercel-output-fix] Build Output API routing files already complete");
  }
}

main().catch((err) => {
  console.error("[vercel-output-fix] failed:", err);
  process.exit(1);
});
