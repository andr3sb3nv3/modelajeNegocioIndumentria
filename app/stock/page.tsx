import Link from "next/link";
import { redirect } from "next/navigation";
import { ErrorBox, Page } from "@/components/Page";
import { Grilla, SyncBadge } from "@/components/StockApp";
import { USUARIO_TN } from "@/lib/sync";
import { HBars, Kpi, Kpis, Panel, Section } from "@/components/ui";
import { SHEETS, sheetUrl } from "@/lib/config";
import { getData } from "@/lib/data";
import { fechaCorta, fmt, hoyBA } from "@/lib/fmt";
import { REF_TN, TIPOS, abiertos, stockEnVivo, vigentes } from "@/lib/stock";
import { armarHistorial } from "@/lib/historial";
import { Historial } from "@/components/Historial";
import { SubirTN } from "@/components/SubirTN";

export const dynamic = "force-dynamic";
const TALLES = ["1", "2", "3", "4"];

const VISTAS = [{ k: "stock", t: "Stock" }, { k: "mov", t: "Ventas y movimientos" }, { k: "tn", t: "Tiendanube" }] as const;

/** Consulta del stock y los movimientos registrados en las planillas de demostración. */
export default async function Stock({ searchParams }: { searchParams: Promise<{ l?: string; vender?: string; v?: string; c?: string }> }) {
  const { l, vender, v: vista1, c: mirada } = await searchParams;
  const vista = VISTAS.some((x) => x.k === vista1) ? vista1 : "stock";
  // Links viejos al formulario emergente de venta
  // «Cuánto deja» pasó a su propia pantalla, Costo unitario
  if (vista1 === "deja") redirect(mirada === "total" ? "/costos?c=total" : "/costos");
  if (vender === "1") redirect(l ? `/stock/vender?l=${encodeURIComponent(l)}` : "/stock/vender");
  let d, s;
  try { d = await getData(); s = await stockEnVivo(d.stock, d.ventas); } catch (e) { return <ErrorBox e={e} />; }
  const { items, locales, ult, movs, movError, online, sinTalle } = s;
  const yo = "demo";
  const esAdmin = false;

  const local = l === "todos" ? "todos" : l && locales.includes(l) ? l : locales[0] || "todos";
  const enLocal = <T extends { local: string }>(x: T) => local === "todos" || x.local === local;

  const rows = items.filter(enLocal);
  // Vendidas después del conteo que sólo están en la hoja Ventas: se descuentan del modelo (la hoja no dice color ni talle)
  const sinT = sinTalle.filter(enLocal);
  const menosHoja = sinT.reduce((a, x) => a + x.q, 0), vendHoja = sinT.reduce((a, x) => a + x.vendidas, 0);
  const porModeloHoja: Record<string, number> = {};
  for (const x of sinT) porModeloHoja[x.modelo] = (porModeloHoja[x.modelo] || 0) + x.q;
  const deMas = sinT.filter((x) => x.vendidas > x.q);
  const total = rows.reduce((a, i) => a + Math.max(0, i.q), 0) - menosHoja;
  const conteo = rows.reduce((a, i) => a + i.conteo, 0);
  const fecha = local === "todos" ? [...ult.values()].sort()[0] : ult.get(local) || "";
  const v = vigentes(movs);
  const desde = (m: { local: string; f: string }) => m.f > (ult.get(m.local) || "");
  const ventasApp = v.filter((m) => m.tipo === "venta" && enLocal(m) && desde(m));
  const vendLocal = ventasApp.filter((m) => m.usuario !== USUARIO_TN).reduce((a, m) => a - m.cant, 0);
  const vendOnline = ventasApp.filter((m) => m.usuario === USUARIO_TN).reduce((a, m) => a - m.cant, 0)
    + (local === "todos" || local === online.local ? online.lineas.reduce((a, x) => a + x.cant, 0) : 0);
  const afuera = abiertos(movs).filter(enLocal);
  const agotados = (() => {
    const m = new Map<string, Record<string, number>>();
    for (const i of rows) { const k = `${i.modelo}|${i.color}`; const t = m.get(k) || {}; t[i.talle] = (t[i.talle] || 0) + i.q; m.set(k, t); }
    return [...m.values()].filter((t) => Object.values(t).some((x) => x > 0)).reduce((a, t) => a + TALLES.filter((x) => (t[x] ?? 0) <= 0).length, 0);
  })();
  const porTalle = TALLES.map((t) => ({ label: `Talle ${t}`, value: rows.filter((i) => i.talle === t).reduce((a, i) => a + Math.max(0, i.q), 0) }));

  const hoy = hoyBA();
  const sinMatch = online.lineas.filter((x) => !x.ok);
  const src: [string, string][] = [...(d.conteo?.fuente === "T26" ? [["STOCK VESTIDOS T26", sheetUrl(SHEETS.conteo)] as [string, string]] : []), ["Producción y stock", sheetUrl(SHEETS.stock)]];
  const srcV: [string, string][] = [...src, ["02 · Ventas maestro", sheetUrl(SHEETS.ventas)]];
  const colores: Record<string, string[]> = {};
  for (const i of items) (colores[i.modelo] ||= []).includes(i.color) || colores[i.modelo].push(i.color);
  const tnUltima = v.filter((m) => m.tipo === "venta" && m.ref.startsWith(REF_TN)).reduce((a, m) => (m.f > a ? m.f : a), "");

  return (
    <Page compu leido={d.leido} eyebrow="Stock por modelo" title={<>Qué hay <em>para vender</em></>}
      lede={d.conteo?.fuente === "T26"
        ? `Lo que dice hoy la planilla de demostración (STOCK VESTIDOS T26, «STOCK AL ${fechaCorta(d.conteo.fecha)}»), sin restarle ventas: el equipo demo la mantiene al día.`
        : `Conteo del ${fechaCorta(fecha) || "—"}${local === "todos" ? "" : ` en ${local}`}, menos lo vendido después: los movimientos registrados${online.activo ? ", las ventas online" : ""} y la hoja Ventas.`}>
      <div className="stk-cab">
        <nav className="seg" style={{ marginBottom: 14 }} aria-label="Local">
          {[...locales, "todos"].map((x) => <Link key={x} href={`/stock?l=${encodeURIComponent(x)}${vista === "stock" ? "" : `&v=${vista}`}`} className={x === local ? "on" : ""} scroll={false}>{x === "todos" ? "Todos" : x}</Link>)}
        </nav>
      </div>
      {movError && <p className="err" style={{ marginTop: 10 }}>No pude leer los movimientos: {movError}</p>}

      <nav className="seg st-tabs" aria-label="Vista">
        {VISTAS.map((x) => <Link key={x.k} href={`/stock?l=${encodeURIComponent(local)}${x.k === "stock" ? "" : `&v=${x.k}`}`} className={x.k === vista ? "on" : ""} scroll={false}>{x.t}</Link>)}
      </nav>

      {vista === "mov" && <Historial key={local} fijo ventas={armarHistorial(movs, yo, esAdmin, hoy)} locales={locales} colores={colores} admin={esAdmin} local={local === "todos" ? "" : local} />}
      {vista === "tn" && <SubirTN ultima={tnUltima} />}
      {vista === "stock" && <>

      <Kpis>
        <Kpi q={1} n={fmt.n(total)} l="Prendas en stock" s={d.conteo?.fuente === "T26" ? `planilla de demostración: ${fmt.n(conteo)}` : `conteo del ${fechaCorta(fecha) || "—"}: ${fmt.n(conteo)}`}
          back={{ q: "Último conteo de cada local, más devoluciones y cambios, menos ventas y préstamos registrados después de esa fecha, menos las ventas de la hoja Ventas que no están en Movimientos.", a: "La hoja Ventas no dice color ni talle: esas ventas se descuentan del total de cada modelo, no de la grilla por talle. Los registros del mismo día del conteo se toman como ya contados.", src: srcV }} />
        <Kpi q={2} n={fmt.n(vendLocal + vendOnline + vendHoja)} l="Vendidas desde el conteo" s={vendHoja ? `${fmt.n(vendLocal + vendOnline)} en Movimientos · ${fmt.n(vendHoja)} sólo en la hoja Ventas` : online.activo ? `${vendLocal} local · ${vendOnline} online` : `${vendLocal} en el local`}
          back={{ q: "Prendas vendidas desde el último conteo: las registradas en Movimientos o en ventas online (con color y talle) y las que están sólo en la hoja Ventas (por modelo).", a: online.activo ? `Las online descuentan del stock de «${online.local}».` : `Las ventas online se toman de la hoja Ventas y descuentan del stock de «${online.local}».`, src: srcV }} />
        <Kpi q={3} n={fmt.n(agotados)} l="Talles agotados" s="modelo · color · talle en 0" tone={agotados ? "bad" : "good"}
          back={{ q: "Casilleros modelo + color + talle en cero, entre los modelos que tienen stock.", a: "Un talle agotado en un modelo que se vende bien es venta perdida.", src }} />
        <Kpi q={4} n={fmt.n(afuera.reduce((a, m) => a - m.cant, 0))} l="Prendas afuera" s="préstamos y contenido" tone={afuera.length ? "bad" : "good"}
          back={{ q: "Prendas que salieron prestadas o para contenido y todavía no volvieron.", a: "Las devoluciones registradas vuelven a sumar al stock. Los canjes no vuelven.", src }} />
      </Kpis>

      {/* Celular: una columna (afuera, modelos, talles). Compu: modelos a la izquierda, el resto al costado */}
      <div className="stk-cols">
        <div className="stk-main">
          <Section title="Por modelo" sub="En rojo, talles agotados. Buscá por modelo o color.">
            <Grilla items={rows.map(({ local, modelo, color, talle, q }) => ({ local, modelo, color, talle, q }))} sinTalle={porModeloHoja} />
          </Section>
        </div>
        <div className="stk-side">
          <SyncBadge leido={d.leido} />
          {online.error && <p className="err" style={{ marginTop: 10 }}>No pude leer Tiendanube: {online.error}</p>}
          {sinMatch.length > 0 && <p className="note">{sinMatch.length} {sinMatch.length === 1 ? "venta online no coincide" : "ventas online no coinciden"} con ningún modelo/color/talle del conteo y no {sinMatch.length === 1 ? "descontó" : "descontaron"} stock (marcadas abajo).</p>}
          {vendHoja > 0 && <p className="note">{fmt.n(vendHoja)} {vendHoja === 1 ? "prenda vendida" : "prendas vendidas"} desde el {fechaCorta(fecha)} {vendHoja === 1 ? "está" : "están"} sólo en la hoja Ventas, que no dice color ni talle: se {vendHoja === 1 ? "descuenta" : "descuentan"} del total de cada modelo («Vendidas sin talle»), no de la grilla por talle. Los movimientos con color y talle se descuentan por talle.</p>}
          {deMas.length > 0 && <p className="note">{deMas.map((x) => `${x.modelo}: la hoja Ventas dice ${x.vendidas} vendidas y el conteo tenía ${x.q}`).join(" · ")}. El stock de {deMas.length === 1 ? "ese modelo" : "esos modelos"} queda en 0: conviene recontar{deMas.length === 1 ? "lo" : "los"}.</p>}
          {afuera.length > 0 && (
            <Section title="Afuera" sub="Préstamos y prendas para contenido que todavía no volvieron.">
              <div className="list">
                {afuera.map((m) => (
                  <div className="li" key={m.id}>
                    <div><div className="t">{m.modelo} · {m.color} · T{m.talle}</div><div className="m">{TIPOS[m.tipo]} · {m.clienta || "—"} · {fechaCorta(m.f)}</div></div>
                    <span className="pill">Pendiente de devolución</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
          <Section title="Por talle">
            <Panel><HBars items={porTalle} f={fmt.n} /></Panel>
            {menosHoja > 0 && <p className="note">Por talle no se restan las {fmt.n(menosHoja)} vendidas sólo en la hoja Ventas (no dice el talle).</p>}
          </Section>
        </div>
      </div>
      </>}
    </Page>
  );
}
