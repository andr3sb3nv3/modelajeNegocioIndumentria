/**
 * Canal mayorista, segunda opción (multimarcas): las mismas cuentas que la planilla «Canal mayorista · multimarcas» (scripts/multimarcas.py),
 * para que el simulador de /pruebas-4?m=multi dé lo mismo que el Excel cuando se mueven los supuestos.
 */
import modelo from "@/data/mayorista/multimarcas.json";

export type Params = typeof modelo.params;
export type ModeloBase = { temp: string; modelo: string; prod: number; pvp: number; fab: number; dejaMin: number };
export type ModeloMay = ModeloBase & { may: number; log: number; fin: number; fal: number; costo: number; deja: number; margen: number; fijo: number; dejaFijo: number; vsMin: number; va: boolean };
export type Escenario = { nombre: string; modo: "Consignación" | "Compra en firme"; tiendas: number; xt: number; st: number; ag: number };

export const DATOS = modelo;

/** Hoja «Modelo por modelo»: precio mayorista = PVP ÷ multiplicador; costos del canal; ¿entra en la colección? */
export function porModelo(ms: ModeloBase[], p: Params, mult = p.mult): ModeloMay[] {
  return ms.map((m) => {
    const may = m.pvp / mult, fin = may * p.tasa * p.plazo / 30, fal = may * p.devol;
    const costo = m.fab + p.log + fin + fal, deja = may - costo, margen = may > 0 ? deja / may : 0, fijo = may * p.fijoPct;
    return { ...m, may, log: p.log, fin, fal, costo, deja, margen, fijo, dejaFijo: deja - fijo, vsMin: m.dejaMin > 0 ? deja / m.dejaMin : 0, va: margen >= p.umbral };
  });
}

/** Fila «Promedio de la colección mayorista»: sólo los que van, pesado por producidas. */
export function promedio(ms: ModeloMay[]) {
  const sel = ms.filter((m) => m.va), q = sel.reduce((a, m) => a + m.prod, 0);
  const pr = (f: (m: ModeloMay) => number) => (q ? sel.reduce((a, m) => a + f(m) * m.prod, 0) / q : 0);
  return { n: sel.length, pvp: pr((m) => m.pvp), fab: pr((m) => m.fab), may: pr((m) => m.may), deja: pr((m) => m.deja), dejaMin: pr((m) => m.dejaMin), costo: pr((m) => m.costo) };
}

/** Hoja «Escenarios», una columna. */
export function escenario(e: Escenario, ms: ModeloMay[], p: Params) {
  const a = promedio(ms), consig = e.modo === "Consignación";
  const st = consig ? e.st : 1;
  const ent = e.tiendas * e.xt, vend = Math.round(ent * st), dev = ent - vend;
  const pu = consig ? a.pvp * (1 - p.consig) : a.may;
  const fact = vend * pu, cfab = vend * a.fab;
  const clog = ent * p.log + (consig ? dev * p.log : 0);
  const cfin = fact * p.tasa * (consig ? p.plazoC : p.plazo) / 30;
  const cfal = consig ? dev * p.deter * a.fab : fact * p.devol;
  const cag = e.ag * fact * p.agente;
  const contrib = fact - cfab - clog - cfin - cfal - cag;
  const fmues = a.n * a.fab, ffot = p.fotos, fvis = p.visitas * p.meses, fferia = e.ag * p.feria;
  const fijos = fmues + ffot + fvis + fferia, res = contrib - fijos;
  const pe = contrib > 0 && vend > 0 ? Math.ceil(fijos / (contrib / vend)) : null;
  const peT = pe !== null ? Math.ceil(pe / (e.xt * st)) : null;
  const prodMes = ent / p.meses;
  return {
    ent, vend, dev, pu, fact, cfab, clog, cfin, cfal, cag, contrib, fmues, ffot, fvis, fferia, fijos, res,
    resMes: res / p.meses, cons: res - fact * p.fijoPct, pe, peT, prodMes, capPct: prodMes / p.cap, capital: ent * a.fab + fmues, mix: a,
  };
}
