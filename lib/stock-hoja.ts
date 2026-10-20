import "server-only";
import { CONSULTA } from "./demo-store";
export async function publicarStockHoja(): Promise<{ ok: boolean; filas?: number; error?: string }> {
  return { ok: false, error: CONSULTA };
}
export const publicarStockHojaCada15 = publicarStockHoja;
