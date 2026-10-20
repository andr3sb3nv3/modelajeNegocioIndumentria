import type { Venta } from "./data";
import { claveModelo } from "./costos";
import { grupoCanal, normMedio, temporada } from "./fmt";

/** Efectivo, transferencia y dólares tienen 15% off por política: no es descuento de temporada. */
export const OFF_CONTADO = 0.15;
/** Hasta 7% por debajo del precio de lista sigue contando como precio lleno (redondeos, recargos chicos). */
const TOLERANCIA = 0.93;

const contado = (medio: string) => ["Transferencia", "Efectivo", "Dólares"].includes(normMedio(medio));

export type VentaPL = Venta & { k: string; temp: string; lista: number; /** precio como si fuera con tarjeta */ norm: number; lleno: boolean; /** lo que se dejó de cobrar */ resigna: number };
export type Grupo = { q: number; qLleno: number; m: number; mLleno: number; resigna: number; off: number[] };

/**
 * Precio lleno: no hay precio de lista cargado, así que se infiere de las ventas.
 * Precio de lista de un modelo = el precio con tarjeta más alto que se repitió al menos 2 veces,
 * en esa temporada o en las anteriores (un vestido de la temporada pasada vendido más barato cuenta como descuento).
 * Las ventas en efectivo/transferencia se pasan a precio tarjeta (÷ 0,85) antes de comparar.
 */
export function precioLleno(ventas: Venta[]) {
  const vs = ventas.filter((v) => v.modelo && v.prendas > 0 && v.monto > 0 && grupoCanal(v.canal) !== "Otros canales").map((v) => {
    const u = v.monto / v.prendas;
    return { ...v, k: claveModelo(v.modelo), temp: temporada(v.f).nombre, u, norm: contado(v.medio) ? u / (1 - OFF_CONTADO) : u, tarjeta: !contado(v.medio) };
  });
  // precios con tarjeta por modelo y temporada (en miles, para que 379.999 y 380.000 sean el mismo)
  const precios = new Map<string, Map<string, number[]>>();
  for (const v of vs) {
    const t = precios.get(v.k) || new Map<string, number[]>();
    const a = t.get(v.temp) || [];
    a.push(Math.round((v.tarjeta ? v.u : v.norm) / 1000) * (v.tarjeta ? 1 : -1)); // negativos = pasados de contado
    t.set(v.temp, a); precios.set(v.k, t);
  }
  const listas = new Map<string, number>();
  for (const [k, t] of precios) {
    let acum: number[] = [];
    for (const temp of [...t.keys()].sort()) {
      acum = acum.concat(t.get(temp)!);
      const tarj = acum.filter((p) => p > 0), cuenta = new Map<number, number>();
      for (const p of tarj) cuenta.set(p, (cuenta.get(p) || 0) + 1);
      const rep = [...cuenta].filter(([, c]) => c >= 2).map(([p]) => p);
      const lista = rep.length ? Math.max(...rep) : tarj.length ? Math.max(...tarj) : Math.max(...acum.map(Math.abs));
      listas.set(`${k}|${temp}`, lista * 1000);
    }
  }
  const out: VentaPL[] = vs.map((v) => {
    const lista = listas.get(`${v.k}|${v.temp}`) || v.norm, lleno = v.norm >= lista * TOLERANCIA;
    const debio = lista * (contado(v.medio) ? 1 - OFF_CONTADO : 1) * v.prendas;
    return { ...v, lista, lleno, resigna: lleno ? 0 : Math.max(0, debio - v.monto) };
  });
  return out;
}

export function agrupar(vs: VentaPL[]): Grupo {
  const g: Grupo = { q: 0, qLleno: 0, m: 0, mLleno: 0, resigna: 0, off: [] };
  for (const v of vs) {
    g.q += v.prendas; g.m += v.monto; g.resigna += v.resigna;
    if (v.lleno) { g.qLleno += v.prendas; g.mLleno += v.monto; } else g.off.push(1 - v.norm / v.lista);
  }
  return g;
}
