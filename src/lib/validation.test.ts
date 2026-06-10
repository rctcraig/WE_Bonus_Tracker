import { describe, expect, it } from "vitest";
import { isValidIsoDate } from "@/lib/validation";

describe("isValidIsoDate", () => {
  it("accepts real calendar dates", () => {
    expect(isValidIsoDate("2026-05-04")).toBe(true);
    expect(isValidIsoDate("2026-02-28")).toBe(true);
  });

  it("rejects malformed shapes", () => {
    expect(isValidIsoDate("2026-5-4")).toBe(false);
    expect(isValidIsoDate("05/04/2026")).toBe(false);
    expect(isValidIsoDate("")).toBe(false);
  });

  it("rejects shaped-but-impossible dates", () => {
    expect(isValidIsoDate("2026-13-40")).toBe(false);
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidIsoDate("2026-00-10")).toBe(false);
  });
});
