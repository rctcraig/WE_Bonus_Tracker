export type Role = "admin" | "manager" | "doctor" | "leadership" | "staff";

export type DayType = "mth" | "friday";

export type ProfitabilityStatus = "unknown" | "favorable" | "unfavorable";

export type DriveForNineResult =
  | "not_active"
  | "not_qualified"
  | "qualified_pending"
  | "won"
  | "not_selected";

export type BonusTier = {
  thresholdPct: number;
  amount: number;
};

export type MonthlyGoal = {
  month: string;
  label: string;
  s1pGoal: number;
  closed: boolean;
  profitabilityStatus?: ProfitabilityStatus;
  officialS1PActual?: number;
  historicalAdjustedActual?: number;
};

export type DriveForNineCampaign = {
  month: string;
  active: boolean;
  qualificationPct: number;
  result: DriveForNineResult;
};

export type ScheduleDay = {
  date: string;
  dayType: DayType;
  doctors: number;
  originalDoctors?: number;
  changeReason?: string;
};

export type MonthPlan = {
  month: string;
  plannedProductionDates: string[];
  avgMthDoctorDay: number;
  avgFridayDoctorDay: number;
  scheduledDays: ScheduleDay[];
};

export type ProductionEntry = {
  date: string;
  totalProduction: number;
  creditAdjustments: number;
  note?: string;
};

export type Quarter = {
  label: string;
  months: string[];
  profitabilityStatus: ProfitabilityStatus;
};

export type AppUser = {
  name: string;
  role: Role;
  notificationEligible: boolean;
};
