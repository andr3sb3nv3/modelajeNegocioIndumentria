import { DEMO_AS_OF } from "./config";
const NF = new Intl.NumberFormat("es-AR");
export const fmt = {
  n: (v: number) => NF.format(Math.round(v)),
  ars: (v: number) => "$ " + NF.format(Math.round(v)),
  M: (v: number) =>
    Math.abs(v) >= 1e6
      ? "$ " + (v / 1e6).toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " M"
      : Math.abs(v) >= 1e3 ? "$ " + NF.format(Math.round(v / 1e3)) + " mil" : "$ " + NF.format(Math.round(v)),
  p: (v: number, d = 0) => (v * 100).toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d }) + "%",
  var: (a: number, b: number) => (b ? (a >= b ? "+" : "") + fmt.p(a / b - 1) : "—"),
};

export const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const MESES_L = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Hoy en Buenos Aires como aaaa-mm-dd */
export const hoyBA = () => DEMO_AS_OF;

export const ym = (iso: string) => iso.slice(0, 7);
export function addMonths(ymStr: string, k: number) {
  const [y, m] = ymStr.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + k, 1));
  return d.toISOString().slice(0, 7);
}
export const mesLabel = (ymStr: string) => MESES[Number(ymStr.slice(5, 7)) - 1];
export const mesLargo = (ymStr: string) => MESES_L[Number(ymStr.slice(5, 7)) - 1] + " " + ymStr.slice(0, 4);
export const fechaCorta = (iso: string) => (iso ? `${Number(iso.slice(8, 10))} ${MESES[Number(iso.slice(5, 7)) - 1]}` : "");

/** Temporada la marca demo: agosto a julio. T27 = ago-2026 a jul-2027 */
export function temporada(iso: string) {
  const y = Number(iso.slice(0, 4)), m = Number(iso.slice(5, 7));
  const fin = m >= 8 ? y + 1 : y;
  return { nombre: "T" + String(fin).slice(2), desde: `${fin - 1}-08-01`, hasta: `${fin}-07-31` };
}

export function sumBy<T>(a: T[], key: (x: T) => string, val: (x: T) => number) {
  const m = new Map<string, number>();
  for (const x of a) m.set(key(x), (m.get(key(x)) || 0) + val(x));
  return [...m.entries()].sort((p, q) => q[1] - p[1]);
}

export function normMedio(s: string) {
  const t = s.toLowerCase();
  if (!t) return "Sin dato";
  if (/tarj|link|nube|cuota|cr[eé]dito|d[eé]bito/.test(t)) return "Tarjeta";
  if (/transf|trasf/.test(t)) return "Transferencia";
  if (/efect/.test(t)) return "Efectivo";
  if (/d[oó]l|usd/.test(t)) return "Dólares";
  if (/mercado|^mp$/.test(t)) return "Mercado Pago";
  return "Otros";
}

/** Color fijo por canal (paleta de los tableros la marca demo) */
export function colorCanal(c: string) {
  const k = c.toLowerCase();
  if (k.includes("rosario")) return "var(--s1)";
  if (k.includes("mendoza")) return "var(--s2)";
  if (k.includes("online") || k.includes("web") || k.includes("shop")) return "var(--s3)";
  return "var(--s4)";
}

export const grupoCanal = (c: string) => {
  const k = c.toLowerCase();
  return k.includes("rosario") ? "Rosario" : k.includes("mendoza") ? "Mendoza" : /online|web|shop/.test(k) ? "Online" : "Otros canales";
};
export const CANALES = ["Rosario", "Mendoza", "Online", "Otros canales"];
