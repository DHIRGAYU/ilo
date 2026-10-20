import { ProfileView } from "@/components/profile/ProfileView";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name, institution:institutions(name)").maybeSingle();

  const fullName: string = profile?.full_name ?? (user?.user_metadata?.full_name as string | undefined) ?? "";
  const words = fullName.split(" ").filter(Boolean);
  const firstName = words[0] ?? "there";
  const initials = (words.length > 1 ? words[0][0] + words[1][0] : firstName.slice(0, 2)).toUpperCase();
  const college = (profile?.institution as unknown as { name: string } | null)?.name ?? "your college";

  return <ProfileView firstName={firstName} initials={initials} college={college} />;
}
