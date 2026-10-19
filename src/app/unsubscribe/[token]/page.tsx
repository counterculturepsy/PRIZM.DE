import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { confirmUnsubscribe } from "./actions";

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (token.length < 50 || token.length > 200 || !/^[A-Za-z0-9._-]+$/.test(token)) notFound();
  const action = confirmUnsubscribe.bind(null, token);
  return <main className="mx-auto flex min-h-screen max-w-xl items-center px-5 py-12"><Card className="w-full p-7 sm:p-10"><Logo /><h1 className="mt-8 text-3xl font-semibold">Stop campaign email</h1><p className="mt-4 leading-7 text-muted-foreground">Confirm below to suppress this email address from future PRIZM.DEV campaign messages in the sender&apos;s workspace.</p><p className="mt-3 text-sm text-muted-foreground">This does not expose your address and does not require an account.</p><form action={action} className="mt-8"><Button type="submit">Unsubscribe this address</Button></form></Card></main>;
}
