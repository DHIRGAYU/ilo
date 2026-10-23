import { Lock } from "lucide-react";
import { Lavender } from "@/components/ui/Lavender";
import { Logo } from "@/components/ui/Logo";
import { SignInButton } from "@/components/SignInButton";

const MESSAGES: Record<string, string> = {
  not_registered: "Please sign in with your college email ID (it ends in .ac.in).",
  signin_failed: "Sign-in didn't finish. Please try again.",
};

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <main className="relative flex min-h-full flex-col justify-between px-5 pb-6 pt-10">
      <Lavender className="pointer-events-none absolute right-4 top-6 h-32 w-auto select-none" />

      <section className="mt-6">
        <Logo className="h-13 w-auto" />
        <h1 className="mt-2 font-display text-[2rem] leading-tight text-ilo-plum">Better Within.</h1>
        <p className="mt-4 max-w-[26ch] text-[0.925rem] leading-relaxed text-ilo-ink">
          Reach the counsellor who is already on your campus.
          <br />
          Encrypted end to end, from the first message.
        </p>
      </section>

      <div className="mt-8 space-y-5">
        <SignInButton initialError={error ? MESSAGES[error] ?? MESSAGES.signin_failed : undefined} />

        <div className="border-t border-ilo-plum/10 pt-3 text-[11px]">
          <p className="flex items-center gap-1.5 font-semibold text-ilo-ink">
            <Lock className="h-3 w-3 shrink-0" /> Your college sees that counselling happened.
          </p>
          <p className="ml-4 font-medium text-ilo-ink/60">Never who. Never what was said.</p>
        </div>
      </div>
    </main>
  );
}
