import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const description = searchParams.get("error_description") ?? "";

  // Sign-up was refused: the email's domain isn't a registered college
  if (/college|database error saving new user/i.test(description)) {
    return NextResponse.redirect(`${origin}/login?error=not_registered`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host"); // set by Vercel
      const base = process.env.NODE_ENV !== "development" && forwardedHost ? `https://${forwardedHost}` : origin;
      return NextResponse.redirect(`${base}/home`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=signin_failed`);
}
