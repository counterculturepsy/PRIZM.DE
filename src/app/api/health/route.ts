export function GET() {
  return Response.json(
    { status: "ok", service: "prizm-web" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
