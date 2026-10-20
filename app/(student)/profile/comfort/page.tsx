import { ComfortView, type ComfortCounsellor } from "@/components/profile/ComfortView";
import { getMyPrefs } from "@/lib/counsellors";
import { createClient } from "@/lib/supabase/server";

export default async function ComfortPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Row-level security limits this to counsellors at the student's own college
  const [{ data }, prefs] = await Promise.all([
    supabase
      .from("counsellors")
      .select("id, display_name, credentials, designation, room, bio, gender, languages, sort_order")
      .order("sort_order"),
    getMyPrefs(supabase),
  ]);

  return (
    <ComfortView
      userId={user?.id ?? ""}
      counsellors={(data ?? []) as ComfortCounsellor[]}
      initialLanguages={prefs?.preferred_languages ?? []}
      initialGender={prefs?.preferred_gender ?? "any"}
    />
  );
}
