import { NextResponse } from "next/server";
import { DEMO_DRIVE } from "@/lib/config";
import { demoSourceStatus } from "@/lib/demo-source";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ ...demoSourceStatus(), mode: "read-only", demo: true, books: Object.keys(DEMO_DRIVE.books).length, browserStorage: false, writes: false }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
