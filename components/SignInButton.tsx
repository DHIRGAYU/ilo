"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function SignInButton({ initialError }: { initialError?: string }) {
  const handleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="w-full space-y-2">
      {initialError && (
        <p className="rounded-lg bg-ilo-crisis/10 p-2.5 text-center text-xs font-medium text-ilo-crisis">
          {initialError}
        </p>
      )}
      <Button
        onClick={handleSignIn}
        className="h-11 w-full rounded-xl bg-gradient-to-b from-ilo-plum to-ilo-deep text-sm font-semibold text-white shadow-md hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ilo-plum focus-visible:ring-offset-2"
      >
        Continue with Google <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
