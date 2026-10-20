"use server";
import { CONSULTA } from "@/lib/demo-store";
import type { Vista } from "@/lib/tn-import";
export type Carga = { ok: true; cargadas: number; anuladas: number } | { ok: false; error: string };
export async function ver(_texto: string): Promise<Vista> { return { ordenes: [], local: "", error: CONSULTA }; }
export async function cargar(_texto: string): Promise<Carga> { return { ok: false, error: CONSULTA }; }
