import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark, Play, Trash2 } from "lucide-react";
import { deleteSavedSearchAction } from "@/app/app/discover/actions";
import { Card } from "@/components/ui/card";
import { hasCapability } from "@/modules/workspaces/scope";
import { listSavedSearches } from "@/server/prospecting/queries";
import { getWorkspaceContext } from "@/server/workspaces/context";

export const metadata: Metadata = { title: "Saved searches" };

function searchHref(filters: Record<string, string | undefined>): string {
  const params = new URLSearchParams(Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])));
  return `/app/discover/search?${params.toString()}`;
}

export default async function SavedSearchesPage() {
  const { scope } = await getWorkspaceContext("read");
  const rows = await listSavedSearches(scope);
  const canWrite = hasCapability(scope, "write");
  return <main className="mx-auto max-w-5xl px-5 py-10 sm:px-6 lg:px-8"><p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan">Prospect database</p><h1 className="mt-3 text-3xl font-semibold">Saved searches</h1><p className="mt-3 text-muted-foreground">Reusable filters are private to the active workspace.</p>
    {rows.length === 0 ? <Card className="mt-8 p-8 text-center"><Bookmark className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-4 font-semibold">No saved searches yet</h2><Link className="mt-4 inline-block text-sm text-primary hover:underline" href="/app/discover/search">Search companies</Link></Card> : <div className="mt-8 grid gap-4">{rows.map((row) => <Card className="flex flex-wrap items-center justify-between gap-4 p-5" key={row.id}><div><h2 className="font-semibold">{row.name}</h2><p className="mt-1 text-sm text-muted-foreground">{Object.entries(row.filters).filter(([,value]) => value).map(([key,value]) => `${key}: ${value}`).join(" · ") || "All companies"}</p></div><div className="flex gap-2"><Link className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground" href={searchHref(row.filters)}><Play className="mr-2 size-4" />Run</Link>{canWrite ? <form action={deleteSavedSearchAction}><input name="id" type="hidden" value={row.id} /><button aria-label={`Delete ${row.name}`} className="min-h-10 rounded-lg border border-border px-3 text-muted-foreground hover:text-error" type="submit"><Trash2 className="size-4" /></button></form> : null}</div></Card>)}</div>}
  </main>;
}
