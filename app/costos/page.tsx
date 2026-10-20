import { CostoUnitario } from "@/components/CostoUnitario";
import { VolumenRotacion } from "@/components/VolumenRotacion";
import { ErrorBox, Page } from "@/components/Page";
import { claveModelo, costos } from "@/lib/costos";
import { getData } from "@/lib/data";
import { getExtra } from "@/lib/extra";
import { SHEETS } from "@/lib/config";
import { linkPestana } from "@/lib/pestanas";
import { hoyBA } from "@/lib/fmt";
import { sumarDias } from "@/lib/semana";
import { stockEnVivo, vigentes } from "@/lib/stock";
import { vendidasSinDescontar } from "@/lib/stock-modelo";

export const dynamic = "force-dynamic";

/** Costo unitario de cada vestido, sólo variables o con los fijos incluidos (sólo la dueña: puedeVer). */
export default async function Costos({ searchParams }: { searchParams: Promise<{ c?: string; t?: string }> }) {
  const { c: mirada, t: tempRot = "" } = await searchParams;
  const conFijos = mirada === "total";
  const url = (total: boolean, t: string) => { const q = new URLSearchParams(); if (total) q.set("c", "total"); if (t) q.set("t", t); const x = q.toString(); return x ? `/costos?${x}` : "/costos"; };
  let d, c, s;
  try {
    d = await getData();
    const hoy = hoyBA();
    [c, s] = await Promise.all([costos(d, await getExtra().catch(() => null), hoy), stockEnVivo(d.stock, d.ventas).catch(() => null)]);
  } catch (e) { return <ErrorBox e={e} />; }
  const hoy = hoyBA(), desde = sumarDias(hoy, -89);
  const stock = new Map<string, number>(), vendidos = new Map<string, number>();
  const talles = new Map<string, Map<string, number>>(), vendT = new Map<string, Map<string, number>>();
  const sumar = (m: Map<string, Map<string, number>>, k: string, t: string, q: number) => { const x = m.get(k) || new Map<string, number>(); x.set(t, (x.get(t) || 0) + q); m.set(k, x); };
  for (const i of s?.items || []) { const k = claveModelo(i.modelo); stock.set(k, (stock.get(k) || 0) + Math.max(0, i.q)); sumar(talles, k, i.talle, Math.max(0, i.q)); }
  // Ventas de la hoja Ventas desde el último conteo que no pasaron por la app ni por Tiendanube: se descuentan por modelo
  const sinDesc = s ? vendidasSinDescontar(s) : { porModelo: new Map<string, number>(), total: 0, desde: "" };
  for (const [k, q] of sinDesc.porModelo) stock.set(k, Math.max(0, (stock.get(k) || 0) - q));
  for (const m of vigentes(s?.movs || [])) if (m.tipo === "venta" && m.f >= desde && m.f <= hoy) sumar(vendT, claveModelo(m.modelo), m.talle, Math.abs(m.cant));
  for (const v of d.ventas) if (v.modelo && v.f >= desde && v.f <= hoy) { const k = claveModelo(v.modelo); vendidos.set(k, (vendidos.get(k) || 0) + v.prendas); }
  // De dónde sale cada número: link directo a cada pestaña
  const [lCompras, lProd, lGastos, lVentas] = await Promise.all([
    linkPestana(SHEETS.stock, "Compras de telas"), linkPestana(SHEETS.stock, "Producción"),
    linkPestana(SHEETS.gastos, "Gastos"), linkPestana(SHEETS.ventas, "Todos"),
  ]);
  const fuentes = {
    compras: { t: "Producción y stock › Compras de telas", u: lCompras },
    prod: { t: "Producción y stock › Producción", u: lProd },
    gastos: { t: "01 · Gastos maestro › Gastos", u: lGastos },
    ventas: { t: "02 · Ventas maestro › Todos", u: lVentas },
  };
  return (
    <Page compu leido={d.leido} eyebrow="Costo unitario" title={<>Cuánto cuesta <em>cada vestido</em></>}
      lede={conFijos ? "Con los fijos incluidos: lo que cuesta de verdad cada vestido que se vende." : "Sólo los costos variables: lo que se gasta por cada vestido que se hace y se vende."}>
      <CostoUnitario c={c} fuentes={fuentes} conFijos={conFijos} stock={stock} vendidos={vendidos} href={(t) => url(t, tempRot)} />
      <VolumenRotacion modelos={c.modelos} conFijos={conFijos} vendidos={vendidos} talles={talles} vendT={vendT} sinTalle={sinDesc} temp={tempRot} hrefTemp={(t) => url(conFijos, t) + "#rotacion"} />
    </Page>
  );
}
