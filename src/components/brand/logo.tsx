import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-semibold tracking-tight", className)}>
      <span aria-hidden="true" className="relative grid size-8 place-items-center overflow-hidden rounded-lg border border-primary/40 bg-primary/10">
        <span className="prism-mark" />
      </span>
      <span>PRIZM<span className="text-primary">.DEV</span></span>
    </span>
  );
}
