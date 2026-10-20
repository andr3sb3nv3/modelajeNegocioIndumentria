import "server-only";
import { unstable_cache } from "./demo-cache";
import { SHEETS, sheetUrl } from "./config";
import { getData, num, ranges, str, toISO } from "./data";
import { grupoCanal, hoyBA } from "./fmt";
import { esFijo } from "./resultado";
import { REF_TN, leerMovimientos, vigentes } from "./stock";

/** Una alerta de la hoja «Alertas» del 17 · Carga de datos maestro */
export type Alerta = { f: string; origen: string; fila: string; detalle: string; importe: number; alerta: string; queHacer: string };
/** Un día de la semana: números en vivo (ventas, prendas, gastos) + notas y alertas del 17 · Carga de datos maestro */
export type Dia = {
  f: string; dia: string; entro: string; gastosN: number; gastos: number; fijos: number; prendas: number; ventas: number;
  /** Ventas $ del día por canal (Rosario, Mendoza, Online, Otros canales) */
  canales: Record<string, number>;
  ventasL: VentaDia[]; gastosL: GastoDia[];
  otros: string; alertasTxt: string; estado: string; archivo: string; aclaraciones: string;
  alertas: Alerta[]; cargado: boolean; falta: boolean;
};
export type Semana = {
  /** hoy: último día de la semana mostrada · real: el día de hoy */
  dias: Dia[]; prev: Dia[]; hoy: string; real: string; leido: string; errores: string[]; maestro: string;
  /** Última fecha con notas en el Carga de datos maestro ("" si no hay ninguna) */
  notasHasta: string;
  /** No se pudo leer el Maestro (los números en vivo se ven igual) */
  maestroError: boolean;
};

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export const diaSemana = (iso: string) => DIAS[new Date(iso + "T12:00:00Z").getUTCDay()];
export const sumarDias = (iso: string, k: number) => new Date(Date.parse(iso + "T12:00:00Z") + k * 864e5).toISOString().slice(0, 10);

/** Saca la URL de una celda: texto con http o fórmula =HYPERLINK("url"; "texto"). */
function url(v: unknown): string {
  const s = str(v);
  const m = s.match(/https?:\/\/[^"'\s)]+/);
  return m ? m[0] : "";
}

async function safe(errores: string[], nombre: string, a1s: string[], render?: "FORMULA"): Promise<unknown[][][]> {
  try { return await ranges(SHEETS.maestro, a1s, render); } catch (e) { errores.push(`Carga de datos maestro › ${nombre}: ${msg(e)}`); return a1s.map(() => []); }
}
const msg = (e: unknown) => String((e as Error)?.message || e).slice(0, 200);

// ---------- números en vivo ----------

/** Ventas y gastos de un día, calculados en vivo. */
export type VentaDia = { modelo: string; canal: string; medio: string; monto: number; prendas: number; clienta: string };
export type GastoDia = { prov: string; cat: string; medio: string; imp: number; est: string; fijo?: boolean };
export type Numeros = {
  /** gastos = sólo los variables (día y semana se miran como ventas − variables); los fijos van aparte y se miran en el mes */
  ventas: number; prendas: number; gastos: number; fijos: number; gastosN: number; canales: Record<string, number>;
  /** Las ventas y los gastos que suman esos números (para ver el detalle del día) */
  ventasL: VentaDia[]; gastosL: GastoDia[];
};
const cero = (): Numeros => ({ ventas: 0, prendas: 0, gastos: 0, fijos: 0, gastosN: 0, canales: {}, ventasL: [], gastosL: [] });

/**
 * Ventas $, prendas, gastos $ y cantidad de gastos por día, entre `desde` y `hasta` (aaaa-mm-dd), leídos en vivo:
 *  - Gastos: planilla 01 · Gastos maestro › Gastos (importe en ARS), por fecha del gasto. `gastos` = variables; `fijos` aparte (misma regla que el P&L).
 *  - Ventas: Rosario y Online de las planillas ficticias del canal, el resto de 02 · Ventas maestro › Todos (ver getData). Para cada día y canal (Rosario / Mendoza / Online / Otros):
 *    si la planilla ya tiene ventas de ese día y canal, mandan ésas; si no, se suman las ventas vigentes cargadas
 *    en la app (hoja Movimientos de Producción y stock, sin las anuladas; las que entraron desde Tiendanube, Ref
 *    «tn:», cuentan como Online). Así una venta cargada en los dos lados no se cuenta dos veces.
 *    (Las órdenes de Tiendanube que no pasaron por Movimientos no se suman, a propósito.)
 */
export async function numerosEnVivo(desde: string, hasta: string, errores: string[] = []): Promise<Map<string, Numeros>> {
  const [d, app] = await Promise.all([
    getData().catch((e) => { errores.push(`Planillas de Ventas y Gastos: ${msg(e)}`); return null; }),
    leerMovimientos(),
  ]);
  if (app.error) errores.push(`Movimientos (ventas cargadas en la app): ${msg(app.error)}`);
  const en = (f: string) => f >= desde && f <= hasta;
  const out = new Map<string, Numeros>();
  const dia = (f: string) => { let x = out.get(f); if (!x) out.set(f, (x = cero())); return x; };

  type Acum = { monto: number; prendas: number; items: VentaDia[] };
  const sumar = (m: Map<string, Acum>, k: string, v: VentaDia) => {
    const x = m.get(k) || { monto: 0, prendas: 0, items: [] };
    x.monto += v.monto; x.prendas += v.prendas; x.items.push(v); m.set(k, x);
  };
  const planilla = new Map<string, Acum>(), enApp = new Map<string, Acum>();
  for (const v of d?.ventas || []) if (en(v.f)) {
    const c = grupoCanal(v.canal);
    sumar(planilla, `${v.f}|${c}`, { modelo: v.modelo, canal: c, medio: v.medio, monto: v.monto, prendas: v.prendas, clienta: v.cli });
  }
  for (const m of vigentes(app.movs)) {
    if (m.tipo !== "venta" || !en(m.f)) continue;
    const c = m.ref.startsWith(REF_TN) ? "Online" : grupoCanal(m.local);
    sumar(enApp, `${m.f}|${c}`, { modelo: [m.modelo, m.color, m.talle].filter(Boolean).join(" "), canal: c, medio: m.medio, monto: m.monto, prendas: -m.cant, clienta: m.clienta });
  }
  const poner = (k: string, x: Acum) => {
    const t = dia(k.slice(0, 10)), c = k.slice(11);
    t.ventas += x.monto; t.prendas += x.prendas; t.canales[c] = (t.canales[c] || 0) + x.monto; t.ventasL.push(...x.items);
  };
  for (const [k, x] of planilla) poner(k, x);
  for (const [k, x] of enApp) if (!planilla.has(k)) poner(k, x);

  for (const g of d?.gastos || []) if (en(g.f)) {
    const t = dia(g.f), fijo = esFijo(g); t.gastosN++;
    if (fijo) t.fijos += g.imp; else t.gastos += g.imp;
    t.gastosL.push({ prov: g.prov || g.desc, cat: g.cat, medio: g.medio, imp: g.imp, est: g.est, fijo });
  }
  for (const t of out.values()) { t.ventasL.sort((a, b) => b.monto - a.monto); t.gastosL.sort((a, b) => b.imp - a.imp); }
  return out;
}

// ---------- Carga de datos maestro (notas) ----------

type Notas = Pick<Dia, "f" | "dia" | "entro" | "otros" | "alertasTxt" | "estado" | "archivo" | "aclaraciones">;
const tieneNotas = (n: Notas) => !!(n.entro || n.otros || n.estado || n.archivo || n.aclaraciones);

/** Arma los 14 días (semana actual + la anterior): números en vivo + notas del Maestro. */
function armar(nums: Map<string, Numeros>, notas: Notas[], alertas: Alerta[], hoy: string) {
  const porFecha = new Map(notas.map((d) => [d.f, d]));
  const dia = (f: string): Dia => {
    const n = porFecha.get(f) ?? { f, dia: "", entro: "", otros: "", alertasTxt: "", estado: "", archivo: "", aclaraciones: "" };
    const x = nums.get(f) ?? cero();
    const al = alertas.filter((a) => a.f === f);
    const cargado = !!(x.ventas || x.prendas || x.gastos || x.fijos || x.gastosN || tieneNotas(n));
    return { ...n, ...x, dia: diaSemana(f), alertas: al, cargado, falta: /falta/i.test(n.estado) };
  };
  const dias = Array.from({ length: 7 }, (_, i) => dia(sumarDias(hoy, i - 6)));
  const prev = Array.from({ length: 7 }, (_, i) => dia(sumarDias(hoy, i - 13)));
  return { dias, prev };
}

/** Última fecha del Maestro con notas cargadas a mano (Qué entró, Estado, Archivo, Aclaraciones…). */
const ultimaNota = (notas: Notas[]) => notas.filter(tieneNotas).reduce((m, n) => (n.f > m ? n.f : m), "");

/** Los 7 días que terminan hoy o, con `atras`, los que terminan esa cantidad de semanas antes. */
async function load(atras = 0): Promise<Semana> {
  const real = hoyBA(), hoy = sumarDias(real, -7 * atras);
  const desde = sumarDias(hoy, -13);
  const errores: string[] = [];
  const maestroErr: string[] = [];
  // Dos consultas en vez de cuatro: el Maestro se lee junto con muchas otras planillas y Google limita las lecturas por minuto
  const [nums, [d, al], [k, bit]] = await Promise.all([
    numerosEnVivo(desde, hoy, errores),
    safe(maestroErr, "Días y Alertas", ["'Días'!A8:L", "'Alertas'!A8:H"]),
    safe(maestroErr, "Días (archivos) y Bitácora IA", ["'Días'!A8:K", "'Bitácora IA'!A4:F"], "FORMULA"),
  ]);
  // Links al archivo del día: columna K de Días o, si no está, columna F de la Bitácora IA
  const links = new Map<string, string>();
  for (const r of bit) { const f = toISO(r[0]), u = url(r[5]); if (f && u) links.set(f, u); }
  for (const r of k) { const f = toISO(r[0]), u = url(r[10]); if (f && u) links.set(f, u); }
  // Días: Fecha | Día | Qué entró | Gastos cant | Gastos $ | Prendas | Ventas $ | Otros | Alertas | Estado | Archivo | Aclaraciones
  // De acá sólo se usan las notas: los números (D–G) se calculan en vivo.
  const notas: Notas[] = d.map((r) => ({
    f: toISO(r[0]), dia: str(r[1]), entro: str(r[2]), otros: str(r[7]), alertasTxt: str(r[8]), estado: str(r[9]), archivo: "", aclaraciones: str(r[11]),
  })).filter((x) => x.f).map((x) => ({ ...x, archivo: links.get(x.f) || "" }));
  // Alertas: Fecha | Origen | Fila/canal | Detalle | Importe | Alerta | Qué hacer | Clave
  const alertas = al.map((r) => ({ f: toISO(r[0]), origen: str(r[1]), fila: str(r[2]), detalle: str(r[3]), importe: num(r[4]), alerta: str(r[5]), queHacer: str(r[6]) }))
    .filter((x) => x.f && (x.alerta || x.detalle));
  return {
    ...armar(nums, notas, alertas, hoy), hoy, real, leido: new Date().toISOString(), errores: [...errores, ...maestroErr], maestro: sheetUrl(SHEETS.maestro),
    notasHasta: ultimaNota(notas), maestroError: maestroErr.length > 0,
  };
}

export const getSemana = unstable_cache(load, ["modelaje-semana-v6"], { revalidate: 60 });
