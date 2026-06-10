"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { practiceSlug } from "@/lib/data";
import { assignableRolesFor, canInvite } from "@/lib/roles";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Role } from "@/lib/types";

type InviteUserInput = {
  email: string;
  fullName: string;
  role: Role;
};

function getAppUrl() {
  const value =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000";

  const withProtocol = value.startsWith("http") ? value : `https://${value}`;
  return withProtocol.replace(/\/$/, "");
}

function canManageTargetRole(currentRole: Role, targetRole: Role) {
  if (currentRole === "admin") {
    return true;
  }

  return assignableRolesFor(currentRole).includes(targetRole);
}

export async function inviteUser(input: InviteUserInput) {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile || !canInvite(currentProfile.role)) {
    return { ok: false, message: "You do not have permission to invite users." };
  }

  const allowedRoles = assignableRolesFor(currentProfile.role);

  if (!allowedRoles.includes(input.role)) {
    return { ok: false, message: "That role cannot be invited by your account." };
  }

  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim() || email;

  if (!email || !email.includes("@")) {
    return { ok: false, message: "A valid email is required." };
  }

  const admin = getSupabaseAdminClient();
  const { data: practice, error: practiceError } = await admin
    .from("practices")
    .select("id")
    .eq("slug", practiceSlug)
    .single();

  if (practiceError) {
    return { ok: false, message: practiceError.message };
  }

  const redirectTo = `${getAppUrl()}/auth/set-password`;
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      full_name: fullName,
      role: input.role,
      practice_slug: practiceSlug,
    },
  });

  if (error || !data.user) {
    return { ok: false, message: error?.message ?? "Invite failed." };
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      user_id: data.user.id,
      practice_id: practice.id,
      full_name: fullName,
      role: input.role,
      notifications_enabled: input.role !== "staff",
    },
    { onConflict: "user_id" },
  );

  if (profileError) {
    return { ok: false, message: profileError.message };
  }

  revalidatePath("/admin");

  return { ok: true, message: `Invite sent to ${email}.` };
}

export async function sendSetupLink(userId: string) {
  const currentProfile = await getCurrentProfile();

  if (!currentProfile || !canInvite(currentProfile.role)) {
    return {
      ok: false,
      message: "You do not have permission to send setup links.",
    };
  }

  const admin = getSupabaseAdminClient();
  const { data: targetProfile, error: targetProfileError } = await admin
    .from("profiles")
    .select("user_id,practice_id,full_name,role,notifications_enabled")
    .eq("user_id", userId)
    .eq("practice_id", currentProfile.practiceId)
    .single();

  if (targetProfileError || !targetProfile) {
    return { ok: false, message: "User profile was not found." };
  }

  const targetRole = targetProfile.role as Role;

  if (!canManageTargetRole(currentProfile.role, targetRole)) {
    return {
      ok: false,
      message: "Your role cannot send a setup link for that user.",
    };
  }

  const { data: authUserData, error: authUserError } =
    await admin.auth.admin.getUserById(userId);

  if (authUserError || !authUserData.user?.email) {
    return { ok: false, message: "Auth user email was not found." };
  }

  const email = authUserData.user.email;
  const redirectTo = `${getAppUrl()}/auth/set-password`;

  // A recovery link sends the user to the set-password flow whether or not they
  // have confirmed their invite yet. This intentionally avoids deleting and
  // re-creating the auth user (and its cascading profile row), which could
  // permanently destroy the account if the follow-up invite failed.
  const { error } = await admin.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin");

  return {
    ok: true,
    message: `Password setup link sent to ${email}.`,
  };
}

export async function signOut() {
  const supabase = await import("@/lib/supabase/server").then((module) =>
    module.getSupabaseServerClient(),
  );
  await supabase.auth.signOut();
  revalidatePath("/");
}
