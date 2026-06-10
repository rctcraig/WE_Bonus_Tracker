import { describe, expect, it } from "vitest";
import {
  adjustedProduction,
  nextTierForPercent,
  summarizeDriveForNine,
  summarizeMonth,
  tierForPercent,
} from "@/lib/bonus-calculations";
import type {
  BonusTier,
  DriveForNineCampaign,
  MonthPlan,
  MonthlyGoal,
} from "@/lib/types";

const tiers: BonusTier[] = [
  { thresholdPct: 97, amount: 50 },
  { thresholdPct: 100, amount: 125 },
  { thresholdPct: 103, amount: 150 },
  { thresholdPct: 106, amount: 200 },
  { thresholdPct: 109, amount: 500 },
];

function goal(overrides: Partial<MonthlyGoal> = {}): MonthlyGoal {
  return {
    month: "2026-05",
    label: "May",
    s1pGoal: 100000,
    closed: false,
    ...overrides,
  };
}

describe("adjustedProduction", () => {
  it("subtracts credit adjustments from total production", () => {
    expect(
      adjustedProduction({
        date: "2026-05-04",
        totalProduction: 1000,
        creditAdjustments: 250,
      }),
    ).toBe(750);
  });
});

describe("tierForPercent", () => {
  it("is inclusive at the exact threshold", () => {
    expect(tierForPercent(tiers, 97)?.amount).toBe(50);
    expect(tierForPercent(tiers, 100)?.amount).toBe(125);
  });

  it("returns the highest tier the percent clears", () => {
    expect(tierForPercent(tiers, 110)?.amount).toBe(500);
    expect(tierForPercent(tiers, 104.5)?.amount).toBe(150);
  });

  it("returns undefined below the lowest threshold", () => {
    expect(tierForPercent(tiers, 96.99)).toBeUndefined();
  });
});

describe("nextTierForPercent", () => {
  it("returns the next threshold strictly above the current percent", () => {
    expect(nextTierForPercent(tiers, 100)?.thresholdPct).toBe(103);
    expect(nextTierForPercent(tiers, 96)?.thresholdPct).toBe(97);
  });

  it("returns undefined once the top tier is reached", () => {
    expect(nextTierForPercent(tiers, 109)).toBeUndefined();
  });
});

describe("summarizeMonth", () => {
  it("totals adjusted production for an open month with no plan", () => {
    const result = summarizeMonth(goal(), undefined, [
      { date: "2026-05-04", totalProduction: 60000, creditAdjustments: 0 },
      { date: "2026-05-05", totalProduction: 50000, creditAdjustments: 10000 },
    ]);

    expect(result.actual).toBe(100000);
    expect(result.pctOfGoal).toBe(100);
    expect(result.forecast).toBe(100000);
  });

  it("freezes the forecast at actual for a closed month", () => {
    const plan: MonthPlan = {
      month: "2026-05",
      plannedWorkdayCount: 2,
      plannedProductionDates: ["2026-05-04", "2026-05-05"],
      avgMthDoctorDay: 20000,
      avgFridayDoctorDay: 10000,
      scheduledDays: [
        { date: "2026-05-04", dayType: "mth", doctors: 1 },
        { date: "2026-05-05", dayType: "mth", doctors: 1 },
      ],
    };

    const result = summarizeMonth(goal({ closed: true }), plan, [
      { date: "2026-05-04", totalProduction: 30000, creditAdjustments: 0 },
    ]);

    // Closed: no remaining-schedule expectation should inflate the forecast.
    expect(result.forecast).toBe(result.actual);
  });

  it("guards against a zero goal", () => {
    const result = summarizeMonth(goal({ s1pGoal: 0 }), undefined, []);
    expect(result.pctOfGoal).toBe(0);
  });
});

describe("summarizeDriveForNine", () => {
  const campaign: DriveForNineCampaign = {
    month: "2026-04",
    active: true,
    qualificationPct: 115,
    result: "qualified_pending",
  };

  it("marks qualified once actual clears the threshold", () => {
    const summary = summarizeMonth(goal({ s1pGoal: 100000 }), undefined, [
      { date: "2026-04-10", totalProduction: 120000, creditAdjustments: 0 },
    ]);
    const result = summarizeDriveForNine(campaign, summary);

    expect(result.threshold).toBeCloseTo(115000, 4);
    expect(result.qualified).toBe(true);
    expect(result.toQualify).toBe(0);
  });

  it("reports the gap remaining when below the threshold", () => {
    const summary = summarizeMonth(goal({ s1pGoal: 100000 }), undefined, [
      { date: "2026-04-10", totalProduction: 100000, creditAdjustments: 0 },
    ]);
    const result = summarizeDriveForNine(campaign, summary);

    expect(result.qualified).toBe(false);
    expect(result.toQualify).toBeCloseTo(15000, 4);
  });

  it("is inactive for a campaign that is not running", () => {
    const summary = summarizeMonth(goal(), undefined, []);
    const result = summarizeDriveForNine(
      { ...campaign, active: false },
      summary,
    );

    expect(result.shortLabel).toBe("Not active");
  });
});
