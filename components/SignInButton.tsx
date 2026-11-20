"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function SignInButton({ initialError }: { initialError?: string }) {
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    setBusy(true);
    setError(undefined);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    // A successful call leaves this page for Google. If we are still here, it failed.
    if (signInError) {
      setError(signInError.message);
      setBusy(false);
    }
  };

  return (
    <div className="w-full space-y-2">
      {error && (
        <p className="rounded-lg bg-ilo-crisis/10 p-2.5 text-center text-xs font-medium text-ilo-crisis">
          {error}
        </p>
      )}
      <p className="text-center text-xs text-ilo-ink/70">Use a college Google account ending in .ac.in. A personal Gmail is refused.</p>
      <Button
        onClick={handleSignIn}
        disabled={busy}
        className="h-11 w-full rounded-xl bg-gradient-to-b from-ilo-plum to-ilo-deep text-sm font-semibold text-white shadow-md hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ilo-plum focus-visible:ring-offset-2"
      >
        Continue with Google <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
