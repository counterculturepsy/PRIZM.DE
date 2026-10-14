import Link from "next/link";
import { ArrowRight, Crosshair, FileText, Radar, ScanSearch, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

const features = [
  { icon: Radar, title: "Opportunity discovery", copy: "Find businesses with attributable digital opportunity signals, not an undifferentiated list." },
  { icon: ScanSearch, title: "Evidence-led audits", copy: "Keep observations, sources, confidence, and recommendations visibly separate." },
  { icon: Crosshair, title: "Transparent scoring", copy: "Understand why a prospect deserves attention before investing sales time." },
  { icon: Sparkles, title: "Grounded sales drafts", copy: "Generate strategy and outreach from real evidence with human review by default." },
  { icon: FileText, title: "Proposal workflow", copy: "Turn a validated opportunity into scoped, reviewable commercial work." },
  { icon: ShieldCheck, title: "Workspace safe", copy: "Tenant isolation and role authorization are architecture requirements, not later add-ons." },
] as const;

export default function HomePage() {
  return (
    <main className="page-grid min-h-screen overflow-hidden">
      <nav aria-label="Primary" className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <Logo />
        <Link className={buttonVariants({ variant: "secondary" })} href="/login">Sign in</Link>
      </nav>

      <section className="relative mx-auto max-w-7xl px-6 pb-24 pt-20 lg:px-8 lg:pb-32 lg:pt-28">
        <div aria-hidden="true" className="absolute left-1/2 top-0 -z-10 h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
        <div className="max-w-4xl">
          <p className="mb-6 inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] text-primary">M2 prospect database · South Africa first</p>
          <h1 className="text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-8xl">Find your next client <span className="bg-gradient-to-r from-primary via-magenta to-cyan bg-clip-text text-transparent">before your competition does.</span></h1>
          <p className="mt-8 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">PRIZM.DEV is being built to discover businesses with real digital opportunities, explain the evidence, and help teams turn qualified prospects into clients.</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link className={buttonVariants({ variant: "primary" })} href="/login">Enter PRIZM.DEV <ArrowRight aria-hidden="true" className="ml-2 size-4" /></Link>
            <a className={buttonVariants({ variant: "ghost" })} href="#capabilities">Explore the architecture</a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-8" id="capabilities">
        <div className="mb-10 max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan">Built around better opportunities</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">A serious operating system, developed in deliberate milestones.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, copy }) => (
            <Card className="p-6" key={title}>
              <Icon aria-hidden="true" className="size-5 text-primary" />
              <h3 className="mt-5 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center text-sm text-muted-foreground">PRIZM.DEV M2. Controlled CSV discovery is live; external providers and sales automation remain disabled.</footer>
    </main>
  );
}
