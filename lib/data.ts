import "server-only";
import { createHash } from "node:crypto";
import { unstable_cache } from "./demo-cache";
import { SHEETS, assertDemoSheetId } from "./config";
import { readDemoRange } from "./demo-store";
import { hoyBA } from "./fmt";

export type Venta = { f: string; canal: string; modelo: string; prendas: number; monto: number; medio: string; cli: string };
export type Gasto = { f: string; cat: string; sub?: string; tipo: string; desc: string; prov: string; medio: string; imp: number; est: string; venc: string; comp: boolean; rev: boolean };
export type StockRow = { fecha: string; local: string; modelo: string; color: string; talle: string; stock: number; temporada: string };
/** De dónde salió el conteo de stock: la planilla STOCK VESTIDOS T26 (pestaña Rosario) o, si no se pudo leer, la hoja Stock. */
export type Conteo = { fuente: "T26" | "Stock"; fecha: string; prendas: number; error?: string };
/** De dónde salieron las ventas de cada canal: la planilla de demostración del canal o, si no se pudo leer, la copia de 02 · Ventas maestro › Todos. */
export type FuenteVentas = { canal: string; id: string; via: "planilla" | "importrange" | "copia"; hasta: string; filas: number; error?: string };
export type Data = { ventas: Venta[]; gastos: Gasto[]; stock: StockRow[]; conteo?: Conteo; fuentesVentas?: FuenteVentas[]; leido: string };

const REVALIDATE = 60; // segundos: la app se refresca sola cada minuto

/** Public read-only workbooks are the only data source for this separate application. */
export async function range(id:string,a1:string,_render:"UNFORMATTED_VALUE"|"FORMULA"="UNFORMATTED_VALUE"):Promise<unknown[][]> {
  assertDemoSheetId(id); return readDemoRange(id,a1);
}
export async function ranges(id:string,a1s:string[],_render:"UNFORMATTED_VALUE"|"FORMULA"="UNFORMATTED_VALUE"):Promise<unknown[][][]> {
  assertDemoSheetId(id); return Promise.all(a1s.map(a1=>readDemoRange(id,a1)));
}

/** Fecha de Sheets (número serial o "dd/mm/aaaa") → "aaaa-mm-dd" */
export function toISO(v: unknown): string {
  // Un serial que ya pasó por str() llega como texto ("45898")
  if (typeof v === "string" && /^\d{5}(\.\d+)?$/.test(v.trim())) v = Number(v);
  if (typeof v === "number" && v > 20000) return new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10);
  if (typeof v === "string") {
    const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})(?=$|\D)/);
    if (m) return `${m[3].length === 2 ? `20${m[3]}` : m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  }
  return "";
}
export const num = (v: unknown) => (typeof v === "number" ? v : Number(String(v ?? "").replace(/[^\d.-]/g, "")) || 0);
export const str = (v: unknown) => String(v ?? "").trim();
/** Clienta → código anónimo (nunca se muestra el nombre) */
const anon = (s: string) => (s ? createHash("sha256").update(s.toLowerCase().replace(/\s+/g, " ").trim()).digest("hex").slice(0, 12) : "");
export const title = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());

async function load(): Promise<Data> {
  const [v, g, s, t26, vSI, vOn] = await Promise.all([
    range(SHEETS.ventas, "'Todos'!A2:J"),
    range(SHEETS.gastos, "'Gastos'!A5:S"),
    range(SHEETS.stock, "'Stock'!A2:J"),
    range(SHEETS.conteo, `'${T26_HOJA}'!A1:W`).catch((e: Error) => e),
    range(SHEETS.ventasSI, "'VENTAS'!B5:Q").catch((e: Error) => e),
    range(SHEETS.ventasOnline, "'VENTAS'!B5:Q").catch((e: Error) => e),
  ]);
  // Ventas (Todos): Fecha, Mes, Canal, Clienta (no se usa), Modelo, Prendas, Monto, Medio de pago, Origen…
  // Rosario y Online se leen de sus planillas ficticias; las pestañas «Vivo …» sirven como copia de lectura alternativa.
  // Mendoza, Otros canales y Carga de ventas siguen saliendo de Todos.
  const vivas = await Promise.all([viva("Rosario", SHEETS.ventasSI, vSI), viva("Online", SHEETS.ventasOnline, vOn)]);
  const enVivo = new Set(vivas.filter((x) => x.rows).map((x) => `Registro ${x.canal}`));
  const ventas = v
    .filter((r) => !enVivo.has(str(r[8])))
    .map((r) => ({ f: toISO(r[0]), canal: str(r[2]) || "Sin canal", modelo: title(str(r[4])), prendas: num(r[5]), monto: num(r[6]), medio: str(r[7]), cli: anon(str(r[3])) }))
    .filter((x) => x.f);
  const fuentesVentas: FuenteVentas[] = [];
  for (const { canal, id, rows, via, error } of vivas) {
    if (!rows) {
      const copia = ventas.filter((x) => x.canal === canal);
      fuentesVentas.push({ canal, id, via: "copia", hasta: copia.reduce((m, x) => (x.f > m ? x.f : m), ""), filas: copia.length, error });
      continue;
    }
    const filas = ventasPlanilla(rows, canal, canal === "Online" ? 10 : 9);
    ventas.push(...filas);
    fuentesVentas.push({ canal, id, via: via || "planilla", hasta: filas.reduce((m, x) => (x.f > m ? x.f : m), ""), filas: filas.length });
  }
  ventas.sort((a, b) => a.f.localeCompare(b.f));
  // Gastos: ID, Fecha, Mes, Tipo, Categoría, Subcat., Descripción, Proveedor, Medio, Importe, Moneda, Estado, Venc., Comprobante, Notas, TC, Importe ARS…
  const gastos = g
    .filter((r) => str(r[1]))
    .map((r) => ({
      f: toISO(r[1]), cat: str(r[4]) || "Sin categoría", sub: str(r[5]), tipo: str(r[3]), desc: str(r[6]), prov: str(r[7]), medio: str(r[8]),
      imp: typeof r[16] === "number" ? r[16] : num(r[9]), est: str(r[11]), venc: toISO(r[12]), comp: !!str(r[13]), rev: /revisar/i.test(str(r[17])),
    }))
    .filter((x) => x.f);
  // Stock: Fecha conteo, Local, Modelo, Color, Talle, Stock inicial, Stock actual, Fuente, Temporada
  let stock = s
    .map((r) => ({ fecha: toISO(r[0]), local: str(r[1]), modelo: title(str(r[2])), color: str(r[3]), talle: str(r[4]), stock: num(r[6]), temporada: str(r[8]) }))
    .filter((x) => x.modelo && x.fecha);
  // STOCK VESTIDOS T26 › STOCK ROSARIO es el conteo que manda: reemplaza a Rosario de la hoja Stock si es igual o más nuevo
  let conteo: Conteo;
  const t = t26 instanceof Error ? null : conteoT26(t26, stock);
  const ultStock = stock.filter((x) => /rosario/i.test(x.local)).reduce((m, x) => (x.fecha > m ? x.fecha : m), "");
  if (t && t.filas.length && t.fecha >= ultStock) {
    // El conteo físico se interpreta como inventario al día; sólo se restan movimientos posteriores.
    const hoy = hoyBA();
    stock = [...stock.filter((x) => !/rosario/i.test(x.local)), ...t.filas.map((x) => ({ ...x, fecha: x.fecha > hoy ? x.fecha : hoy }))];
    conteo = { fuente: "T26", fecha: t.fecha, prendas: t.filas.reduce((a, x) => a + x.stock, 0) };
  } else {
    const error = t26 instanceof Error ? String(t26.message).slice(0, 200) : !t ? "No encontré la fecha «STOCK AL dd/mm/aa» ni los talles 1 a 4." : t.fecha < ultStock ? `Su fecha (${t.fecha}) es más vieja que la hoja Stock.` : "No tiene filas con modelo.";
    conteo = { fuente: "Stock", fecha: ultStock, prendas: stock.filter((x) => x.fecha === ultStock && /rosario/i.test(x.local)).reduce((a, x) => a + x.stock, 0), error };
  }
  // La hoja Ventas puede incluir o quitar el prefijo «Conjunto»: si el conteo lo incluye, se usa ese nombre
  // en toda la app (así Análisis de ventas, Stock y Costo unitario no lo cuentan como dos modelos distintos)
  const sinConjunto = (m: string) => m.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/^conjunto\s+/, "").trim();
  const conjuntos = new Map(stock.filter((x) => /^conjunto\s/i.test(x.modelo)).map((x) => [sinConjunto(x.modelo), x.modelo]));
  for (const x of ventas) x.modelo = conjuntos.get(sinConjunto(x.modelo)) || x.modelo;
  return { ventas, gastos, stock, conteo, fuentesVentas, leido: new Date().toISOString() };
}

/** Pestañas alternativas de lectura para cada canal, con las mismas columnas desde B5. */
export const HOJA_VIVA: Record<string, string> = { "Rosario": "Vivo Rosario", Online: "Vivo Online" };

/**
 * Ventas de un canal desde su planilla ficticia; la pestaña «Vivo …» conserva el formato alternativo del lector.
 */
async function viva(canal: string, id: string, directo: unknown[][] | Error): Promise<{ canal: string; id: string; rows?: unknown[][]; via?: "planilla" | "importrange"; error?: string }> {
  if (!(directo instanceof Error)) return { canal, id, rows: directo, via: "planilla" };
  const hoja = HOJA_VIVA[canal];
  try {
    const rows = await range(SHEETS.ventas, `'${hoja}'!A1:P`);
    if (typeof rows[0]?.[0] === "string" && rows[0][0].startsWith("#")) {
      return { canal, id, error: `La pestaña «${hoja}» de demostración contiene un error de lectura.` };
    }
    return { canal, id, rows, via: "importrange" };
  } catch (e) {
    return { canal, id, error: `No pude leer la planilla de demostración (${String(directo.message).slice(0, 80)}) ni la pestaña «${hoja}»: ${String((e as Error).message).slice(0, 120)}` };
  }
}

/**
 * Pestaña VENTAS de las planillas ficticias de cada canal, desde la columna B: FECHA, CLIENTE, DNI, UN, $, SEÑA, Ruedo, METODO DE PAGO, LUGAR,
 * (PROVINCIA en Online) MODELO… Igual que la copia de 02 · Ventas maestro: sólo filas con fecha y clienta; UN vacío = 1 prenda;
 * un monto escrito como texto se lee con sus dígitos («163.200» = 163200).
 */
export function ventasPlanilla(rows: unknown[][], canal: string, cModelo: number): Venta[] {
  const monto = (v: unknown) => (typeof v === "number" ? v : Number(String(v ?? "").replace(/[^\d]/g, "")) || 0);
  return rows
    .filter((r) => !!toISO(r[0]) && str(r[1]))
    .map((r) => ({ f: toISO(r[0]), canal, modelo: title(str(r[cModelo])), prendas: typeof r[3] === "number" ? r[3] : 1, monto: monto(r[4]), medio: str(r[7]), cli: anon(str(r[1])) }))
    .filter((x) => x.f);
}

export const T26_HOJA = "STOCK ROSARIO";

/**
 * Lee la pestaña STOCK ROSARIO de STOCK VESTIDOS T26: secciones en la columna A (CAPSULA…, COLECCION SS226…), NOMBRE y COLOR,
 * COLOR ESPECÍFICO (o COLOR) y la cantidad por talle bajo el encabezado «STOCK AL dd/mm/aa» (columnas 1, 2, 3, 4). Los nombres se escriben como en la hoja
 * Stock cuando ya existen ahí; se quita el prefijo «Vestido» para cruzar el nombre con Ventas.
 */
export function conteoT26(rows: unknown[][], previo: StockRow[]): { fecha: string; filas: StockRow[] } | null {
  const k = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  let fecha = "", h = -1;
  for (let i = 0; i < Math.min(rows.length, 10) && (!fecha || h < 0); i++) {
    for (const c of rows[i] || []) {
      const m = str(c).match(/stock al\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i);
      if (m) fecha = `${m[3].length === 2 ? `20${m[3]}` : m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    }
    if ((rows[i] || []).some((c) => /^nombre$/i.test(str(c)))) h = i;
  }
  if (!fecha || h < 0) return null;
  const head = rows[h].map(str);
  const cNombre = head.findIndex((c) => /^nombre$/i.test(c)), cColor = head.findIndex((c) => /^color$/i.test(c));
  const cEsp = head.findIndex((c) => /^color espec[ií]fico$/i.test(c)); // Nombre específico de color del catálogo de demostración
  // Talles: las columnas «1».«4» a la derecha de «STOCK TOTAL» (las de la izquierda son el stock inicial XS–L)
  const desde = Math.max(0, head.findIndex((c) => /stock total/i.test(c)));
  const talles = head.map((c, i) => [i, c] as const).filter(([i, c]) => i > desde && /^[1-4](\.0+)?$/.test(c)).map(([i, c]) => [i, String(parseInt(c))] as const);
  if (cNombre < 0 || !talles.length) return null;
  // STOCK ACTUAL puede incluir un total escrito sin distribución por talle.
  // Lo que pase de la suma de talles entra como talle «Sin talle», así el total es el mismo que el de la planilla.
  const cActual = head.findIndex((c) => /^stock actual$/i.test(c));
  const modelos = new Map(previo.map((x) => [k(x.modelo), x.modelo]));
  const colores = new Map(previo.map((x) => [`${k(x.modelo)}|${k(x.color)}`, x.color]));
  const filas: StockRow[] = [];
  let seccion = "";
  for (const r of rows.slice(h + 1)) {
    if (str(r[0])) seccion = str(r[0]);
    let n = str(r[cNombre]).replace(/^vestido\s+/i, "");
    if (!n) continue;
    let c = (cEsp >= 0 && str(r[cEsp])) || str(r[cColor]);
    // Si el color está pegado al nombre, se separa cuando el prefijo coincide con un modelo conocido
    if (!c && !modelos.has(k(n))) {
      const p = n.split(/\s+/);
      for (let j = p.length - 1; j > 0; j--) if (modelos.has(k(p.slice(0, j).join(" ")))) { c = p.slice(j).join(" "); n = p.slice(0, j).join(" "); break; }
    }
    const modelo = modelos.get(k(n)) || title(n);
    modelos.set(k(n), modelo);
    const color = colores.get(`${k(modelo)}|${k(c)}`) || (!c ? "Sin color" : c === c.toUpperCase() ? title(c) : c[0].toUpperCase() + c.slice(1));
    const ss = seccion.match(/ss\s*2?(2\d)\b/i);
    const temporada = ss ? `T${ss[1]}` : /2025|capsula|drop/i.test(seccion) ? "T25" : "";
    for (const [i, talle] of talles) filas.push({ fecha, local: "Rosario", modelo, color, talle, stock: num(r[i]), temporada });
    const sinTalle = cActual >= 0 ? num(r[cActual]) - talles.reduce((a, [i]) => a + num(r[i]), 0) : 0;
    if (sinTalle > 0) filas.push({ fecha, local: "Rosario", modelo, color, talle: "Sin talle", stock: sinTalle, temporada });
  }
  return { fecha, filas };
}

export const getData = unstable_cache(load, ["modelaje-data-v6"], { revalidate: REVALIDATE, tags: ["datos"] });
