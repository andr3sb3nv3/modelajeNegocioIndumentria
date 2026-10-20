/**
 * Canal mayorista (vender a todo el país desde Tiendanube): las mismas cuentas que la planilla «Canal mayorista»
 * (scripts/mayorista.py), para que el simulador de /pruebas-4 dé lo mismo que el Excel cuando se mueven los supuestos.
 */
import modelo from "@/data/mayorista/modelo.json";

export type Params = typeof modelo.params;
export type ModeloBase = { temp: string; modelo: string; prod: number; pvp: number; fab: number; dejaMin: number };
export type ModeloOn = ModeloBase & {
  onCom: number; onEnv: number; onFal: number; onCac: number; dejaOn: number;
  rev: number; revCob: number; dejaRev: number; margenRev: number; may: number; dejaMay: number; va: boolean;
};
export type Directo = { vmes: number; cac: number };
export type Reven = { nrev: number; xr: number };

export const DATOS = modelo;

/** Hoja «Modelo por modelo»: cuánto deja cada vestido directo, con revendedora y con multimarca; ¿entra en la colección? */
export function porModelo(ms: ModeloBase[], p: Params): ModeloOn[] {
  return ms.map((m) => {
    const onCom = m.pvp * p.comOn, onEnv = p.envOn * (1 + 2 * p.camb), onFal = m.pvp * p.devol, onCac = p.cac;
    const rev = m.pvp * (1 - p.descRev), revCob = rev * (p.comOn + p.devol), dejaRev = rev - m.fab - revCob, margenRev = rev > 0 ? dejaRev / rev : 0;
    const may = m.pvp / p.mult, dejaMay = may - m.fab - p.log - may * p.tasa * p.plazo / 30 - may * p.devol;
    return { ...m, onCom, onEnv, onFal, onCac, dejaOn: m.pvp - m.fab - onCom - onEnv - onFal - onCac, rev, revCob, dejaRev, margenRev, may, dejaMay, va: margenRev >= p.umbral };
  });
}

/** Fila «Promedio de la colección para todo el país»: sólo los que van, pesado por producidas. */
export function promedio(ms: ModeloOn[]) {
  const sel = ms.filter((m) => m.va), q = sel.reduce((a, m) => a + m.prod, 0);
  const pr = (f: (m: ModeloOn) => number) => (q ? sel.reduce((a, m) => a + f(m) * m.prod, 0) / q : 0);
  return {
    n: sel.length, pvp: pr((m) => m.pvp), fab: pr((m) => m.fab), dejaMin: pr((m) => m.dejaMin),
    onCom: pr((m) => m.onCom), onEnv: pr((m) => m.onEnv), onFal: pr((m) => m.onFal),
    rev: pr((m) => m.rev), dejaRev: pr((m) => m.dejaRev), may: pr((m) => m.may), dejaMay: pr((m) => m.dejaMay),
  };
}
type Prom = ReturnType<typeof promedio>;

/** Hoja «Directo a todo el país», una columna (cac = pauta por venta nueva de ese escenario). */
export function directo(e: Directo, a: Prom, p: Params) {
  const q = e.vmes * p.meses, deja = a.pvp - a.fab - a.onCom - a.onEnv - a.onFal - e.cac;
  const res = q * deja - p.fotos;
  return { q, deja, fact: q * a.pvp, pautaMes: e.vmes * e.cac, res, resMes: res / p.meses, prodMes: e.vmes, capPct: e.vmes / p.cap, capital: e.vmes * p.mesesStock * a.fab };
}

/** Hoja «Revendedoras online», una columna. */
export function reven(e: Reven, a: Prom, p: Params) {
  const q = e.nrev * e.xr, res = q * a.dejaRev - (p.fotos + p.pautaMay * p.meses), prodMes = q / p.meses;
  return { q, deja: a.dejaRev, fact: q * a.rev, res, resMes: res / p.meses, prodMes, capPct: prodMes / p.cap, capital: prodMes * a.fab };
}
