import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Card } from "@/components/ui/card";
import { getServerEnv } from "@/config/env";
import { LoginActions } from "./login-actions";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default function LoginPage() {
  const env = getServerEnv();
  const providers: ("github" | "google")[] = [];
  if (env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET) providers.push("github");
  if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) providers.push("google");

  return (
    <main className="page-grid grid min-h-screen place-items-center px-6 py-12">
      <Card className="w-full max-w-md p-7 sm:p-9">
        <Logo />
        <h1 className="mt-10 text-3xl font-semibold tracking-tight">Sign in to your workspace</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Sign in through a configured OAuth provider to access your isolated workspace, opportunity intelligence, and CRM records.</p>
        <div className="mt-8"><LoginActions providers={providers} /></div>
        <p className="mt-8 text-xs leading-5 text-muted-foreground">By continuing, you agree to use business data responsibly and review generated material before external use.</p>
        <Link className="mt-6 inline-block text-sm text-primary hover:underline" href="/">Back to overview</Link>
      </Card>
    </main>
  );
}
