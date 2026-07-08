import webpush from "web-push";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

// Web push is optional infrastructure: without VAPID keys the app runs
// normally and the notification UI explains that it is not configured.
export function isPushConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
  );
}

function configureWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@wichitaendo.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

type StoredSubscription = {
  id: string;
  endpoint: string;
  subscription: webpush.PushSubscription;
};

async function sendToSubscriptions(
  stored: StoredSubscription[],
  payload: PushPayload,
) {
  const supabase = getSupabaseAdminClient();
  let sent = 0;

  await Promise.all(
    stored.map(async (item) => {
      try {
        await webpush.sendNotification(
          item.subscription,
          JSON.stringify(payload),
        );
        sent += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;

        // 404/410 mean the browser dropped the subscription; keep the table
        // clean so future sends do not retry dead endpoints forever.
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", item.id);
        } else {
          console.error(
            `Push to ${item.endpoint.slice(0, 48)}... failed: ${String(error)}`,
          );
        }
      }
    }),
  );

  return sent;
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!isPushConfigured()) {
    return { sent: 0 };
  }

  configureWebPush();

  const supabase = getSupabaseAdminClient();
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id,endpoint,subscription")
    .eq("user_id", userId);

  if (error) {
    console.error(`Push subscription lookup failed: ${error.message}`);
    return { sent: 0 };
  }

  const stored = (subscriptions ?? []).map((row) => ({
    id: String(row.id),
    endpoint: String(row.endpoint),
    subscription: row.subscription as unknown as webpush.PushSubscription,
  }));

  return { sent: await sendToSubscriptions(stored, payload) };
}

export async function sendPushToPractice(
  practiceId: string,
  payload: PushPayload,
  options: { includeStaff?: boolean } = {},
) {
  if (!isPushConfigured()) {
    return { sent: 0, recipients: 0 };
  }

  configureWebPush();

  const supabase = getSupabaseAdminClient();
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("user_id,role,notifications_enabled")
    .eq("practice_id", practiceId)
    .eq("notifications_enabled", true);

  if (profilesError) {
    console.error(`Push recipient lookup failed: ${profilesError.message}`);
    return { sent: 0, recipients: 0 };
  }

  const recipientIds = (profiles ?? [])
    .filter((profile) => options.includeStaff || profile.role !== "staff")
    .map((profile) => profile.user_id);

  if (recipientIds.length === 0) {
    return { sent: 0, recipients: 0 };
  }

  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from("push_subscriptions")
    .select("id,endpoint,subscription")
    .in("user_id", recipientIds);

  if (subscriptionsError) {
    console.error(`Push subscription lookup failed: ${subscriptionsError.message}`);
    return { sent: 0, recipients: recipientIds.length };
  }

  const stored = (subscriptions ?? []).map((row) => ({
    id: String(row.id),
    endpoint: String(row.endpoint),
    subscription: row.subscription as unknown as webpush.PushSubscription,
  }));
  const sent = await sendToSubscriptions(stored, payload);

  return { sent, recipients: recipientIds.length };
}
