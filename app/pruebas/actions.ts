"use server";
import { CONSULTA } from "@/lib/demo-store";
export type EstadoPegar = { ok: boolean; msg: string } | null;
export async function pegarResumen(_prev: EstadoPegar, _form: FormData): Promise<EstadoPegar> { return { ok: false, msg: CONSULTA }; }
