import "server-only";
import { unstable_cache } from "./demo-cache";
import { PLAN, assertDemoSheetId } from "./config";
import { toISO } from "./data";
import { hoyBA } from "./fmt";
import { readDemoMetadata } from "./demo-store";
import { ranges } from "./data";

/**
 * Planillas de planificación (carpetas 11, 12 y 13 del Codex), sólo lectura.
 * Todas siguen el mismo formato: fila 1 título, fila 2 explicación, (datos sueltos como «Día L»), encabezado y filas.
 * Se lee por nombre de columna, así que se pueden sumar filas o columnas sin romper la app.
 */
export type Tabla = { tab: string; titulo: string; nota: string; meta: [string, string][]; head: string[]; rows: string[][]; pies: string[] };
export type Libro = { id: string; nombre: string; tablas: Tabla[]; leido: string };

const REVALIDATE = 120;
const nn = (r: string[]) => r.filter(Boolean).length;
export const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

export function parseTabla(tab: string, values: unknown[][]): Tabla {
  const R = values.map((r) => r.map((c) => String(c ?? "").trim()));
  const titulo = R[0]?.find(Boolean) || tab, nota = R[1]?.find(Boolean) || "";
  // Encabezado: la fila con más celdas llenas entre las primeras (desde la 3ª)
  let h = -1, best = 1;
  for (let i = 2; i < Math.min(R.length, 9); i++) if (nn(R[i]) > best) { best = nn(R[i]); h = i; }
  const meta: [string, string][] = [];
  for (let i = 2; i < (h < 0 ? 2 : h); i++) {
    const c = R[i].filter(Boolean);
    if (c.length >= 2) meta.push([c[0], c[1]]);
  }
  const head = h < 0 ? [] : R[h];
  const rows: string[][] = [], pies: string[] = [];
  for (const r of R.slice(h < 0 ? 2 : h + 1)) {
    if (!nn(r)) continue;
    // Notas al pie: una sola celda larga en la columna A
    if (head.length > 2 && nn(r) === 1 && r[0] && r[0].length > 60) pies.push(r[0]);
    else rows.push(r);
  }
  return { tab, titulo, nota, meta, head, rows, pies };
}

/** Índice de la primera columna cuyo encabezado empieza con alguno de los nombres (sin tildes ni mayúsculas) */
export function col(t: Tabla, ...nombres: string[]) {
  const H = t.head.map(norm);
  for (const n of nombres) {
    const i = H.findIndex((x) => x === norm(n));
    if (i >= 0) return i;
  }
  for (const n of nombres) {
    const i = H.findIndex((x) => x.startsWith(norm(n)));
    if (i >= 0) return i;
  }
  return -1;
}
export const cel = (r: string[], i: number) => (i >= 0 ? r[i] || "" : "");
export const metaDe = (t: Tabla | undefined, re: RegExp) => t?.meta.find(([k]) => re.test(k))?.[1] || "";
export const tablaDe = (l: Libro, re: RegExp) => l.tablas.find((t) => re.test(t.tab));

/** Fecha completa (dd/mm/aaaa o serial) → aaaa-mm-dd; si no tiene año, "" */
export const fechaPlan = (s: string) => (/^\d{1,2}\/\d{1,2}\/\d{4}|^\d{4}-\d{2}-\d{2}/.test(s) ? toISO(s) : "");
export function diasHasta(iso: string) {
  if (!iso) return null;
  return Math.round((Date.parse(iso) - Date.parse(hoyBA())) / 864e5);
}
export const cuenta = (d: number | null) =>
  d == null ? "" : d === 0 ? "es hoy" : d === 1 ? "mañana" : d > 0 ? `faltan ${d} días` : d === -1 ? "fue ayer" : `hace ${-d} días`;

async function cargar(id:string):Promise<Libro> {
  assertDemoSheetId(id);
  const m = await readDemoMetadata(id);
  const tabs:string[] = m.sheets.map((s:{properties:{title:string}})=>s.properties.title).filter(t=>!/instrucciones/i.test(t));
  const v = await ranges(id,tabs.map(t=>`'${t.replace(/'/g,"''")}'!A1:Z300`));
  return {id,nombre:m.properties.title,tablas:tabs.map((t,i)=>parseTabla(t,v[i]||[])),leido:new Date().toISOString()};
}

export const leerLibro = unstable_cache(cargar, ["plan-libro-v1"], { revalidate: REVALIDATE });

/** Mensaje de lectura: este tablero público no necesita una cuenta de servicio. */
export function errorPlan(_e: unknown, carpeta: string) {
  return `No pude leer las planillas de demostración de «${carpeta}». Probá de nuevo en un rato.`;
}

export type Archivo = { id: string; name: string };
/**
 * Lanzamientos ficticios con archivo propio definidos en el manifiesto de la demostración.
 */
async function listar(): Promise<Archivo[]> { return PLAN.lanzamientos; }

export const archivosLanzamiento = unstable_cache(listar, ["plan-archivos-v1"], { revalidate: 600 });

/** «Archivo propio: Colección Horizonte 26» → el archivo de esa carpeta */
export function archivoDe(texto: string, archivos: Archivo[]) {
  const m = texto.match(/archivo propio:\s*([^(;.]+)/i);
  if (!m) return undefined;
  const k = norm(m[1]);
  return archivos.find((a) => norm(a.name).startsWith(k));
}

export const tonoEstado = (s: string): "good" | "warn" | "bad" | "neu" =>
  /hecho|listo|entregad|ok|cumplid/i.test(s) ? "good" : /curso|proceso|haciendo/i.test(s) ? "warn" : /atrasad|cancel/i.test(s) ? "bad" : "neu";
