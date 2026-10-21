import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const description = requestUrl.searchParams.get("error_description") ?? "";
  const next = requestUrl.searchParams.get("next") ?? "/home";

  // Derive origin from Host headers to keep the LAN IP (e.g. 192.168.1.4:3000)
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? (request.url.startsWith("https") ? "https" : "http");
  const origin = host ? `${proto}://${host}` : requestUrl.origin;

  console.log("[Auth Callback] Request URL:", request.url, "| Host header:", host, "| Redirecting with origin:", origin);

  // Sign-up was refused: the email's domain isn't a registered college
  if (/college|database error saving new user/i.test(description)) {
    return NextResponse.redirect(`${origin}/login?error=not_registered`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : `/${next}`}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=signin_failed`);
}
