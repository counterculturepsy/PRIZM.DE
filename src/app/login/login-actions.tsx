"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function LoginActions({ providers }: { providers: readonly ("github" | "google")[] }) {
  if (providers.length === 0) {
    return <p className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning">No OAuth provider is configured. Add one complete provider pair to the server environment.</p>;
  }

  return (
    <div className="grid gap-3">
      {providers.map((provider) => (
        <Button className="w-full" key={provider} onClick={() => void signIn(provider, { callbackUrl: "/app" })} variant="secondary">
          Continue with {provider === "github" ? "GitHub" : "Google"}
        </Button>
      ))}
    </div>
  );
}
