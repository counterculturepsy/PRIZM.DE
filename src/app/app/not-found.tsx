import Link from "next/link";

export default function AppNotFound() {
  return <main className="mx-auto max-w-3xl px-5 py-16 sm:px-6"><p className="font-mono text-xs uppercase tracking-[0.18em] text-warning">Not available</p><h1 className="mt-3 text-3xl font-semibold">This workspace resource could not be found.</h1><p className="mt-3 text-muted-foreground">It may not exist or your role may not permit access.</p><Link className="mt-6 inline-block text-sm text-primary hover:underline" href="/app">Return to dashboard</Link></main>;
}
