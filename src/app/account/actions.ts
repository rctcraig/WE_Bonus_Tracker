"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function changeOwnPassword(password: string) {
  if (password.length < 8) {
    return { ok: false, message: "Use at least 8 characters." };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, message: "Sign in again before changing a password." };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "Password updated." };
}
