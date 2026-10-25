import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/adapter-libsql",
    "@prisma/client",
    "@libsql/client",
    "libsql",
    "pdfkit",
  ],
};

export default nextConfig;
