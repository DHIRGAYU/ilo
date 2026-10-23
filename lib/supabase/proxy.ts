import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Student app pages that need a signed-in user
const STUDENT_PROTECTED = ["/home", "/sessions", "/learn", "/profile", "/messages", "/self-check", "/feelings", "/preferences", "/request"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
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
    return NextResponse.redirect(url);
  };

  if (!signedIn && isCounsellorPage) return redirectTo("/counsellor/login");
  if (!signedIn && isStudentPage) return redirectTo("/login");
  if (signedIn && path === "/login") return redirectTo("/home");
  return response;
}

