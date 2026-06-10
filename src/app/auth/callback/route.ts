import { NextResponse, type NextRequest } from "next/server";
import { sanitizeNextPath } from "@/lib/safe-redirect";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        new URL("/login?error=auth_callback", requestUrl.origin),
      );
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
