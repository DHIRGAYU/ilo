import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { missingSupabaseAction } from "@/lib/security/gate";
import { contentSecurityPolicy } from "@/lib/security/headers.mjs";

// Student app pages that need a signed-in user
const STUDENT_PROTECTED = ["/home", "/sessions", "/learn", "/profile", "/messages", "/self-check", "/feelings", "/preferences", "/request"];

export async function updateSession(request: NextRequest) {
  const production = process.env.NODE_ENV === "production";
  const nonce = production ? Buffer.from(crypto.randomUUID()).toString("base64") : null;
  const csp = nonce
    ? contentSecurityPolicy({ supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, production: true, nonce })
    : null;

  const next = () => {
    if (!csp || !nonce) return NextResponse.next({ request });
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", csp);
    const response = NextResponse.next({ request: { headers } });
    response.headers.set("Content-Security-Policy", csp);
    return response;
  };

  const stamp = (response: NextResponse) => {
    if (csp) response.headers.set("Content-Security-Policy", csp);
    return response;
  };

  let response = next();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const action = missingSupabaseAction(request.nextUrl.pathname);
    if (action === "allow") return response;
    if (action === "unavailable") return stamp(new NextResponse(null, { status: 503 }));
    const url = request.nextUrl.clone();
    url.pathname = action === "counsellor-login" ? "/counsellor/login" : "/login";
    url.search = "";
    return stamp(NextResponse.redirect(url));
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = next();
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // getClaims() validates the token; never trust getSession() on the server
  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims;
  const path = request.nextUrl.pathname;

  const isStudentPage = STUDENT_PROTECTED.some((p) => path === p || path.startsWith(p + "/"));
  // Everything under /counsellor needs a login except the login page itself.
  // (Whether the person really is a counsellor is checked inside the workspace layout.)
  const isCounsellorPage = (path === "/counsellor" || path.startsWith("/counsellor/")) && !path.startsWith("/counsellor/login");

  const redirectTo = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = "";
    return stamp(NextResponse.redirect(url));
  };

  if (!signedIn && isCounsellorPage) return redirectTo("/counsellor/login");
  if (!signedIn && isStudentPage) return redirectTo("/login");
  if (signedIn && path === "/login") return redirectTo("/home");
  return stamp(response);
}

