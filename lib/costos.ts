import "server-only";
import { unstable_cache } from "./demo-cache";
import { SHEETS, sheetUrl } from "./config";
import type { Data, Gasto } from "./data";
import { num, range, str, title } from "./data";
import { equilibrio, esFijo, esProduccion } from "./equilibrio";
import type { Extra } from "./extra";
import { claveModelo } from "./stock";
import { fmt } from "./fmt";
import { sumarDias } from "./semana";

/**
 * Cuánto deja cada vestido, en dos miradas:
 * - Sólo variables: precio − (tela, avíos, confección, estampado, etiquetas/packaging, merma, comisión y envío).
 * - Con fijos: además le carga su parte de los fijos del mes (01 · Gastos maestro, Tipo Fijo) ÷ prendas vendidas por mes.
 *
 * Los costos variables salen de la planilla «Costo unitario de cada producto» (hoja «Costo unitario») cuando está en el Drive.
 * Mientras no está, se estiman desde «Producción y stock» (tela y confección) y Gastos (otros variables).
 */
export const NOMBRE_PLANILLA = "Costo unitario de cada producto";

export type Parte = { k: "tela" | "avios" | "conf" | "estampa" | "pack" | "merma" | "otros" | "com" | "envio"; t: string; v: number; /** la cuenta, en palabras */ n?: string };
export type CostoVestido = {
  modelo: string; temp: string; partes: Parte[]; variable: number; precio: number;
  /** parte de los fijos y campañas que le toca: precio × fijoPct */
  fijo: number;
  dejaVar: number; dejaTot: number; ejemplos: number;
  notas: { precio: string; fijo: string };
};
export type Costos = {
  fuente: "planilla" | "estimado"; url?: string;
  /** fijoPct = (fijos del mes + campañas del mes) ÷ ventas del mes; fijo = promedio por vestido vendido */
  fijo: number; fijoPct: number; fijosMes: number; campanaMes: number; ventasMes: number; vendidosMes: number;
  /** Cómo se armó cada número, para mostrarlo en pantalla */
  como: { tela: string; conf: string; otros: string };
  modelos: CostoVestido[]; avisos: string[];
};

export { claveModelo };

const planillaId = async (): Promise<{id:string;error?:string}> => ({id:SHEETS.costos});

type Fila = { temp: string; modelo: string; partes: Parte[]; precio: number; ejemplos: number; notaPrecio?: string };

/** Lee la hoja «Costo unitario» buscando las columnas por su título (así se pueden mover o agregar columnas). */
async function leerPlanilla(id: string): Promise<Fila[]> {
  const rows = await range(id, "'Costo unitario'!A1:Z300");
  const h = rows.findIndex((r) => r.some((c) => /^modelo$/i.test(str(c))) && r.some((c) => /costo de f[aá]brica/i.test(str(c))));
  if (h < 0) throw new Error("no encontré los títulos (Modelo, Costo de fábrica) en la hoja «Costo unitario»");
  const head = rows[h].map((c) => str(c));
  const col = (re: RegExp) => head.findIndex((x) => re.test(x));
  const c = {
    temp: col(/^temporada/i), modelo: col(/^modelo$/i), tela: col(/^tela/i), avios: col(/^av[ií]os/i), conf: col(/^confecci/i),
    estampa: col(/^estampado/i), pack: col(/^etiquetas/i), merma: col(/^merma/i), precio: col(/^precio de venta/i),
    com: col(/^comisi[oó]n/i), ej: col(/^datos de ejemplo/i),
  };
  const v = (r: unknown[], i: number) => (i >= 0 ? num(r[i]) : 0);
  return rows.slice(h + 1).filter((r) => str(r[c.modelo]) && !/promedio/i.test(str(r[c.modelo])) && str(r[c.temp])).map((r) => ({
    temp: str(r[c.temp]), modelo: title(str(r[c.modelo])), precio: v(r, c.precio), ejemplos: v(r, c.ej),
    partes: [
      { k: "tela", t: "Tela", v: v(r, c.tela) }, { k: "conf", t: "Confección", v: v(r, c.conf) }, { k: "avios", t: "Avíos", v: v(r, c.avios) },
      { k: "estampa", t: "Estampado", v: v(r, c.estampa) }, { k: "pack", t: "Etiquetas y packaging", v: v(r, c.pack) },
      { k: "merma", t: "Merma", v: v(r, c.merma) }, { k: "com", t: "Comisión y envío", v: v(r, c.com) },
    ],
  }));
}

/**
 * Gastos variables de los últimos 90 días que son por vestido (envíos, packaging, avíos, comisiones), repartidos entre lo vendido.
 * Talleres y telas no entran (salen de Producción). Fotos, campañas, modelos y moldería no dependen de cuántos vestidos se hacen:
 * van con los fijos en la mirada «con fijos».
 */
export function variablesGastos(d: Data, hoy: string) {
  const desde = sumarDias(hoy, -89);
  const prendas = d.ventas.filter((v) => v.f >= desde && v.f <= hoy).reduce((a, v) => a + v.prendas, 0);
  const g = d.gastos.filter((x) => x.f >= desde && x.f <= hoy && !esFijo(x) && !esProduccion(x));
  const tipo = (x: Gasto): Parte["k"] | "campana" => {
    const t = `${x.cat} ${x.sub || ""}`;
    if (/env[ií]o|log[ií]stic|correo|cadete/i.test(t)) return "envio";
    if (/packaging|bolsa|caja|etiqueta/i.test(t)) return "pack";
    if (/cierre|mercer|av[ií]o|bot[oó]n|hilo|insumo/i.test(t)) return "avios";
    if (/comisi/i.test(t)) return "com";
    return "campana";
  };
  const suma = new Map<string, number>();
  for (const x of g) { const k = tipo(x); suma.set(k, (suma.get(k) || 0) + x.imp); }
  const por = (k: string) => (prendas ? (suma.get(k) || 0) / prendas : 0);
  const n = (k: string, que: string) => `${fmt.ars(suma.get(k) || 0)} de ${que} en los últimos 90 días (Gastos) ÷ ${fmt.n(prendas)} vestidos vendidos = ${fmt.ars(por(k))}`;
  return {
    prendas,
    partes: [
      { k: "avios", t: "Avíos (cierres, mercería)", v: por("avios"), n: n("avios", "cierres y mercería") },
      { k: "pack", t: "Packaging", v: por("pack"), n: n("pack", "packaging") },
      { k: "envio", t: "Envíos", v: por("envio"), n: n("envio", "envíos") },
      { k: "com", t: "Comisión de venta", v: por("com"), n: n("com", "comisiones de venta") },
    ] as Parte[],
    campanaMes: (suma.get("campana") || 0) / 3,
  };
}

/** Sin planilla: tela por modelo (compras con «Modelo destino» ÷ producidas), confección del taller y otros variables de Gastos. */
function estimar(d: Data, x: Extra | null, hoy: string, eq: ReturnType<typeof equilibrio>, otros: Parte[]): Fila[] {
  const prod = x?.prod || [];
  // Precio: promedio cobrado en los últimos 90 días; si el modelo no se vendió, el del último año
  const cobrado = (dias: number) => {
    const m = new Map<string, number>(), q = new Map<string, number>(), desde = sumarDias(hoy, -(dias - 1));
    for (const v of d.ventas) if (v.modelo && v.f >= desde && v.f <= hoy && v.prendas > 0) {
      const k = claveModelo(v.modelo); m.set(k, (m.get(k) || 0) + v.monto); q.set(k, (q.get(k) || 0) + v.prendas);
    }
    return new Map([...m].map(([k, v]) => [k, { p: v / q.get(k)!, n: `${fmt.ars(v)} cobrados por ${fmt.n(q.get(k)!)} ${q.get(k) === 1 ? "prenda" : "prendas"} en ${dias === 90 ? "los últimos 90 días" : "el último año"} (hoja Ventas)` }]));
  };
  const p90 = cobrado(90), p365 = cobrado(365);
  // Modelos: los de Producción (temporada más nueva) y los que están en el último conteo de stock
  const ultimaTemp = new Map<string, string>(), nombre = new Map<string, string>();
  for (const p of prod) { const k = claveModelo(p.modelo); if (!k) continue; if (!nombre.has(k) || (ultimaTemp.get(k) || "") < p.temp) { ultimaTemp.set(k, p.temp); nombre.set(k, p.modelo); } }
  for (const s of d.stock) { const k = claveModelo(s.modelo); if (!k || nombre.has(k)) continue; ultimaTemp.set(k, s.temporada); nombre.set(k, s.modelo); }
  // Sin precio sólo se muestran los de las dos últimas temporadas o con stock en el último conteo
  const temps = [...new Set(prod.map((p) => p.temp).filter(Boolean))].sort().slice(-2);
  const ultConteo = d.stock.reduce((a, s) => (s.fecha > a ? s.fecha : a), "");
  const vigentes = new Set([
    ...prod.filter((p) => temps.includes(p.temp)).map((p) => claveModelo(p.modelo)),
    ...d.stock.filter((s) => s.fecha === ultConteo && s.stock > 0).map((s) => claveModelo(s.modelo)),
  ]);
  for (const k of ["(sin nombre)", "sin nombre", ""]) { nombre.delete(k); ultimaTemp.delete(k); }
  const producidas = (k: string, t: string) => prod.filter((p) => p.temp === t && claveModelo(p.modelo) === k).reduce((a, p) => a + p.cant, 0);
  const filas: Fila[] = [];
  for (const [k, temp] of ultimaTemp) {
    const pv = p90.get(k) || p365.get(k), pr = pv?.p || 0; // sin ventas en el año: se muestra el costo igual, «sin precio»
    if (!pr && !vigentes.has(k)) continue; // modelos viejos que ya no se venden ni están en stock
    const q = producidas(k, temp);
    // Tela: compras de esa temporada cuyo «Modelo destino» nombra al modelo (si nombra varios, se reparte por producidas)
    let tela = 0, metros = 0;
    for (const c of (x?.telas || []).filter((c) => c.temp === temp && c.destino && !/usd|u\$s|dol/i.test(c.moneda))) {
      const destinos = c.destino!.split(/,| y /).map((s) => claveModelo(s.replace(/\(.*?\)|reposici[oó]n/gi, ""))).filter(Boolean);
      if (!destinos.includes(k)) continue;
      const qs = destinos.reduce((a, dd) => a + producidas(dd, temp), 0);
      tela += qs ? c.total * (q / qs) : 0; metros += qs ? c.metros * (q / qs) : 0;
    }
    const prom = `promedio de tela por prenda de ${eq.temp || "la temporada"} (todas las compras de tela ÷ todas las prendas producidas) = ${fmt.ars(eq.tela)}`;
    let notaTela = q && tela
      ? `${fmt.n(metros)} m comprados para ${nombre.get(k)} ${temp} por ${fmt.ars(tela)} (Compras de telas, «Modelo destino») ÷ ${fmt.n(q)} producidas = ${fmt.ars(tela / q)}`
      : `no hay compras de tela con «Modelo destino» ${nombre.get(k)} en ${temp}: ${prom}`;
    tela = q && tela ? tela / q : eq.tela;
    // Temporada recién empezada (pocas prendas hechas contra toda la tela comprada): se usa el promedio
    if (eq.tela && tela > 3 * eq.tela) { notaTela = `la tela comprada da ${fmt.ars(tela)} por prenda con sólo ${fmt.n(q)} hechas (revisar Compras de telas): ${prom}`; tela = eq.tela; }
    const conPrecio = prod.filter((p) => claveModelo(p.modelo) === k && p.precio > 0).sort((a, b) => b.temp.localeCompare(a.temp));
    const tc = conPrecio.length ? conPrecio.filter((p) => p.temp === conPrecio[0].temp) : [];
    const conf = tc.length ? tc.reduce((a, p) => a + p.precio * p.cant, 0) / Math.max(1, tc.reduce((a, p) => a + p.cant, 0)) : eq.confeccion;
    const notaConf = tc.length
      ? `«Precio confeccion unit» de ${nombre.get(k)} ${tc[0].temp} en Producción (taller ${tc[0].taller || "—"}) = ${fmt.ars(conf)}`
      : `${nombre.get(k)} no tiene precio de confección cargado en Producción: promedio de ${eq.temp || "la temporada"} = ${fmt.ars(eq.confeccion)}`;
    filas.push({
      temp, modelo: nombre.get(k) || k, precio: pr, ejemplos: 0, notaPrecio: pv?.n,
      partes: [{ k: "tela", t: "Tela", v: tela, n: notaTela }, { k: "conf", t: "Confección", v: conf, n: notaConf }, ...otros],
    });
  }
  return filas;
}

export async function costos(d: Data, x: Extra | null, hoy: string): Promise<Costos> {
  const eq = equilibrio(d, x, hoy);
  const vg = variablesGastos(d, hoy);
  const avisos: string[] = [];
  let filas: Fila[] = [], fuente: Costos["fuente"] = "estimado", url: string | undefined;
  {
    const { id, error } = await planillaId();
    if (id) {
      try { filas = await leerPlanilla(id); fuente = "planilla"; url = sheetUrl(id); }
      catch (e) { avisos.push(`Encontré la planilla «${NOMBRE_PLANILLA}» pero no la pude leer: ${String((e as Error).message).slice(0, 140)}.`); }
    } else {
      avisos.push(`Todavía no está la planilla «${NOMBRE_PLANILLA}» en el Drive${error ? ` (no la pude buscar: ${error})` : ""}. Mientras tanto, tela y confección salen de «Producción y stock» y el resto de Gastos.`);
    }
  }
  if (fuente === "estimado") {
    filas = estimar(d, x, hoy, eq, vg.partes);
    if (!x?.prod.length) avisos.push(`No pude leer la hoja Producción de «Producción y stock»${x?.errores.length ? ` (${x.errores.join("; ").slice(0, 160)})` : ""}: tela y confección son promedios de Gastos.`);
  }

  // Si un modelo está en dos temporadas, vale la más nueva
  const porModelo = new Map<string, Fila>();
  for (const f of filas) { const k = claveModelo(f.modelo), a = porModelo.get(k); if (!a || f.temp > a.temp) porModelo.set(k, f); }
  // Fijos y campañas se reparten según lo que se vende: cada vestido carga el mismo % de su precio.
  // El reparto proporcional al precio evita asignar el mismo importe fijo a prendas de distintos valores.
  const ventasMes = d.ventas.filter((v) => eq.mesesFijos.includes(v.f.slice(0, 7))).reduce((a, v) => a + v.monto, 0) / 3;
  const fijosTot = eq.fijosMes + vg.campanaMes;
  const fijoPct = ventasMes ? fijosTot / ventasMes : 0;
  const fijo = eq.vendidosMes ? fijosTot / eq.vendidosMes : 0;
  const notaFijo = ventasMes > 0
    ? `(${fmt.M(eq.fijosMes)} de fijos + ${fmt.M(vg.campanaMes)} de fotos y campañas por mes) ÷ ${fmt.M(ventasMes)} vendidos por mes = ${fmt.p(fijoPct, 1)} de cada venta`
    : "Sin ventas registradas para repartir los costos fijos y las campañas por prenda.";
  const modelos = [...porModelo.values()].map((f) => {
    const partes = f.partes.filter((p) => p.v > 0);
    const variable = partes.reduce((a, p) => a + p.v, 0);
    const fm = f.precio ? f.precio * fijoPct : fijo;
    return {
      modelo: f.modelo, temp: f.temp, partes, variable, precio: f.precio, fijo: fm,
      dejaVar: f.precio - variable, dejaTot: f.precio - variable - fm, ejemplos: f.ejemplos,
      notas: {
        precio: f.notaPrecio || (f.precio ? "precio de venta de la planilla" : "no se vendió en el último año"),
        fijo: f.precio ? `${fmt.ars(f.precio)} × ${fmt.p(fijoPct, 1)} = ${fmt.ars(fm)} — ${notaFijo}` : `sin precio: promedio por vestido vendido = ${fmt.ars(fijo)}`,
      },
    };
  }).filter((m) => m.variable > 0).sort((a, b) => b.dejaVar - a.dejaVar);
  if (fijosTot > 0 && !eq.vendidosMes) avisos.push("Sin ventas registradas para repartir los costos fijos y las campañas. Por ahora se muestran los costos variables por prenda.");
  else if (!fijosTot) avisos.push("No encontré gastos fijos ni campañas en los últimos 3 meses: la mirada con fijos queda igual que la de variables.");
  const como = {
    tela: "Compras de telas de la temporada con «Modelo destino» = el modelo, dividido las prendas producidas de ese modelo (Producción). Si el modelo no tiene compras con destino, el promedio de la temporada.",
    conf: "«Precio confeccion unit» de la hoja Producción (lo que cobra el taller por prenda). Si el modelo no lo tiene, el promedio de la temporada.",
    otros: `Gastos variables de los últimos 90 días que son por vestido (envíos, packaging, cierres y mercería, comisión de la vendedora), divididos los ${Math.round(vg.prendas)} vestidos vendidos en esos 90 días. Iguales para todos los modelos.`,
  };
  return { fuente, url, fijo, fijoPct, fijosMes: eq.fijosMes, campanaMes: vg.campanaMes, ventasMes, vendidosMes: eq.vendidosMes, como, modelos, avisos };
}
