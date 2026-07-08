import { afterEach, describe, expect, it, vi } from "vitest";
import { buildQuarters, getActiveMonth } from "@/lib/data";
import type { MonthlyGoal } from "@/lib/types";

function goal(month: string, overrides: Partial<MonthlyGoal> = {}): MonthlyGoal {
  return {
    month,
    label: month,
    s1pGoal: 1000,
    closed: false,
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("getActiveMonth", () => {
  it("returns the current practice month when it is open", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T18:00:00Z"));

    const goals = [goal("2026-06"), goal("2026-07"), goal("2026-08")];

    expect(getActiveMonth(goals)).toBe("2026-07");
  });

  it("falls back to the first open month when the current month is closed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T18:00:00Z"));

    const goals = [
      goal("2026-06", { closed: true }),
      goal("2026-07", { closed: true }),
      goal("2026-08"),
    ];

    expect(getActiveMonth(goals)).toBe("2026-08");
  });

  it("falls back to the last goal month when every month is closed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-02-10T18:00:00Z"));

    const goals = [
      goal("2026-11", { closed: true }),
      goal("2026-12", { closed: true }),
    ];

    expect(getActiveMonth(goals)).toBe("2026-12");
  });

  it("returns the current practice month when no goals exist", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T18:00:00Z"));

    expect(getActiveMonth([])).toBe("2026-07");
  });

  it("resolves the month in Central time, not UTC", () => {
    vi.useFakeTimers();
    // 03:00 UTC on July 1 is still the evening of June 30 in Wichita.
    vi.setSystemTime(new Date("2026-07-01T03:00:00Z"));

    const goals = [goal("2026-06"), goal("2026-07")];

    expect(getActiveMonth(goals)).toBe("2026-06");
  });
});

describe("buildQuarters", () => {
  it("buckets a single year into unlabeled-year quarters", () => {
    const quarters = buildQuarters([
      goal("2026-01"),
      goal("2026-02"),
      goal("2026-03"),
      goal("2026-04"),
    ]);

    expect(quarters.map((quarter) => quarter.label)).toEqual(["Q1", "Q2"]);
    expect(quarters[0].months).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(quarters[1].months).toEqual(["2026-04"]);
  });

  it("adds the year to labels once a second year exists", () => {
    const quarters = buildQuarters([
      goal("2026-11"),
      goal("2026-12"),
      goal("2027-01"),
    ]);

    expect(quarters.map((quarter) => quarter.label)).toEqual([
      "Q4 2026",
      "Q1 2027",
    ]);
  });

  it("rolls up profitability: any unfavorable month taints the quarter", () => {
    const quarters = buildQuarters([
      goal("2026-01", { profitabilityStatus: "favorable" }),
      goal("2026-02", { profitabilityStatus: "unfavorable" }),
      goal("2026-03", { profitabilityStatus: "favorable" }),
    ]);

    expect(quarters[0].profitabilityStatus).toBe("unfavorable");
  });

  it("stays unknown until every month is marked favorable", () => {
    const mixed = buildQuarters([
      goal("2026-01", { profitabilityStatus: "favorable" }),
      goal("2026-02"),
      goal("2026-03", { profitabilityStatus: "favorable" }),
    ]);
    const allFavorable = buildQuarters([
      goal("2026-01", { profitabilityStatus: "favorable" }),
      goal("2026-02", { profitabilityStatus: "favorable" }),
      goal("2026-03", { profitabilityStatus: "favorable" }),
    ]);

    expect(mixed[0].profitabilityStatus).toBe("unknown");
    expect(allFavorable[0].profitabilityStatus).toBe("favorable");
  });
});
