import "server-only";
import { SHEETS } from "./config";
import { str, toISO } from "./data";
import { hoyBA } from "./fmt";
import { CONSULTA } from "./demo-store";

/**
 * Gasto cargado por voz (atajo de Siri «Cargar gasto»): agrega una fila a 01 · Gastos maestro › Gastos.
 * Columnas: A ID, B Fecha, C Mes, D Tipo, E Categoría, F Subcat., G Descripción, H Proveedor, I Medio, J Importe,
 * K Moneda, L Estado, M Venc., N Comprobante, O Notas, P TC, Q Importe ARS, R–S.
 * Tipo, categoría y proveedor se copian del gasto anterior más parecido (por palabras de la descripción).
 * Las columnas calculadas (Mes, Importe ARS…) copian la fórmula de la última fila cuando la tienen.
 */
const HOJA = "Gastos", PRIMERA = 5, P = "01 · Gastos maestro";

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const VACIAS = new Set("de del la las el los un una unos unas para por con sin que y o a al en mi su lo le se es pago pague gasto gaste compra compre".split(" "));
const palabras = (s: string) => sinTildes(s).split(/[^a-z0-9ñ]+/).filter((w) => w.length >= 3 && !VACIAS.has(w));
const norm = (s: string) => palabras(s).join(" ");

/** «15.000», «15000,50», «$ 15 000», «15 mil», «1,5 millones» → número */
export function leerImporte(v: unknown): number {
  if (typeof v === "number") return v;
  let t = sinTildes(String(v ?? "")).replace(/\$|ars|pesos?/g, "").trim();
  let mult = 1;
  if (/millon/.test(t)) mult = 1e6; else if (/\bmil\b|k$/.test(t)) mult = 1e3;
  t = t.replace(/[a-z]/g, "").replace(/\s+/g, "");
  // Coma decimal; puntos como separador de miles (formato argentino)
  if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, "").replace(",", ".");
  else if (/\.\d{1,2}$/.test(t) && !/\.\d{3}/.test(t)) t = t.replace(/,/g, "");
  else t = t.replace(/[.,]/g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n * mult : NaN;
}

/** Lo dicho («con transferencia», «mercadopago», «tarjeta») → uno de los medios de la lista de la planilla. */
function elegirMedio(dicho: string, lista: string[]): string {
  const t = sinTildes(dicho).trim();
  if (!t) return "";
  const exacto = lista.find((m) => t.includes(sinTildes(m)));
  if (exacto) return exacto;
  const reglas: [RegExp, RegExp][] = [
    [/transf|trasf|banco/, /transf/], [/efect|cash|billete/, /efect/], [/mercado|^mp\b/, /mercado/],
    [/debito/, /debito/], [/credito/, /credito/], [/tarj|visa|master|amex/, /tarj|credito/], [/dolar|usd/, /dolar|usd/],
  ];
  for (const [dice, busca] of reglas) if (dice.test(t)) { const m = lista.find((x) => busca.test(sinTildes(x))); if (m) return m; }
  return dicho.trim().replace(/^(con|en|por)\s+/i, "").replace(/^./, (c) => c.toUpperCase());
}

type Fila = unknown[];

/** El gasto anterior más parecido: suma de palabras en común, pesando más las raras. */
function parecido(desc: string, filas: Fila[]) {
  const mias = new Set(palabras(desc));
  if (!mias.size) return null;
  const df = new Map<string, number>();
  const toks = filas.map((r) => new Set([...palabras(str(r[6])), ...palabras(str(r[7]))]));
  for (const s of toks) for (const w of s) df.set(w, (df.get(w) || 0) + 1);
  let mejor: { r: Fila; score: number } | null = null;
  filas.forEach((r, i) => {
    if (!str(r[4])) return;
    let score = 0;
    for (const w of mias) if (toks[i].has(w)) score += 1 / Math.log(2 + (df.get(w) || 0));
    if (score > 0 && (!mejor || score > mejor.score || (score === mejor.score && toISO(r[1]) >= toISO(mejor.r[1])))) mejor = { r, score };
  });
  return mejor as { r: Fila; score: number } | null;
}

/** Siguiente ID con el mismo formato que el último («G-0412» → «G-0413»). */
function siguienteId(ids: string[]): string {
  for (let i = ids.length - 1; i >= 0; i--) {
    const m = ids[i].match(/^(.*?)(\d+)$/);
    if (!m) continue;
    const max = Math.max(...ids.map((x) => { const k = x.match(/^(.*?)(\d+)$/); return k && k[1] === m[1] ? Number(k[2]) : 0; }));
    return m[1] + String(max + 1).padStart(m[2].length, "0");
  }
  return "";
}

const col = (i: number) => String.fromCharCode(65 + i);

export type GastoVoz = { que: string; cuanto: unknown; medio?: string; fecha?: string; quien?: string; forzar?: boolean };
export type ResultadoGasto =
  | { ok: true; fila: number; fecha: string; descripcion: string; importe: number; medio: string; categoria: string; tipo: string; proveedor: string; mensaje: string }
  | { ok: false; duplicado?: boolean; error: string; mensaje: string };

export async function cargarGastoVoz(_gasto: GastoVoz): Promise<ResultadoGasto> {
  return { ok: false, error: CONSULTA, mensaje: CONSULTA };
}
