import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

describe("note Markdown rendering", () => {
  it("neutralises scripts, event handlers and unsafe links", () => {
    const html = renderToStaticMarkup(
      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
        {
          "<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[bad](javascript:alert(1)) **safe**"
        }
      </ReactMarkdown>,
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror=");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("<strong>safe</strong>");
  });
});
