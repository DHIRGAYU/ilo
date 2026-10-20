import type { SupabaseClient } from "@supabase/supabase-js";

export const LANGUAGES = ["English", "Hindi", "Marathi", "Bengali", "Tamil", "Malayalam"] as const;
export type GenderPref = "any" | "female" | "male";
export type Prefs = { preferred_languages: string[] | null; preferred_gender: GenderPref | null } | null;
type Rankable = { languages: string[]; gender: string | null; sort_order: number };

// A counsellor fits when they speak at least one chosen language (none chosen = any) and the gender choice allows them
export function matchesPrefs(c: Pick<Rankable, "languages" | "gender">, p: Prefs) {
  const langs = p?.preferred_languages ?? [];
  const langOk = langs.length === 0 || c.languages.some((l) => langs.includes(l));
  const genderOk = !p?.preferred_gender || p.preferred_gender === "any" || c.gender === p.preferred_gender;
  return langOk && genderOk;
}

// Best fits first, then the college's own ordering
export function rankCounsellors<T extends Rankable>(list: T[], p: Prefs): T[] {
  return [...list].sort((a, b) => Number(matchesPrefs(b, p)) - Number(matchesPrefs(a, p)) || a.sort_order - b.sort_order);
}

export async function getMyPrefs(supabase: SupabaseClient): Promise<Prefs> {
  const { data } = await supabase.from("profiles").select("preferred_languages, preferred_gender").maybeSingle();
  return (data as Prefs) ?? null;
}

// The counsellor who best fits this student's comfort preferences (row-level security keeps it to their own college)
export async function getMyCounsellor<T>(supabase: SupabaseClient, select: string): Promise<T | null> {
  const [{ data }, prefs] = await Promise.all([
    supabase.from("counsellors").select(`languages, gender, sort_order, ${select}`).order("sort_order"),
    getMyPrefs(supabase),
  ]);
  return (rankCounsellors((data ?? []) as unknown as Rankable[], prefs)[0] as unknown as T) ?? null;
}
