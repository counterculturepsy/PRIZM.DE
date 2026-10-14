import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { ProfileForm } from "@/components/forms/profile-form";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/server/auth/session";
import { getDatabase } from "@/server/db";
import { users } from "@/server/db/schema";

export const metadata: Metadata = { title: "Profile settings" };

export default async function ProfileSettingsPage() {
  const session = await requireSession();
  const [user] = await getDatabase().select({ name: users.name, email: users.email, jobTitle: users.jobTitle }).from(users).where(eq(users.id, session.user.id)).limit(1);
  return <section><h2 className="text-xl font-semibold">Profile</h2><p className="mt-2 text-sm text-muted-foreground">Personal details visible to your workspace team.</p><Card className="mt-6 max-w-2xl p-6"><ProfileForm email={user?.email ?? session.user.email ?? ""} jobTitle={user?.jobTitle ?? ""} name={user?.name ?? session.user.name ?? ""} /></Card></section>;
}
