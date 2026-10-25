import { spawnSync } from "node:child_process";

// The client engine uses the libSQL adapter, so neither Rust binary is used.
// Prisma 6's generator still probes their paths before using its bundled WASM.
const command = process.platform === "win32" ? "prisma.cmd" : "prisma";
const result = spawnSync(`node_modules/.bin/${command}`, ["generate"], {
  stdio: "inherit",
  env: {
    ...process.env,
    PRISMA_SCHEMA_ENGINE_BINARY: process.execPath,
    PRISMA_QUERY_ENGINE_LIBRARY: process.execPath,
  },
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
