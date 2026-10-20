import { redirect } from "next/navigation";
import { LoginForm } from "@/components/counsellor/LoginForm";
import { getWorkspace } from "@/lib/counsellor-data";

export const metadata = { title: "Counsellor sign-in | Ilo", description: "Sign in to your Ilo counsellor workspace." };

export default async function CounsellorLoginPage() {
  if (await getWorkspace()) redirect("/counsellor");
  return <LoginForm />;
}
