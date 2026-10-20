import { NextResponse } from "next/server";
import { CONSULTA } from "@/lib/demo-store";
export const dynamic = "force-dynamic";
const disabled = () => NextResponse.json({ ok: false, error: CONSULTA, mensaje: CONSULTA }, { status: 405, headers: { Allow: "", "Cache-Control": "no-store" } });
export async function GET() { return disabled(); }
export async function POST() { return disabled(); }
export async function PUT() { return disabled(); }
export async function PATCH() { return disabled(); }
export async function DELETE() { return disabled(); }
