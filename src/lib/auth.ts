import { cache } from "react";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export type CurrentProfile = {
  userId: string;
  email: string | null;
  fullName: string;
  role: Role;
  notificationsEnabled: boolean;
  practiceId: string;
};

export const getCurrentProfile = cache(async () => {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const admin = getSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("practice_id,full_name,role,notifications_enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !profile) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: profile.full_name,
    role: profile.role as Role,
    notificationsEnabled: profile.notifications_enabled,
    practiceId: profile.practice_id,
  } satisfies CurrentProfile;
});

export async function requireCurrentProfile() {
  const profile = await getCurrentProfile();

  if (profile) {
    return profile;
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/login?error=profile" : "/login");
}
