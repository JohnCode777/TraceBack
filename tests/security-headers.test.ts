import { describe, expect, it } from "vitest";
import config from "../next.config";

describe("global security headers", () => {
  it("covers every route and restricts framing, MIME sniffing and browser permissions", async () => {
    const entries = await config.headers!();
    expect(entries).toHaveLength(1);
    expect(entries[0].source).toBe("/:path*");
    const headers = new Map(
      entries[0].headers.map(({ key, value }) => [key, value]),
    );
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Strict-Transport-Security")).toContain("max-age=");
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
    expect(headers.get("Content-Security-Policy")).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers.get("Content-Security-Policy")).toContain(
      "object-src 'none'",
    );
  });
});
