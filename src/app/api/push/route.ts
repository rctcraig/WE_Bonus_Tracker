import { getCurrentProfile } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

type SubscribeBody = {
  subscription?: {
    endpoint?: unknown;
    keys?: unknown;
  };
};

export async function POST(request: Request) {
  const profile = await getCurrentProfile();

  if (!profile) {
    return Response.json({ ok: false, message: "Sign in first." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as SubscribeBody | null;
  const subscription = body?.subscription;

  if (
    !subscription ||
    typeof subscription.endpoint !== "string" ||
    !subscription.keys
  ) {
    return Response.json(
      { ok: false, message: "A push subscription is required." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: profile.userId,
      endpoint: subscription.endpoint,
      subscription: subscription as Json,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return Response.json({ ok: false, message: error.message }, { status: 500 });
  }

  // Subscribing a device is an explicit opt-in, so flip the profile flag on.
  await supabase
    .from("profiles")
    .update({ notifications_enabled: true })
    .eq("user_id", profile.userId);

  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const profile = await getCurrentProfile();

  if (!profile) {
    return Response.json({ ok: false, message: "Sign in first." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    endpoint?: unknown;
  } | null;

  if (!body || typeof body.endpoint !== "string") {
    return Response.json(
      { ok: false, message: "An endpoint is required." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", profile.userId)
    .eq("endpoint", body.endpoint);

  if (error) {
    return Response.json({ ok: false, message: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
