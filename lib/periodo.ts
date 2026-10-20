import { addMonths, hoyBA, mesLargo, temporada, ym } from "./fmt";

export type P = "mes" | "prev" | "temp" | "12m";
export const OPTS: [P, string][] = [["mes", "Este mes"], ["prev", "Mes pasado"], ["temp", "Temporada"], ["12m", "12 meses"]];

const shift = (iso: string, months: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(d, last));
  return t.toISOString().slice(0, 10);
};

/** Rango del período elegido y el rango comparable anterior (mismo largo, hasta el mismo día). */
export function rango(p: string | undefined) {
  const hoy = hoyBA(), mes = ym(hoy);
  const k = (OPTS.find(([x]) => x === p)?.[0] || "mes") as P;
  if (k === "mes") {
    const desde = mes + "-01";
    return { k, desde, hasta: hoy, label: mesLargo(mes), cmp: { desde: shift(desde, -1), hasta: shift(hoy, -1), label: "mismos días del mes pasado" } };
  }
  if (k === "prev") {
    const pm = addMonths(mes, -1), desde = pm + "-01";
    const fin = new Date(Date.UTC(Number(pm.slice(0, 4)), Number(pm.slice(5, 7)), 0)).toISOString().slice(0, 10);
    return { k, desde, hasta: fin, label: mesLargo(pm), cmp: { desde: shift(desde, -1), hasta: shift(fin, -1), label: "el mes anterior" } };
  }
  if (k === "temp") {
    const t = temporada(hoy);
    return { k, desde: t.desde, hasta: hoy, label: `Temporada ${t.nombre} (desde agosto)`, cmp: { desde: shift(t.desde, -12), hasta: shift(hoy, -12), label: "mismo tramo de la temporada anterior" } };
  }
  const desde = shift(hoy, -12);
  return { k, desde, hasta: hoy, label: "Últimos 12 meses", cmp: { desde: shift(hoy, -24), hasta: desde, label: "los 12 meses anteriores" } };
}

export const inR = (f: string, r: { desde: string; hasta: string }) => f >= r.desde && f <= r.hasta;

/** Últimos n meses terminando en el actual: ["2025-11", …, "2026-10"] */
export const ultimosMeses = (n: number) => {
  const m = ym(hoyBA());
  return Array.from({ length: n }, (_, i) => addMonths(m, i - n + 1));
};

/** Un mes entero («aaaa-mm»); el mes actual llega hasta hoy. Se compara con los mismos días del mes anterior. */
export function rangoMes(m: string) {
  const hoy = hoyBA();
  if (m >= ym(hoy)) return rango("mes");
  const desde = m + "-01";
  const fin = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0)).toISOString().slice(0, 10);
  return { k: "prev" as P, desde, hasta: fin, label: mesLargo(m), cmp: { desde: shift(desde, -1), hasta: shift(fin, -1), label: "el mes anterior" } };
}

/** n meses terminando en `hasta` («aaaa-mm», por defecto el actual) */
export const mesesHasta = (n: number, hasta = ym(hoyBA())) => Array.from({ length: n }, (_, i) => addMonths(hasta, i - n + 1));
