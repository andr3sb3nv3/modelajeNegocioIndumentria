import "server-only";
import { CONSULTA } from "./demo-store";
import type { Orden } from "./tiendanube";
export const USUARIO_TN = "Tiendanube";
export async function aplicarOrden(_orden: Orden): Promise<"cargada" | "anulada" | "sin-cambios"> { throw new Error(CONSULTA); }
export async function publicarStock(_solo?: { modelo: string; color: string; talle: string }[]): Promise<{ publicadas: number; sinMatch: number; apagado: boolean }> { throw new Error(CONSULTA); }
export async function reconciliar(): Promise<{ apagado: boolean }> { throw new Error(CONSULTA); }
