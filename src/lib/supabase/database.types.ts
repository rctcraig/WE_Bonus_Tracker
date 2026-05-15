export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      practices: {
        Row: {
          id: string;
          slug: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          user_id: string;
          practice_id: string;
          full_name: string;
          role: "admin" | "manager" | "doctor" | "leadership" | "staff";
          notifications_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          practice_id: string;
          full_name: string;
          role?: "admin" | "manager" | "doctor" | "leadership" | "staff";
          notifications_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      monthly_goals: {
        Row: {
          id: string;
          practice_id: string;
          month: string;
          s1p_goal: number;
          historical_adjusted_actual: number | null;
          official_s1p_actual: number | null;
          closed: boolean;
          profitability_status: "unknown" | "favorable" | "unfavorable";
          close_note: string | null;
          closed_at: string | null;
          closed_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          month: string;
          s1p_goal: number;
          historical_adjusted_actual?: number | null;
          official_s1p_actual?: number | null;
          closed?: boolean;
          profitability_status?: "unknown" | "favorable" | "unfavorable";
          close_note?: string | null;
          closed_at?: string | null;
          closed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["monthly_goals"]["Insert"]>;
        Relationships: [];
      };
      month_plans: {
        Row: {
          id: string;
          practice_id: string;
          month: string;
          avg_mth_doctor_day: number;
          avg_friday_doctor_day: number;
          planned_workday_count: number;
          setup_locked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          month: string;
          avg_mth_doctor_day?: number;
          avg_friday_doctor_day?: number;
          planned_workday_count: number;
          setup_locked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["month_plans"]["Insert"]>;
        Relationships: [];
      };
      schedule_days: {
        Row: {
          id: string;
          month_plan_id: string;
          work_date: string;
          day_type: "mth" | "friday";
          doctors: number;
          original_doctors: number;
          change_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          month_plan_id: string;
          work_date: string;
          day_type: "mth" | "friday";
          doctors: number;
          original_doctors: number;
          change_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["schedule_days"]["Insert"]>;
        Relationships: [];
      };
      production_entries: {
        Row: {
          id: string;
          practice_id: string;
          work_date: string;
          total_production: number;
          credit_adjustments: number;
          adjusted_production: number;
          note: string | null;
          entered_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          work_date: string;
          total_production: number;
          credit_adjustments?: number;
          note?: string | null;
          entered_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["production_entries"]["Insert"]
        >;
        Relationships: [];
      };
      bonus_tiers: {
        Row: {
          id: string;
          practice_id: string;
          threshold_pct: number;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          threshold_pct: number;
          amount: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bonus_tiers"]["Insert"]>;
        Relationships: [];
      };
      drive_for_nine_campaigns: {
        Row: {
          id: string;
          practice_id: string;
          month: string;
          active: boolean;
          qualification_pct: number;
          result:
            | "not_active"
            | "not_qualified"
            | "qualified_pending"
            | "won"
            | "not_selected";
          official_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          month: string;
          active?: boolean;
          qualification_pct?: number;
          result?:
            | "not_active"
            | "not_qualified"
            | "qualified_pending"
            | "won"
            | "not_selected";
          official_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["drive_for_nine_campaigns"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
