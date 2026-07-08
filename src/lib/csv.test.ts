import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("joins headers and rows with CRLF and a trailing newline", () => {
    expect(toCsv(["a", "b"], [[1, 2]])).toBe("a,b\r\n1,2\r\n");
  });

  it("escapes quotes, commas, and newlines", () => {
    expect(toCsv(["note"], [['He said "go"'], ["one,two"], ["line\nbreak"]])).toBe(
      'note\r\n"He said ""go"""\r\n"one,two"\r\n"line\nbreak"\r\n',
    );
  });

  it("renders null and undefined as empty cells", () => {
    expect(toCsv(["a", "b", "c"], [[null, undefined, 0]])).toBe(
      "a,b,c\r\n,,0\r\n",
    );
  });
});
