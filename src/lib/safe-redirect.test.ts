import { describe, expect, it } from "vitest";
import { sanitizeNextPath } from "@/lib/safe-redirect";

describe("sanitizeNextPath", () => {
  it("keeps a plain in-app path", () => {
    expect(sanitizeNextPath("/entry")).toBe("/entry");
  });

  it("preserves the query string", () => {
    expect(sanitizeNextPath("/entry?month=2026-05")).toBe(
      "/entry?month=2026-05",
    );
  });

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeNextPath("//evil.com")).toBe("/");
  });

  it("rejects backslash authority bypass", () => {
    // Browsers treat "\" as "/" in the URL authority, so "/\evil.com"
    // resolves off-origin even though it starts with a single slash.
    expect(sanitizeNextPath("/\\evil.com")).toBe("/");
    expect(sanitizeNextPath("/\\/evil.com")).toBe("/");
  });

  it("rejects absolute URLs", () => {
    expect(sanitizeNextPath("https://evil.com")).toBe("/");
  });

  it("falls back to root for empty or missing input", () => {
    expect(sanitizeNextPath(null)).toBe("/");
    expect(sanitizeNextPath(undefined)).toBe("/");
    expect(sanitizeNextPath("")).toBe("/");
  });
});
