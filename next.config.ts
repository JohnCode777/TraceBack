import type { NextConfig } from "next";

const nextConfig: NextConfig = { serverExternalPackages: ["@prisma/adapter-libsql", "@prisma/client", "libsql"] };

export default nextConfig;
