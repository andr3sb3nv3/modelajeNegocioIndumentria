import { notFound } from "next/navigation";
import { ErrorBox, Page } from "@/components/Page";
import { Back, Columns, HBars, Kpi, Kpis, Legend, Panel, Section } from "@/components/ui";
import { SHEETS, sheetUrl } from "@/lib/config";
import { esFijo } from "@/lib/resultado";
import { getData } from "@/lib/data";
import { fechaCorta, fmt, mesLabel, sumBy, ym } from "@/lib/fmt";
import { ultimosMeses } from "@/lib/periodo";

export const dynamic = "force-dynamic";
const PROD = /taller|tela|confec|producci|merceri|cierre|avío|avio/i;
const PAL = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "#7d9fc4", "#C98AA6", "var(--s0)"];

export default async function Costos({ params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  if (tipo !== "fijos" && tipo !== "variables") notFound();
  const fijos = tipo === "fijos";
  let d;
  try { d = await getData(); } catch (e) { return <ErrorBox e={e} />; }
  const meses = ultimosMeses(13).slice(0, 12);
  const G = d.gastos.filter((g) => (fijos ? esFijo(g) : !esFijo(g)) && ym(g.f) >= meses[0] && ym(g.f) <= meses[11]);
  const total = G.reduce((a, g) => a + g.imp, 0);
  const porMes = meses.map((m) => G.filter((g) => ym(g.f) === m).reduce((a, g) => a + g.imp, 0));
  const ventas = meses.map((m) => d.ventas.filter((v) => ym(v.f) === m).reduce((a, v) => a + v.monto, 0));
  const ventasT = ventas.reduce((a, b) => a + b, 0);
  const cats = sumBy(G, (g) => g.cat, (g) => g.imp);
  const top = cats.slice(0, 6).map(([c]) => c);
  const series = [...top, "Resto"].map((c, i) => ({ name: c, color: PAL[i], values: meses.map((m) => G.filter((g) => ym(g.f) === m && (c === "Resto" ? !top.includes(g.cat) : g.cat === c)).reduce((a, g) => a + g.imp, 0)) })).filter((s) => s.values.some(Boolean));
  const queda = meses.map((_, i) => ventas[i] - porMes[i]);
  const negativos = queda.filter((x) => x < 0).length;
  const prod = G.filter((g) => PROD.test(g.cat)).reduce((a, g) => a + g.imp, 0);
  const talleres = G.filter((g) => /taller/i.test(g.cat)).reduce((a, g) => a + g.imp, 0);
  const grandes = [...G].sort((a, b) => b.imp - a.imp).slice(0, 10);
  const src: [string, string][] = [["01 · Gastos maestro", sheetUrl(SHEETS.gastos)]];

  return (
    <Page leido={d.leido} eyebrow={`Finanzas · Costos ${tipo}`} title={<>Costos <em>{tipo}</em></>}
      lede={`Últimos 12 meses cerrados, desde 01 · Gastos maestro. ${fijos ? "Fijos" : "Variables"} según la columna «Tipo».`}>
      <Back />
      <div style={{ height: 12 }} />
      <Kpis>
        <Kpi q={1} n={fmt.M(total)} l={`Costos ${tipo} 12 meses`} s={`${fmt.M(total / 12)} por mes`} back={{ q: `Suma de los gastos marcados como ${fijos ? "fijos" : "variables"}.`, a: "Si la columna «Tipo» está vacía, sueldos, alquileres y servicios cuentan como fijos.", src }} />
        {fijos ? <>
          <Kpi q={2} n={ventasT ? fmt.p(total / ventasT) : "—"} l="De las ventas" s="se van en costos fijos" />
          <Kpi q={3} n={String(negativos)} l="Meses en negativo" s="ventas menos costos fijos" tone={negativos ? "bad" : "good"} />
          <Kpi q={4} n={fmt.M(cats[0]?.[1] || 0)} l={cats[0]?.[0] || "—"} s="el rubro fijo más grande" />
        </> : <>
          <Kpi q={2} n={total ? fmt.p(prod / total) : "—"} l="Es producción" s="talleres, telas y avíos" />
          <Kpi q={3} n={fmt.M(talleres)} l="Talleres" s={total ? `${fmt.p(talleres / total)} del variable` : ""} />
          <Kpi q={4} n={fmt.n(G.length)} l="Gastos cargados" s="en los 12 meses" />
        </>}
      </Kpis>

      <Section title={fijos ? "Costos fijos mes a mes" : "Mes a mes"}>
        <Panel><Columns labels={meses.map(mesLabel)} series={series} /><Legend items={series.map((s) => ({ name: s.name, color: s.color }))} /></Panel>
      </Section>

      <Section title={fijos ? "Ventas contra costos fijos" : "Contra lo vendido"} sub={fijos ? "Lo que queda cada mes después de pagar lo fijo." : "Cuánto de cada peso vendido se fue en gasto variable."}>
        <Panel>
          <Columns mode="group" labels={meses.map(mesLabel)} series={[{ name: "Ventas", color: "var(--s1)", values: ventas }, { name: `Costos ${tipo}`, color: "var(--s0)", values: porMes }]} />
          <Legend items={[{ name: "Ventas", color: "var(--s1)" }, { name: `Costos ${tipo}`, color: "var(--s0)" }]} />
          <p className="note">{fijos ? `Lo que queda en 12 meses: ${fmt.M(ventasT - total)}.` : `En 12 meses el gasto variable fue ${ventasT ? fmt.p(total / ventasT) : "—"} de las ventas.`}</p>
        </Panel>
      </Section>

      <Section title={fijos ? "En qué se va la plata" : "En qué se gasta"}>
        <Panel><HBars items={cats.map(([k, v]) => ({ label: k, value: v, color: "var(--s4)", sub: total ? fmt.p(v / total) : "" }))} /></Panel>
      </Section>

      <Section title="Los gastos más grandes">
        <div className="list">
          {grandes.map((g, i) => (
            <div className="li" key={i}>
              <div><div className="t">{g.desc || g.cat}</div><div className="m">{g.cat}{g.prov ? ` · ${g.prov}` : ""}</div></div>
              <div className="v">{fmt.ars(g.imp)}<small>{fechaCorta(g.f)}</small></div>
            </div>
          ))}
        </div>
      </Section>
    </Page>
  );
}
