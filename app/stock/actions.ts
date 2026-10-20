"use server";
import { CONSULTA } from "@/lib/demo-store";

export type Prenda = { modelo: string; color: string; talle: string; cant?: number };
export type Pedido =
  | { tipo: "venta"; local: string; prendas: Prenda[]; monto: number; medio: string; clienta: string; nota: string }
  | { tipo: "devolucion"; local: string; prendas: Prenda[]; monto: number; nota: string }
  | { tipo: "cambio"; local: string; vuelve: Prenda; sale: Prenda; nota: string }
  | { tipo: "prestamo" | "canje" | "contenido"; local: string; prendas: Prenda[]; quien: string; nota: string }
  | { tipo: "vuelve"; ref: string }
  | { tipo: "anulacion"; ref: string };
export type Resultado = { ok: true } | { ok: false; error: string };
export type Correccion = { ids: string[]; local: string; prendas: Prenda[]; monto: number; medio: string; clienta: string; nota: string };

export async function registrar(_pedido: Pedido): Promise<Resultado> { return { ok: false, error: CONSULTA }; }
export async function corregirVenta(_correccion: Correccion): Promise<Resultado> { return { ok: false, error: CONSULTA }; }
export async function borrarVenta(_ids: string[], _delTodo = false): Promise<Resultado> { return { ok: false, error: CONSULTA }; }
