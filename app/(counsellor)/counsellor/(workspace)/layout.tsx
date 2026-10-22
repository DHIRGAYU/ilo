import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/counsellor/WorkspaceShell";
import { getWorkspace } from "@/lib/counsellor-data";
import { E2EEProvider } from "@/components/e2ee/E2EEProvider";

// Every page in the counsellor workspace passes through this check:
// signed in AND linked to a counsellor profile, otherwise back to the counsellor sign-in.
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const ws = await getWorkspace();
  if (!ws) redirect("/counsellor/login");

  return (
    <E2EEProvider userId={ws.userId}>

    <WorkspaceShell
      fullName={ws.me.fullName}
      initials={ws.me.initials}
      college={ws.college}
      badges={{ requests: ws.dash.triage, inbox: ws.dash.unread }}
      >
      {children}
    </WorkspaceShell>
      </E2EEProvider>
  );
}
