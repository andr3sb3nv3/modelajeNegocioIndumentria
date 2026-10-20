import "server-only";
import { CONSULTA } from "./demo-store";
export type ResultadoSync =
  | { ok: true; cuando: string; filas: number; nuevas: number; demo?: boolean }
  | { ok: false; cuando: string; sinPermiso: boolean; error: string };
export async function sincronizarMaestro(): Promise<ResultadoSync> {
  return { ok: false, cuando: new Date().toISOString(), sinPermiso: true, error: CONSULTA };
}
export const sincronizarMaestroCada15 = sincronizarMaestro;
