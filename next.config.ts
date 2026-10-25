import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/adapter-libsql",
    "@prisma/client",
    "@libsql/client",
    "libsql",
  ],
};

export default nextConfig;
