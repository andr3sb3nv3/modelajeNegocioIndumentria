import type { Data, Gasto } from "./data";
import type { Extra } from "./extra";
import { addMonths, temporada, ym } from "./fmt";
import { esFijo, resultado } from "./resultado";
import { sumarDias } from "./semana";

export { esFijo };

/**
 * Punto de equilibrio de la marca demo: cuánto cuesta cada vestido y cuántos hay que vender para cubrir lo fijo.
 *
 * Criterio (editable en la planilla 01 · Gastos maestro, columna «Tipo»):
 * - Fijo: «Tipo» dice Fijo. Si «Tipo» está vacío, sueldos, alquileres y servicios.
 * - Variable: todo lo demás.
 * - Tela y confección salen de «Producción y stock» (precio de confección por prenda y compras de telas por temporada),
 *   así que los gastos de talleres, confección y telas de la planilla de Gastos no se vuelven a sumar.
 */
const ES_PRODUCCION = /taller|confec|producci|tela/i;
/** Talleres y telas se miran en categoría y subcategoría (ej. «Otros › Confección / Taller») para no contarlos dos veces */
export const esProduccion = (g: Gasto) => ES_PRODUCCION.test(`${g.cat} ${g.sub || ""}`);

export type CostoModelo = { modelo: string; vendidos: number; precio: number; costo: number; margen: number };
export type Equilibrio = {
  temp: string; fuente: "produccion" | "gastos";
  tela: number; confeccion: number; otros: number; variable: number;
  precio: number; margen: number;
  fijosMes: number; mesesFijos: string[]; vendidosMes: number; producidosMes: number;
  fijoPorVendido: number; fijoPorProducido: number;
  equilibrio: number; // vestidos por mes para cubrir lo fijo
  otrosCats: [string, number][]; fijosCats: [string, number][];
  modelos: CostoModelo[];
  mes: { dias: string[]; acumulado: number[]; vendidos: number; cruce: string | null; proyeccion: number; diasMes: number };
  avisos: string[];
};

const suma = <T,>(a: T[], f: (x: T) => number) => a.reduce((s, x) => s + f(x), 0);
const porCat = (g: Gasto[]) => {
  const m = new Map<string, number>();
  for (const x of g) m.set(x.cat, (m.get(x.cat) || 0) + x.imp);
  return [...m].sort((a, b) => b[1] - a[1]);
};

export function equilibrio(d: Data, x: Extra | null, hoy: string): Equilibrio {
  const avisos: string[] = [];
  const mes = ym(hoy);
  const meses3 = [addMonths(mes, -3), addMonths(mes, -2), addMonths(mes, -1)];
  const desde90 = sumarDias(hoy, -89);
  const v90 = d.ventas.filter((v) => v.f >= desde90 && v.f <= hoy);
  const prendas90 = suma(v90, (v) => v.prendas);
  const precio = prendas90 ? suma(v90, (v) => v.monto) / prendas90 : 0;

  // Tela y confección por vestido: temporada actual si ya tiene precios de confección, si no la anterior
  const tAct = temporada(hoy).nombre, tAnt = "T" + (Number(tAct.slice(1)) - 1);
  const prod = x?.prod || [];
  const conPrecio = (t: string) => prod.filter((p) => p.temp === t && p.precio > 0 && p.cant > 0);
  const temp = conPrecio(tAct).length ? tAct : conPrecio(tAnt).length ? tAnt : "";
  let tela = 0, confeccion = 0, producidosMes = 0, fuente: Equilibrio["fuente"] = "produccion";
  const confModelo = new Map<string, number>();
  if (temp) {
    const filas = conPrecio(temp);
    confeccion = suma(filas, (p) => p.precio * p.cant) / suma(filas, (p) => p.cant);
    const porM = new Map<string, [number, number]>();
    for (const p of filas) { const a = porM.get(p.modelo) || [0, 0]; porM.set(p.modelo, [a[0] + p.precio * p.cant, a[1] + p.cant]); }
    for (const [m, [s, q]] of porM) confModelo.set(m, s / q);
    const producidas = (t: string) => suma(prod.filter((p) => p.temp === t), (p) => p.cant);
    const telaPor = (t: string) => {
      const telas = (x?.telas || []).filter((c) => c.temp === t);
      const ars = telas.filter((c) => !/usd|u\$s|dol/i.test(c.moneda));
      if (ars.length < telas.length) avisos.push(`${telas.length - ars.length} compras de tela de ${t} en dólares no entran en el costo de tela.`);
      return producidas(t) ? suma(ars, (c) => c.total) / producidas(t) : 0;
    };
    tela = telaPor(temp);
    if (!tela && temp === tAct) {
      tela = telaPor(tAnt);
      avisos.push(tela ? `Todavía no hay compras de tela de ${tAct}: uso la tela por prenda de ${tAnt}.` : `No hay compras de tela cargadas para ${tAct} ni ${tAnt}.`);
    } else if (!tela) avisos.push(`No hay compras de tela cargadas para ${temp}.`);
    producidosMes = producidas(temp) / 12;
  } else {
    // Sin planilla de producción: talleres y telas de Gastos (12 meses) repartidos entre lo vendido
    fuente = "gastos";
    const desde12 = sumarDias(hoy, -364);
    const g12 = d.gastos.filter((g) => g.f >= desde12 && g.f <= hoy && !esFijo(g));
    const p12 = suma(d.ventas.filter((v) => v.f >= desde12 && v.f <= hoy), (v) => v.prendas);
    tela = p12 ? suma(g12.filter((g) => /tela/i.test(g.cat)), (g) => g.imp) / p12 : 0;
    confeccion = p12 ? suma(g12.filter((g) => esProduccion(g) && !/tela/i.test(g.cat)), (g) => g.imp) / p12 : 0;
    avisos.push("No pude leer precios de confección en «Producción y stock»: tela y confección salen de Gastos.");
  }

  // Otros variables (envíos, packaging, publicidad, avíos…) de los últimos 90 días, repartidos entre lo vendido
  const otrosG = d.gastos.filter((g) => g.f >= desde90 && g.f <= hoy && !esFijo(g) && !esProduccion(g));
  const otros = prendas90 ? suma(otrosG, (g) => g.imp) / prendas90 : 0;
  const variable = tela + confeccion + otros;
  const margen = precio - variable;

  // Fijos: promedio de los últimos 3 meses cerrados (el mes en curso suele estar incompleto)
  const fijosG = d.gastos.filter((g) => esFijo(g) && meses3.includes(ym(g.f)));
  const fijosMes = suma(fijosG, (g) => g.imp) / 3;
  const vendidosMes = suma(d.ventas.filter((v) => meses3.includes(ym(v.f))), (v) => v.prendas) / 3;
  const eq = margen > 0 ? fijosMes / margen : Infinity;

  // Por modelo (últimos 90 días)
  const vm = new Map<string, [number, number]>();
  for (const v of v90) if (v.modelo) { const a = vm.get(v.modelo) || [0, 0]; vm.set(v.modelo, [a[0] + v.monto, a[1] + v.prendas]); }
  const modelos = [...vm].filter(([, [, q]]) => q > 0).map(([modelo, [m, q]]) => {
    const costo = tela + (confModelo.get(modelo) ?? confeccion) + otros, pr = m / q;
    return { modelo, vendidos: q, precio: pr, costo, margen: pr - costo };
  }).sort((a, b) => b.vendidos - a.vendidos).slice(0, 8);

  // Este mes, día por día: lo que deja cada venta (precio − costo variable) acumulado contra lo fijo
  const dia1 = mes + "-01";
  const diasMes = new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0)).getUTCDate();
  const dias: string[] = [], acumulado: number[] = [];
  let acc = 0, vendidos = 0, cruce: string | null = null;
  for (let f = dia1; f <= hoy; f = sumarDias(f, 1)) {
    // Misma cuenta que el P&L: ventas del día menos los gastos variables cargados ese día
    const r = resultado(d, f, f);
    acc += r.ventas - r.variables;
    vendidos += r.prendas;
    dias.push(f); acumulado.push(acc);
    if (!cruce && fijosMes > 0 && acc >= fijosMes) cruce = f;
  }
  const proyeccion = dias.length ? (acc / dias.length) * diasMes : 0;

  if (!precio) avisos.push("No hay ventas en los últimos 90 días para sacar el precio promedio.");
  return {
    temp, fuente, tela, confeccion, otros, variable, precio, margen,
    fijosMes, mesesFijos: meses3, vendidosMes, producidosMes,
    fijoPorVendido: vendidosMes ? fijosMes / vendidosMes : 0,
    fijoPorProducido: producidosMes ? fijosMes / producidosMes : 0,
    equilibrio: eq, otrosCats: porCat(otrosG), fijosCats: porCat(fijosG).map(([c, v]) => [c, v / 3]),
    modelos, mes: { dias, acumulado, vendidos, cruce, proyeccion, diasMes }, avisos,
  };
}
