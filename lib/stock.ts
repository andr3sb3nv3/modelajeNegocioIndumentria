import "server-only";
import { SHEETS } from "./config";
import { num, range, str, title, toISO, type StockRow, type Venta } from "./data";
import { grupoCanal } from "./fmt";
import { revalidateTag, unstable_cache } from "next/cache";
import { CONSULTA } from "./demo-store";
import { ventasOnline, type LineaTN } from "./tiendanube";

/**
 * Stock en vivo = último conteo de cada local
 *               + movimientos cargados en la app (ventas del local, devoluciones, cambios, préstamos)
 *               − ventas pagadas en Tiendanube (descuentan del local online)
 * Sólo cuenta lo que pasó DESPUÉS del día del conteo.
 */

export const TIPOS = {
  venta: "Venta",
  devolucion: "Devolución",
  "cambio-vuelve": "Cambio · vuelve",
  "cambio-sale": "Cambio · se lleva",
  prestamo: "Préstamo",
  canje: "Canje",
  contenido: "Contenido",
  vuelve: "Volvió",
  anulacion: "Anulación",
} as const;
export type Tipo = keyof typeof TIPOS;
/** Lo que vuelve (préstamos y contenido) queda abierto hasta que se marca «Volvió». */
export const VUELVEN: Tipo[] = ["prestamo", "contenido"];

export type Mov = {
  id: string; ts: string; f: string; local: string; tipo: Tipo; modelo: string; color: string; talle: string;
  cant: number; monto: number; medio: string; clienta: string; nota: string; ref: string; usuario: string;
};

export const HOJA = "Movimientos";
const HEAD = ["ID", "Fecha y hora", "Fecha", "Local", "Tipo", "Modelo", "Color", "Talle", "Cantidad", "Monto", "Medio de pago", "Clienta", "Nota", "Ref", "Usuario"];
const POR_NOMBRE = Object.fromEntries(Object.entries(TIPOS).map(([k, v]) => [v, k])) as Record<string, Tipo>;

/** Claves normalizadas: «Verde » = «verde», «Talle 2» = «2» */
export const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
export const talleDe = (s: string) => (String(s).match(/\d+/)?.[0] ?? str(s).toUpperCase());
/** Clave para cruzar nombres de modelo entre planillas («Conjunto Aurora» = «Aurora»). */
export const claveModelo = (s: string) => norm(s).replace(/^conjunto /, "");
const clave = (local: string, modelo: string, color: string, talle: string) => [norm(local), norm(modelo), norm(color), talleDe(talle)].join("|");

// ---------- lectura / escritura de movimientos ----------


const TAG = "movimientos";
const filasMovs = () => range(SHEETS.stock, `'${HOJA}'!A2:O`);
/** Todas las pantallas comparten la misma lectura por 30 s; cada carga o borrado la renueva al instante. */
const filasMovsCache = unstable_cache(filasMovs, ["modelaje-movs-filas-v1"], { revalidate: 30, tags: [TAG] });
function movimientosCambiaron() {
  try { revalidateTag(TAG); } catch { /* fuera de una acción o ruta: vence sola a los 30 s */ }
}

/**
 * Lee la hoja Movimientos. Por defecto, la copia compartida de los últimos 30 s (así no se pasa del límite de Google);
 * `fresco` lee la hoja en el momento: para validar antes de escribir (anular, corregir, no duplicar órdenes).
 */
export async function leerMovimientos(fresco = false): Promise<{ movs: Mov[]; error?: string }> {
  try {
    const rows = await (fresco ? filasMovs() : filasMovsCache());
    const movs = rows.filter((r) => str(r[0]) && POR_NOMBRE[str(r[4])]).map((r) => ({
      id: str(r[0]), ts: str(r[1]), f: toISO(r[2]), local: str(r[3]), tipo: POR_NOMBRE[str(r[4])], modelo: title(str(r[5])), color: str(r[6]), talle: talleDe(str(r[7])),
      cant: num(r[8]), monto: num(r[9]), medio: str(r[10]), clienta: str(r[11]), nota: str(r[12]), ref: str(r[13]), usuario: str(r[14]),
    }));
    return { movs };
  } catch (e) {
    const msg = String((e as Error).message);
    // La hoja todavía no existe: se crea con el primer movimiento
    if (/Unable to parse range/.test(msg)) return { movs: [] };
    return { movs: [], error: msg };
  }
}

export type NuevoMov = Omit<Mov, "id" | "ts" | "f" | "usuario"> & { id?: string; f?: string };

export async function guardarMovimientos(_nuevos: NuevoMov[], _usuario: string): Promise<Mov[]> { throw new Error(CONSULTA); }

const PLANILLA = "Producción y stock";

/** Crea la pestaña Movimientos si todavía no existe (sin tocarla si ya está). Avisa si la app no es Editor de la planilla. */
export async function asegurarMovimientos(): Promise<{ ok: boolean; sinPermiso?: boolean; error?: string }> {
  return { ok: false, sinPermiso: true, error: CONSULTA };
}
/** Al abrir «Registrar venta» y en el cron; como mucho una vez cada 10 minutos. */
export const movimientosListos = unstable_cache(asegurarMovimientos, ["modelaje-movimientos-v1"], { revalidate: 10 * 60 });

/**
 * Borra de la hoja las filas de esos movimientos y de sus anulaciones (sólo la dueña, para cargas de prueba).
 * Lo normal es anular: queda el rastro. Devuelve cuántas filas borró.
 */
export async function borrarFilas(_ids: string[]): Promise<number> { throw new Error(CONSULTA); }

/** Movimientos vigentes (sin los anulados ni las anulaciones). */
export function vigentes(movs: Mov[]) {
  const anulados = new Set(movs.filter((m) => m.tipo === "anulacion").map((m) => m.ref));
  return movs.filter((m) => m.tipo !== "anulacion" && !anulados.has(m.id));
}

/** Préstamos y prendas para contenido que todavía no volvieron. */
export function abiertos(movs: Mov[]) {
  const v = vigentes(movs);
  const volvieron = new Set(v.filter((m) => m.tipo === "vuelve").map((m) => m.ref));
  return v.filter((m) => VUELVEN.includes(m.tipo) && !volvieron.has(m.id));
}

// ---------- cálculo ----------

export type Item = { local: string; modelo: string; color: string; talle: string; conteo: number; q: number; temporada: string };
export type Online = { lineas: (LineaTN & { modelo: string; color: string; talle: string; ok: boolean })[]; activo: boolean; error?: string; local: string };

export const sinHonduras = (l: string) => !/hondu/i.test(l);

/** Local ficticio del canal online: Online/Web/Depósito; si no hay, el showroom. */
export function localOnline(locales: string[]) {
  return locales.find((l) => /online|web|tienda/i.test(l)) || locales.find((l) => /dep[oó]sito/i.test(l)) || locales.find((l) => /isidro/i.test(l)) || locales[0] || "Online";
}

/**
 * Ventas de la hoja Ventas posteriores al último conteo que no pasaron por la app («Vendí») ni por Tiendanube.
 * La hoja Ventas no dice color ni talle: se descuentan por modelo, aparte de la grilla por talle.
 * vendidas = hoja − ya cargadas en la app/Tiendanube; q = lo que se descuenta (nunca más que el stock de ese modelo en el local).
 */
export type SinTalle = { local: string; modelo: string; /** claveModelo */ k: string; vendidas: number; q: number };

/**
 * Stock en vivo. Con `ventas` (hoja Ventas) también descuenta, por modelo, lo vendido después del conteo que no se cargó en la app:
 * sin eso el stock queda clavado en el último conteo mientras las ventas se anotan sólo en la planilla.
 */
export async function stockEnVivo(stock: StockRow[], ventas?: Venta[]) {
  const ult = new Map<string, string>();
  for (const s of stock) if (sinHonduras(s.local) && s.fecha > (ult.get(s.local) || "")) ult.set(s.local, s.fecha);
  const locales = [...ult.keys()].sort((a, b) => (/isidro/i.test(a) ? -1 : /isidro/i.test(b) ? 1 : a.localeCompare(b)));
  const lOnline = localOnline(locales);
  if (!ult.has(lOnline)) locales.push(lOnline);

  const items = new Map<string, Item>();
  const item = (local: string, modelo: string, color: string, talle: string) => {
    const k = clave(local, modelo, color, talle);
    let it = items.get(k);
    if (!it) { it = { local, modelo, color, talle: talleDe(talle), conteo: 0, q: 0, temporada: "" }; items.set(k, it); }
    return it;
  };
  for (const s of stock) {
    if (ult.get(s.local) !== s.fecha) continue;
    const it = item(s.local, s.modelo, s.color, s.talle);
    it.conteo += s.stock; it.q += s.stock; it.temporada = s.temporada;
  }

  const { movs, error } = await leerMovimientos();
  const v = vigentes(movs);
  for (const m of v) {
    if (m.tipo === "anulacion" || m.f <= (ult.get(m.local) || "")) continue;
    item(m.local, m.modelo, m.color, m.talle).q += m.cant;
  }

  // Ventas online: las que ya entraron a Movimientos (webhook, sincronización o archivo subido a mano) no se vuelven a descontar
  const desde = ult.get(lOnline) || "2026-01-01";
  const tn = await ventasOnline(desde);
  const cargadas = new Set(movs.filter((m) => m.ref.startsWith(REF_TN)).map((m) => m.ref.slice(REF_TN.length)));
  const quien = reconocer([...items.values()]);
  const lineas = tn.lineas.filter((l) => l.f > desde && !cargadas.has(l.id) && !cargadas.has(l.orden)).map((l) => {
    const p = quien(l.nombre, l.valores);
    if (p.ok) item(lOnline, p.modelo, p.color, p.talle).q -= l.cant;
    return { ...l, ...p };
  });
  const online: Online = { lineas, activo: tn.activo, error: tn.error, local: lOnline };

  const sinTalle = ventas ? descontarHoja(ventas, [...items.values()], locales, ult, v, online) : [];

  return { items: [...items.values()], locales, ult, movs, movError: error, online, sinTalle };
}

/** Ref de los movimientos que vienen de una orden de Tiendanube: «tn:<id de orden>» (API) o «tn:#<número de orden>» (archivo exportado). */
export const REF_TN = "tn:";

/** Reconoce modelo, color y talle de un producto de Tiendanube por su nombre y variantes. */
export function reconocer(items: { modelo: string; color: string }[]) {
  const modelos = [...new Set(items.map((i) => i.modelo))].sort((a, b) => b.length - a.length);
  return (nombre: string, valores: string[]) => {
    const n = norm(nombre);
    const modelo = modelos.find((m) => n.includes(norm(m))) || "";
    const talle = valores.find((x) => /^\s*(talle\s*)?\d+\s*$/i.test(x)) || "";
    const coloresModelo = items.filter((i) => i.modelo === modelo).map((i) => i.color);
    const color = coloresModelo.find((c) => valores.some((x) => norm(x) === norm(c))) || valores.find((x) => x !== talle) || "";
    return { modelo, color, talle: talle ? talleDe(talle) : "", ok: !!(modelo && color && talle) };
  };
}

function descontarHoja(ventas: Venta[], items: Item[], locales: string[], ult: Map<string, string>, v: Mov[], online: Online): SinTalle[] {
  // Canal de la hoja Ventas → local del conteo: online descuenta del local online; Honduras y otros canales sin conteo vigente, no
  const localDe = (canal: string) => {
    const g = grupoCanal(canal);
    if (g === "Online") return online.local;
    return locales.find((l) => grupoCanal(l) === g) || "";
  };
  const hoja = new Map<string, SinTalle>(), ya = new Map<string, number>();
  for (const x of ventas) {
    const l = x.modelo && x.prendas > 0 ? localDe(x.canal) : "", desde = l && ult.get(l);
    if (!desde || x.f <= desde) continue;
    const k = `${l}|${claveModelo(x.modelo)}`;
    const h = hoja.get(k) || { local: l, modelo: x.modelo, k: claveModelo(x.modelo), vendidas: 0, q: 0 };
    h.vendidas += x.prendas; hoja.set(k, h);
  }
  const sum = (k: string, q: number) => ya.set(k, (ya.get(k) || 0) + q);
  for (const m of v) if (m.tipo === "venta" && m.f > (ult.get(m.local) || "")) sum(`${m.local}|${claveModelo(m.modelo)}`, Math.abs(m.cant));
  for (const l of online.lineas) if (l.ok) sum(`${online.local}|${claveModelo(l.modelo)}`, l.cant);
  const hay = new Map<string, { n: number; modelo: string }>();
  for (const i of items) {
    const k = `${i.local}|${claveModelo(i.modelo)}`, h = hay.get(k) || { n: 0, modelo: i.modelo };
    h.n += Math.max(0, i.q); hay.set(k, h);
  }
  const out: SinTalle[] = [];
  for (const [k, h] of hoja) {
    const vendidas = h.vendidas - (ya.get(k) || 0);
    if (vendidas <= 0) continue;
    // Mismo nombre que en el conteo («Conjunto Aurora»), así la grilla lo pone en su modelo
    out.push({ ...h, modelo: hay.get(k)?.modelo || h.modelo, vendidas, q: Math.min(vendidas, hay.get(k)?.n || 0) });
  }
  return out.sort((a, b) => b.vendidas - a.vendidas);
}
