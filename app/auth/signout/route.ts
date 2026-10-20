import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  // Send the student back to the welcome (sign-in) screen
  const response = NextResponse.redirect(new URL("/login", request.url), { status: 303 });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        // Clear the login cookies on the redirect response itself, so the next page sees a signed-out user
        setAll: (list) => list.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      },
    }
  );

  // Signs out this device only, matching the "on this device" wording on the Profile screen
  await supabase.auth.signOut({ scope: "local" });
  return response;
}