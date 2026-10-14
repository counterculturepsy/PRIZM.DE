export default function ApplicationLoading() {
  return <main aria-busy="true" aria-label="Loading workspace" className="mx-auto max-w-7xl animate-pulse px-5 py-10 sm:px-6 lg:px-8"><div className="h-4 w-36 rounded bg-muted" /><div className="mt-4 h-10 w-72 max-w-full rounded bg-muted" /><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div className="h-32 rounded-2xl border border-border bg-card" key={index} />)}</div></main>;
}
