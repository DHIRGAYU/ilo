import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/counsellor/WorkspaceShell";
import { CallProvider } from "@/components/call/CallProvider";
import { getWorkspace } from "@/lib/counsellor-data";

// Every page in the counsellor workspace passes through this check:
// signed in AND linked to a counsellor profile, otherwise back to the counsellor sign-in.
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const ws = await getWorkspace();
  if (!ws) redirect("/counsellor/login");

  return (
    <CallProvider role="counsellor">
      <WorkspaceShell
        fullName={ws.me.fullName}
        initials={ws.me.initials}
        college={ws.college}
        badges={{ requests: ws.dash.triage, inbox: ws.dash.unread }}
      >
        {children}
      </WorkspaceShell>
    </CallProvider>
  );
}

