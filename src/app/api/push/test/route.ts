import { getCurrentProfile } from "@/lib/auth";
import { isPushConfigured, sendPushToUser } from "@/lib/push";

export async function POST() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return Response.json({ ok: false, message: "Sign in first." }, { status: 401 });
  }

  if (!isPushConfigured()) {
    return Response.json(
      { ok: false, message: "Push notifications are not configured yet." },
      { status: 503 },
    );
  }

  const { sent } = await sendPushToUser(profile.userId, {
    title: "WE Bonus Tracker",
    body: "Test notification - this device is set up.",
    url: "/",
  });

  return Response.json({
    ok: sent > 0,
    message:
      sent > 0
        ? `Sent to ${sent} device${sent === 1 ? "" : "s"}.`
        : "No subscribed devices found for your account.",
  });
}
