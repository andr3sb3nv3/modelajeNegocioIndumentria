import type { Data, Gasto } from "./data";

/**
 * La cuenta del P&L, una sola para toda la app (P&L, Inicio › Mes y el gráfico de utilidad, Pulso).
 * Ventas = planilla 02 · Ventas maestro. Gastos = planilla 01 · Gastos maestro por la fecha cargada.
 * Fijo o variable: columna «Tipo»; si está vacía, sueldos, alquileres y servicios son fijos.
 * Resultado = ventas − fijos − variables (mirada de caja, no contable).
 */
export const esFijo = (g: Gasto) => /fij/i.test(g.tipo) || (!g.tipo && /sueldo|alquiler|servicio/i.test(g.cat));

export type Resultado = { ventas: number; prendas: number; fijos: number; variables: number; resultado: number };
export type DiaResultado = { f: string; ventas: number; prendas: number; variables: number; fijos: number };

const en = (f: string, desde: string, hasta: string) => !!f && f >= desde && f <= hasta;

/** Ventas, fijos, variables y resultado entre dos fechas (inclusive). */
export function resultado(d: Data, desde: string, hasta: string): Resultado {
  const vs = d.ventas.filter((v) => en(v.f, desde, hasta)), gs = d.gastos.filter((g) => en(g.f, desde, hasta));
  const ventas = vs.reduce((a, v) => a + v.monto, 0), prendas = vs.reduce((a, v) => a + v.prendas, 0);
  const fijos = gs.filter(esFijo).reduce((a, g) => a + g.imp, 0), variables = gs.filter((g) => !esFijo(g)).reduce((a, g) => a + g.imp, 0);
  return { ventas, prendas, fijos, variables, resultado: ventas - fijos - variables };
}

const sumarDias = (iso: string, k: number) => new Date(Date.parse(iso + "T12:00:00Z") + k * 864e5).toISOString().slice(0, 10);

/** La misma cuenta, día por día. */
export function resultadoDiario(d: Data, desde: string, hasta: string): DiaResultado[] {
  const out: DiaResultado[] = [];
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) {
    const r = resultado(d, f, f);
    out.push({ f, ventas: r.ventas, prendas: r.prendas, variables: r.variables, fijos: r.fijos });
  }
  return out;
}

/** La fila del P&L para un mes «aaaa-mm»: el mes entero, aunque esté en curso. Inicio › Mes muestra exactamente esto. */
export const resultadoMes = (d: Data, m: string) => { const { desde, hasta } = limitesMes(m); return resultado(d, desde, hasta); };

/** Primer y último día de un mes «aaaa-mm». */
export const limitesMes = (m: string) => ({ desde: `${m}-01`, hasta: new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0)).toISOString().slice(0, 10) });
