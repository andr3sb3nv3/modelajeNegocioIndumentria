import "server-only";
import { unstable_cache } from "./demo-cache";
import { SHEETS } from "./config";
import { num, range, str, title, toISO } from "./data";

export type Prod = { temp: string; modelo: string; color: string; talle: string; cant: number; taller: string; estado: string; entrega: string; precio: number };
export type Pago = { f: string; temp: string; taller: string; concepto: string; modelo: string; monto: number; moneda: string };
export type Tela = { temp: string; f: string; prov: string; tela: string; metros: number; total: number; moneda: string; destino?: string };
export type Canje = { f: string; tipo: string; quien: string; prendas: string[]; estado: string; devol: string };
/** Planilla de clientas ficticias: encabezados y filas de la biblioteca de demostración. */
export type Tabla = { head: string[]; rows: string[][] };
export type Extra = { prod: Prod[]; pagos: Pago[]; telas: Tela[]; canjes: Canje[]; clientas: Tabla; errores: string[] };

/** Lee un rango; si falla (planilla no compartida, hoja renombrada) devuelve [] y anota el error. */
async function safe(errores: string[], nombre: string, id: string, a1: string) {
  try { return await range(id, a1); } catch (e) { errores.push(`${nombre}: ${String((e as Error).message).slice(0, 120)}`); return []; }
}

/** Busca la fila de encabezados (la primera que contiene alguna de las palabras clave). */
function tabla(rows: unknown[][], clave: RegExp): Tabla {
  const i = rows.findIndex((r) => r.some((c) => clave.test(str(c))));
  if (i < 0) return { head: [], rows: [] };
  const head = rows[i].map(str);
  return { head, rows: rows.slice(i + 1).map((r) => head.map((_, j) => str(r[j]))).filter((r) => r.some(Boolean)) };
}

async function load(): Promise<Extra> {
  const errores: string[] = [];
  const [p, pg, t, cj, cl] = await Promise.all([
    safe(errores, "Producción", SHEETS.stock, "'Producción'!A2:L"),
    safe(errores, "Pagos a producción", SHEETS.stock, "'Pagos a producción'!A2:J"),
    safe(errores, "Compras de telas", SHEETS.stock, "'Compras de telas'!A2:L"),
    safe(errores, "Canjes y préstamos", SHEETS.canjes, "'Canjes y préstamos'!A1:I"),
    safe(errores, "Clientas", SHEETS.clientas, "'Clientas'!A1:Z"),
  ]);
  const prod = p.filter((r) => str(r[1])).map((r) => ({ temp: str(r[0]), modelo: title(str(r[1])), color: str(r[2]), talle: str(r[3]), cant: num(r[4]), taller: str(r[5]), estado: str(r[6]), entrega: toISO(r[7]), precio: num(r[10]) }));
  const pagos = pg.filter((r) => num(r[5])).map((r) => ({ f: toISO(r[0]), temp: str(r[1]), taller: str(r[2]), concepto: str(r[3]), modelo: title(str(r[4])), monto: num(r[5]), moneda: str(r[6]) || "ARS" }));
  const telas = t.filter((r) => str(r[2]) || num(r[8])).map((r) => ({ temp: str(r[0]), f: toISO(r[1]), prov: str(r[2]), tela: str(r[3]), metros: num(r[5]), total: num(r[8]), moneda: str(r[7]) || "ARS", destino: str(r[9]) }));
  const tc = tabla(cj, /^tipo$/i);
  const ix = (k: RegExp) => tc.head.findIndex((h) => k.test(h));
  const [iF, iT, iQ, iV, iE, iD] = [ix(/^fecha$/i), ix(/^tipo/i), ix(/nombre|cuenta/i), ix(/vestido|prenda/i), ix(/estado/i), ix(/devoluci/i)];
  const canjes = tc.rows.filter((r) => toISO(r[iF])).map((r) => ({
    f: toISO(r[iF]), tipo: (r[iT] || "").split(" (")[0].toLowerCase(), quien: r[iQ] || "", prendas: (r[iV] || "").split(/;|,/).map((x) => title(x.trim())).filter(Boolean),
    estado: r[iE] || "", devol: toISO(r[iD]) || r[iD] || "",
  }));
  const clientas = tabla(cl, /segmento/i);
  return { prod, pagos, telas, canjes, clientas, errores };
}

export const getExtra = unstable_cache(load, ["modelaje-extra-v1"], { revalidate: 120 });
