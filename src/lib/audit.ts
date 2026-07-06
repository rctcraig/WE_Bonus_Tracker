import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

type AuditEventInput = {
  practiceId: string;
  actorUserId: string;
  eventType: string;
  tableName: string;
  recordId?: string;
  reason?: string;
  beforeData?: Json;
  afterData?: Json;
};

// Best-effort: an audit insert failure should never roll back or block the
// change it documents, so errors are logged instead of thrown.
export async function logAuditEvent(event: AuditEventInput) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("audit_events").insert({
    practice_id: event.practiceId,
    actor_user_id: event.actorUserId,
    event_type: event.eventType,
    table_name: event.tableName,
    record_id: event.recordId ?? null,
    reason: event.reason ?? null,
    before_data: event.beforeData ?? null,
    after_data: event.afterData ?? null,
  });

  if (error) {
    console.error(`Audit event ${event.eventType} failed: ${error.message}`);
  }
}
