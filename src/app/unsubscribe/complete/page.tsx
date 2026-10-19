import Link from "next/link";
import { Card } from "@/components/ui/card";

export default async function UnsubscribeCompletePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const invalid = status === "invalid";
  return <main className="mx-auto flex min-h-screen max-w-xl items-center px-5 py-12"><Card className="w-full p-7 sm:p-10"><h1 className="text-3xl font-semibold">{invalid ? "Link unavailable" : "Unsubscribed"}</h1><p className="mt-4 leading-7 text-muted-foreground">{invalid ? "This unsubscribe link is invalid or has expired. Contact the sender through a trusted channel if you still need help." : "The address has been added to the sender workspace suppression list. No further campaign email should be sent to it."}</p><Link className="mt-8 inline-block text-sm text-primary" href="/">Return to PRIZM.DEV</Link></Card></main>;
}
