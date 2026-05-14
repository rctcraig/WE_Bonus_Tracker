import type {
  AppUser,
  BonusTier,
  DriveForNineCampaign,
  MonthPlan,
  MonthlyGoal,
  ProductionEntry,
  Quarter,
} from "@/lib/types";

export const practice = {
  id: "wichita-endodontics",
  name: "Wichita Endodontics",
  shortName: "WE",
};

export const bonusTiers: BonusTier[] = [
  { thresholdPct: 97, amount: 50 },
  { thresholdPct: 100, amount: 125 },
  { thresholdPct: 103, amount: 150 },
  { thresholdPct: 106, amount: 200 },
  { thresholdPct: 109, amount: 500 },
];

export const monthlyGoals: MonthlyGoal[] = [
  {
    month: "2026-01",
    label: "January",
    s1pGoal: 940077.4,
    closed: true,
    officialS1PActual: 961400.4,
    historicalAdjustedActual: 942379.07,
  },
  {
    month: "2026-02",
    label: "February",
    s1pGoal: 862853.09,
    closed: true,
    officialS1PActual: 936157.98,
    historicalAdjustedActual: 947129,
  },
  {
    month: "2026-03",
    label: "March",
    s1pGoal: 838753.3,
    closed: true,
    officialS1PActual: 885354.52,
    historicalAdjustedActual: 879208.13,
  },
  {
    month: "2026-04",
    label: "April",
    s1pGoal: 816368.27,
    closed: true,
    historicalAdjustedActual: 975704.35,
  },
  {
    month: "2026-05",
    label: "May",
    s1pGoal: 936583.05,
    closed: false,
  },
  { month: "2026-06", label: "June", s1pGoal: 1108492.51, closed: false },
  { month: "2026-07", label: "July", s1pGoal: 1068755.66, closed: false },
  { month: "2026-08", label: "August", s1pGoal: 986617.27, closed: false },
  { month: "2026-09", label: "September", s1pGoal: 1008663.58, closed: false },
  { month: "2026-10", label: "October", s1pGoal: 1058726.62, closed: false },
  { month: "2026-11", label: "November", s1pGoal: 969370.5, closed: false },
  { month: "2026-12", label: "December", s1pGoal: 1047783.75, closed: false },
];

export const driveForNineCampaigns: DriveForNineCampaign[] = [
  {
    month: "2026-04",
    active: true,
    qualificationPct: 115,
    result: "won",
  },
  {
    month: "2026-06",
    active: true,
    qualificationPct: 115,
    result: "qualified_pending",
  },
  {
    month: "2026-08",
    active: true,
    qualificationPct: 115,
    result: "qualified_pending",
  },
  {
    month: "2026-10",
    active: true,
    qualificationPct: 115,
    result: "qualified_pending",
  },
  {
    month: "2026-12",
    active: true,
    qualificationPct: 115,
    result: "qualified_pending",
  },
];

export const quarters: Quarter[] = [
  {
    label: "Q1",
    months: ["2026-01", "2026-02", "2026-03"],
    profitabilityStatus: "favorable",
  },
  {
    label: "Q2",
    months: ["2026-04", "2026-05", "2026-06"],
    profitabilityStatus: "unknown",
  },
  {
    label: "Q3",
    months: ["2026-07", "2026-08", "2026-09"],
    profitabilityStatus: "unknown",
  },
  {
    label: "Q4",
    months: ["2026-10", "2026-11", "2026-12"],
    profitabilityStatus: "unknown",
  },
];

export const mayProductionEntries: ProductionEntry[] = [
  {
    date: "2026-05-01",
    totalProduction: 22555,
    creditAdjustments: 340,
  },
  {
    date: "2026-05-04",
    totalProduction: 64714,
    creditAdjustments: 24370,
  },
  {
    date: "2026-05-05",
    totalProduction: 73261,
    creditAdjustments: 16381,
  },
  {
    date: "2026-05-06",
    totalProduction: 71937,
    creditAdjustments: 22661,
  },
  {
    date: "2026-05-07",
    totalProduction: 73692,
    creditAdjustments: 8581,
  },
  {
    date: "2026-05-08",
    totalProduction: 19740,
    creditAdjustments: 0,
  },
  {
    date: "2026-05-11",
    totalProduction: 72488,
    creditAdjustments: 28736,
  },
  {
    date: "2026-05-12",
    totalProduction: 74538,
    creditAdjustments: 10526,
  },
  {
    date: "2026-05-13",
    totalProduction: 68613,
    creditAdjustments: 7724,
  },
];

export const monthPlans: MonthPlan[] = [
  {
    month: "2026-05",
    avgMthDoctorDay: 10800,
    avgFridayDoctorDay: 5500,
    plannedProductionDates: [
      "2026-05-01",
      "2026-05-04",
      "2026-05-05",
      "2026-05-06",
      "2026-05-07",
      "2026-05-08",
      "2026-05-11",
      "2026-05-12",
      "2026-05-13",
      "2026-05-14",
      "2026-05-15",
      "2026-05-18",
      "2026-05-19",
      "2026-05-20",
      "2026-05-21",
      "2026-05-22",
      "2026-05-26",
      "2026-05-27",
      "2026-05-28",
      "2026-05-29",
    ],
    scheduledDays: [
      { date: "2026-05-01", dayType: "friday", doctors: 3 },
      { date: "2026-05-04", dayType: "mth", doctors: 6 },
      { date: "2026-05-05", dayType: "mth", doctors: 6 },
      { date: "2026-05-06", dayType: "mth", doctors: 6 },
      { date: "2026-05-07", dayType: "mth", doctors: 6 },
      { date: "2026-05-08", dayType: "friday", doctors: 3 },
      { date: "2026-05-11", dayType: "mth", doctors: 6 },
      { date: "2026-05-12", dayType: "mth", doctors: 6 },
      { date: "2026-05-13", dayType: "mth", doctors: 6 },
      { date: "2026-05-14", dayType: "mth", doctors: 6 },
      { date: "2026-05-15", dayType: "friday", doctors: 3 },
      { date: "2026-05-18", dayType: "mth", doctors: 6 },
      {
        date: "2026-05-19",
        dayType: "mth",
        doctors: 5,
        originalDoctors: 6,
        changeReason: "Doctor out",
      },
      { date: "2026-05-20", dayType: "mth", doctors: 6 },
      { date: "2026-05-21", dayType: "mth", doctors: 6 },
      { date: "2026-05-22", dayType: "friday", doctors: 3 },
      { date: "2026-05-26", dayType: "mth", doctors: 6 },
      { date: "2026-05-27", dayType: "mth", doctors: 6 },
      { date: "2026-05-28", dayType: "mth", doctors: 6 },
      { date: "2026-05-29", dayType: "friday", doctors: 3 },
    ],
  },
];

export const users: AppUser[] = [
  { name: "Craig", role: "admin", notificationEligible: true },
  { name: "Office Manager", role: "manager", notificationEligible: true },
  { name: "Doctor Team", role: "doctor", notificationEligible: true },
  { name: "Leadership", role: "leadership", notificationEligible: true },
  { name: "Staff", role: "staff", notificationEligible: false },
];
