import Link from "next/link";
import { ErrorBox, Page } from "@/components/Page";
import { Back, HBars, Kpi, Kpis, Panel, Section, Table } from "@/components/ui";
import { SHEETS, sheetUrl } from "@/lib/config";
import { getData } from "@/lib/data";
import { getExtra } from "@/lib/extra";
import { fmt, sumBy } from "@/lib/fmt";

export const dynamic = "force-dynamic";
const TALLES = ["1", "2", "3", "4"];

export default async function Produccion({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  let d, x;
  try { [d, x] = await Promise.all([getData(), getExtra()]); } catch (e) { return <ErrorBox e={e} />; }
  const temps = [...new Set(x.prod.map((p) => p.temp).filter(Boolean))].sort().reverse();
  const temp = t && temps.includes(t) ? t : temps[0] || "T27";
  const P = x.prod.filter((p) => p.temp === temp);
  const plan = P.reduce((a, p) => a + p.cant, 0);
  const entregadas = P.filter((p) => /entreg|recib|termin/i.test(p.estado)).reduce((a, p) => a + p.cant, 0);
  const costeado = P.reduce((a, p) => a + p.cant * p.precio, 0);
  const sinCosto = P.filter((p) => !p.precio).reduce((a, p) => a + p.cant, 0);
  const porEstado = sumBy(P, (p) => p.estado || "Sin estado", (p) => p.cant);
  const porModelo = sumBy(P, (p) => p.modelo, (p) => p.cant);
  const porTaller = sumBy(P, (p) => p.taller || "Sin taller", (p) => p.cant);
  // Curva de talles: plan vs prendas vendidas de esos modelos (ventas no tienen talle: se compara la curva del plan con el stock vendido por modelo)
  const curva = TALLES.map((tl) => ({ label: `Talle ${tl}`, value: P.filter((p) => p.talle.replace(/\D/g, "") === tl).reduce((a, p) => a + p.cant, 0) }));
  const modelos = new Set(P.map((p) => p.modelo));
  const vendidas = new Map<string, number>();
  for (const v of d.ventas) if (modelos.has(v.modelo)) vendidas.set(v.modelo, (vendidas.get(v.modelo) || 0) + v.prendas);
  const costoModelo = new Map<string, number>();
  for (const p of P) if (p.precio) costoModelo.set(p.modelo, p.precio);
  const pagos = x.pagos.filter((p) => p.temp === temp);
  const telas = x.telas.filter((p) => p.temp === temp);
  const src = sheetUrl(SHEETS.stock);

  return (
    <Page leido={d.leido} eyebrow={`Producción · Temporada ${temp.slice(1)}`} title={<>Producción <em>{temp}</em></>}
      lede="Plan de producción, talleres, telas y pagos, desde 05 · Producción y stock maestro.">
      <Back />
      <nav className="seg" style={{ margin: "12px 0 14px" }} aria-label="Temporada">
        {temps.map((k) => <Link key={k} href={`/informes/produccion?t=${k}`} className={k === temp ? "on" : ""} scroll={false}>{k}</Link>)}
      </nav>
      {x.errores.some((e) => e.startsWith("Producción")) && <p className="err">No pude leer la hoja Producción.</p>}
      <Kpis>
        <Kpi q={1} n={fmt.n(plan)} l="Prendas en el plan" s={`${modelos.size} modelos`} back={{ q: "Suma de «Cantidad» de la hoja Producción para la temporada.", a: "Incluye todo lo planificado, en cualquier estado.", src: [["Producción y stock › Producción", src]] }} />
        <Kpi q={2} n={fmt.n(entregadas)} l="Ya entregadas" s={plan ? `${fmt.p(entregadas / plan)} del plan` : ""} />
        <Kpi q={3} n={fmt.M(costeado)} l="Confección costeada" s="cantidad × precio de confección" />
        <Kpi q={4} n={fmt.n(sinCosto)} l="Prendas sin costo" s="falta precio de confección" tone={sinCosto ? "bad" : "good"} />
      </Kpis>
      <Section title="Plan de producción" sub={`Estado de las ${fmt.n(plan)} prendas.`}>
        <Panel><HBars items={porEstado.map(([k, v]) => ({ label: k, value: v, color: /entreg|recib/i.test(k) ? "var(--s3)" : "var(--s4)" }))} f={fmt.n} /></Panel>
      </Section>
      <div className="grid2">
        <Section title="Por modelo"><Panel><HBars items={porModelo.map(([k, v]) => ({ label: k, value: v, sub: `vend. ${vendidas.get(k) || 0}` }))} f={fmt.n} /></Panel></Section>
        <Section title="Curva de talles" sub="Prendas del plan por talle."><Panel><HBars items={curva} f={fmt.n} /></Panel></Section>
      </div>
      <Section title="Costo por modelo" sub="Precio de confección por prenda cargado en el plan.">
        <Table head={["Modelo", "Prendas", "Confección /u", "Total"]} num={[1, 2, 3]}
          rows={porModelo.map(([k, v]) => [k, fmt.n(v), costoModelo.get(k) ? fmt.ars(costoModelo.get(k)!) : "—", costoModelo.get(k) ? fmt.M(v * costoModelo.get(k)!) : "—"])} />
      </Section>
      <Section title="Talleres">
        <Panel><HBars items={porTaller.map(([k, v]) => ({ label: k, value: v, color: "var(--s4)" }))} f={fmt.n} /></Panel>
        {pagos.length > 0 && <p className="note">Pagado a talleres en {temp}: <b>{fmt.M(pagos.filter((p) => p.moneda === "ARS").reduce((a, p) => a + p.monto, 0))}</b> en {pagos.length} pagos.</p>}
      </Section>
      <Section title="Compra de telas" sub="Gasto por proveedor.">
        {telas.length ? <Panel><HBars items={sumBy(telas.filter((t2) => t2.moneda === "ARS"), (t2) => t2.prov || "Sin proveedor", (t2) => t2.total).map(([k, v]) => ({ label: k, value: v, color: "var(--s2)" }))} /></Panel> : <p className="empty">Sin compras de tela cargadas para {temp}.</p>}
      </Section>
    </Page>
  );
}
