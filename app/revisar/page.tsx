import Link from "next/link";
import { ErrorBox, Page } from "@/components/Page";
import { Kpi, Kpis, Section, Seg } from "@/components/ui";
import { SHEETS, sheetUrl } from "@/lib/config";
import { HOJA_VIVA, getData } from "@/lib/data";
import { addMonths, fechaCorta, fmt, hoyBA, mesLargo, ym } from "@/lib/fmt";
import { resultadoMes } from "@/lib/resultado";
import { stockEnVivo } from "@/lib/stock";
import { GRUPOS, ITEMS, type ItemRevisar, type Lugar } from "@/lib/revisar";

export const dynamic = "force-dynamic";

const FILTROS: [string, string][] = [["todo", "Todo"], ["equipo", "Para vos"], ["asistente", "Para el asistente"]];

/** Para revisar: datos dudosos y pendientes, con qué hacer y quién (sólo la dueña: puedeVer). */
export default async function Revisar({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "todo" } = await searchParams;
  let d;
  try { d = await getData(); } catch (e) { return <ErrorBox e={e} />; }
  const hoy = hoyBA(), mes = ym(hoy), ant = addMonths(mes, -1);

  // Ítems que dependen de los números de hoy
  const vivos: ItemRevisar[] = [];
  const fijos = resultadoMes(d, mes).fijos, fijosAnt = resultadoMes(d, ant).fijos;
  vivos.push(fijos > 0
    ? { id: "fijos-mes", grupo: "numeros", t: `Fijos de ${mesLargo(mes)} cargados`, que: `Hay ${fmt.ars(fijos)} de gastos fijos cargados en ${mesLargo(mes)}.`, donde: [{ t: "01 · Gastos maestro", href: sheetUrl(SHEETS.gastos) }], hacer: "Nada.", quien: "Equipo demo", estado: "resuelto", visto: "En vivo, con la hoja Gastos." }
    : {
      id: "fijos-mes", grupo: "numeros", t: `Faltan los fijos de ${mesLargo(mes)}`,
      que: `No hay ningún gasto fijo cargado en ${mesLargo(mes)} (sueldos, alquiler, servicios). Por eso el resultado del mes en Inicio y en el P&L se ve mejor de lo que es.${fijosAnt ? ` En ${mesLargo(ant)} fueron ${fmt.ars(fijosAnt)}.` : ""}`,
      donde: [{ t: "01 · Gastos maestro", href: sheetUrl(SHEETS.gastos) }, { t: "Inicio › Mes", href: "/?v=mes" }],
      hacer: "Cargarlos en 01 · Gastos maestro con Tipo «Fijo». La app los toma sola.", quien: "Equipo demo", estado: "pendiente", visto: "En vivo, con la hoja Gastos.",
    });
  const aRevisar = d.gastos.filter((g) => g.rev).length;
  if (aRevisar) vivos.push({
    id: "gastos-revisar", grupo: "numeros", t: `${aRevisar} ${aRevisar === 1 ? "gasto marcado" : "gastos marcados"} «A revisar»`,
    que: "Están marcados en la columna R de 01 · Gastos maestro. Hasta que se confirmen, cuentan como están cargados.",
    donde: [{ t: "Control de carga", href: "/informes/control" }, { t: "01 · Gastos maestro", href: sheetUrl(SHEETS.gastos) }],
    hacer: "Confirmarlos o corregirlos y sacar la marca.", quien: "Equipo demo", estado: "pendiente", visto: "En vivo, con la hoja Gastos.",
  });
  // Modelos con más ventas en la hoja Ventas que prendas en el conteo: el conteo estaba corto o hay ventas anotadas con otro modelo
  const vivo = await stockEnVivo(d.stock, d.ventas).catch(() => null);
  for (const x of vivo?.sinTalle.filter((x) => x.vendidas > x.q) || []) vivos.push({
    id: `conteo-${x.k}`, grupo: "dudosos", t: `${x.modelo}: se vendieron más de las que había`,
    que: `El conteo del ${fechaCorta(vivo!.ult.get(x.local) || "")} en ${x.local} tenía ${x.q} y la hoja Ventas anota ${x.vendidas} vendidas desde entonces. La app lo deja en 0, pero o el conteo estaba corto o alguna venta está anotada con otro modelo.`,
    donde: [{ t: "Stock por modelo", href: "/stock" }, { t: "02 · Ventas maestro", href: sheetUrl(SHEETS.ventas) }],
    hacer: `Contar las ${x.modelo} que quedan y revisar sus ventas desde el conteo.`, quien: "Equipo demo", estado: "pendiente", visto: "En vivo, conteo contra hoja Ventas.",
  });
  if (d.conteo?.error) vivos.push({
    id: "conteo-t26", grupo: "numeros", t: "No pude leer Conteo de prendas demo",
    que: `El stock está saliendo de la hoja Stock (conteo del ${fechaCorta(d.conteo.fecha)}) porque Conteo de prendas demo › STOCK ROSARIO no se pudo usar: ${d.conteo.error}`,
    donde: [{ t: "Conteo de prendas demo", href: sheetUrl(SHEETS.conteo) }],
    hacer: "Revisar los permisos de lectura de la planilla de demostración.", quien: "Equipo demo", estado: "pendiente", visto: "En vivo.",
  });
  for (const f of d.fuentesVentas?.filter((f) => f.error) || []) vivos.push({
    id: `ventas-${f.canal}`, grupo: "numeros", t: `No pude leer las ventas de ${f.canal}`,
    que: `Las ventas de ${f.canal} están saliendo de la copia vieja de 02 · Ventas maestro (llega hasta el ${fechaCorta(f.hasta)}): ${f.error}`,
    donde: [{ t: `02 · Ventas maestro › ${HOJA_VIVA[f.canal]}`, href: sheetUrl(SHEETS.ventas) }, { t: `Ventas ${f.canal}`, href: sheetUrl(f.id) }],
    hacer: `Abrir 02 · Ventas maestro, pestaña «${HOJA_VIVA[f.canal]}», tocar la celda A1 y «Permitir acceso». O revisar los permisos de lectura de la planilla de demostración.`, quien: "Equipo demo", estado: "pendiente", visto: "En vivo.",
  });
  const conteo = d.stock.reduce((m, s) => (s.fecha > m ? s.fecha : m), "");
  const dias = conteo ? Math.round((Date.parse(hoy) - Date.parse(conteo)) / 864e5) : 0;
  const items = [...vivos, ...ITEMS].map((x) => (x.id === "stock-conteo" && conteo
    ? { ...x, ...(d.conteo?.fuente === "T26" ? {} : { estado: "pendiente" as const }), t: `El stock sale del conteo del ${fechaCorta(conteo)}${d.conteo?.fuente === "T26" ? " (Conteo de prendas demo)" : " (hoja Stock)"}`, visto: `Último conteo: ${fechaCorta(conteo)}, hace ${dias} días, ${d.conteo?.prendas ?? "—"} prendas en Rosario. ${x.visto}` }
    : x));

  const deQuien = (x: ItemRevisar) => q === "todo" || (q === "equipo" ? x.quien.startsWith("Equipo demo") : x.quien.endsWith("Asistente IA"));
  const pend = items.filter((x) => x.estado === "pendiente");
  const hechos = items.filter((x) => x.estado === "resuelto");
  const nEquipo = pend.filter((x) => x.quien !== "Asistente IA").length, nAsistente = pend.filter((x) => x.quien !== "Equipo demo").length;

  return (
    <Page compu leido={d.leido} eyebrow="Para revisar" title={<>Datos dudosos y <em>pendientes</em></>}
      lede="Lo que fue apareciendo en las charlas: qué es, dónde está, qué hacer y quién lo resuelve.">
      <Kpis>
        <Kpi q={1} n={String(pend.length)} l="Pendientes" />
        <Kpi q={2} n={String(nEquipo)} l="Para vos" />
        <Kpi q={3} n={String(nAsistente)} l="Para el asistente" s="Pedímelo en el chat" />
        <Kpi q={4} n={String(hechos.length)} l="Resueltos" />
      </Kpis>
      <div className="rv-f"><Seg opts={FILTROS} value={q} href={(k) => (k === "todo" ? "/revisar" : `/revisar?q=${k}`)} label="Quién" /></div>
      {GRUPOS.map((g) => {
        const xs = pend.filter((x) => x.grupo === g.k && deQuien(x));
        if (!xs.length) return null;
        return (
          <Section key={g.k} title={g.t} sub={g.d}>
            <div className="rv">{xs.map((x) => <Tarjeta key={x.id} x={x} />)}</div>
          </Section>
        );
      })}
      {hechos.length > 0 && (
        <Section title="Resueltos" sub="Lo que ya se comprobó que quedó bien.">
          <details className="rv-hechos">
            <summary>Ver {hechos.length} {hechos.length === 1 ? "resuelto" : "resueltos"}</summary>
            <div className="rv">{hechos.map((x) => <Tarjeta key={x.id} x={x} />)}</div>
          </details>
        </Section>
      )}
    </Page>
  );
}

function Tarjeta({ x }: { x: ItemRevisar }) {
  const tono = x.estado === "resuelto" ? "good" : x.quien === "Asistente IA" ? "cl" : "warn";
  return (
    <article className={`rv-i${x.estado === "resuelto" ? " ok" : ""}`}>
      <header>
        <h3>{x.t}</h3>
        <span className={`pill ${tono}`}>{x.estado === "resuelto" ? "Resuelto" : x.quien === "Equipo demo" ? "Vos" : x.quien}</span>
      </header>
      <p>{x.que}</p>
      <dl>
        <dt>Dónde</dt><dd>{x.donde.map((l, i) => <Donde key={i} l={l} />)}</dd>
        <dt>Qué hacer</dt><dd>{x.hacer}</dd>
      </dl>
      <small>{x.visto}</small>
    </article>
  );
}

function Donde({ l }: { l: Lugar }) {
  if (!l.href) return <span>{l.t}</span>;
  return l.href.startsWith("/") ? <Link href={l.href}>{l.t}</Link> : <a href={l.href} target="_blank" rel="noopener">{l.t} ↗</a>;
}
