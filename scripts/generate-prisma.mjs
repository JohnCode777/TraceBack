import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// The client engine uses the libSQL adapter, so neither Rust binary is used.
// Prisma's generator still probes their paths before using its bundled WASM.
const cli = fileURLToPath(import.meta.resolve("prisma/build/index.js"));
const result = spawnSync(process.execPath, [cli, "generate"], {
  stdio: "inherit",
  env: {
    ...process.env,
    PRISMA_SCHEMA_ENGINE_BINARY: process.execPath,
    PRISMA_QUERY_ENGINE_LIBRARY: process.execPath,
  },
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
