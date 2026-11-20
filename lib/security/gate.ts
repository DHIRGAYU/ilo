// What to do with a request when Supabase is not configured. Marketing pages still render.
// Signed-in areas redirect to the right login. API and model files are refused.

const STUDENT = ["/home", "/sessions", "/learn", "/profile", "/messages", "/self-check", "/feelings", "/preferences", "/request"];

export type MissingSupabaseAction = "allow" | "student-login" | "counsellor-login" | "unavailable";

const under = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + "/");

export function missingSupabaseAction(path: string): MissingSupabaseAction {
  if (under(path, "/api") || under(path, "/models")) return "unavailable";
  if (under(path, "/counsellor/login")) return "allow";
  if (under(path, "/counsellor")) return "counsellor-login";
  if (STUDENT.some((prefix) => under(path, prefix))) return "student-login";
  return "allow";
}
