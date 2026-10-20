import { ErrorBox, Page } from "@/components/Page";
import { Back, Columns, HBars, Kpi, Kpis, Legend, Panel, Section, Table } from "@/components/ui";
import { getData } from "@/lib/data";
import { esFijo, resultadoMes } from "@/lib/resultado";
import { fmt, hoyBA, mesLabel, sumBy, ym } from "@/lib/fmt";
import { ultimosMeses } from "@/lib/periodo";

export const dynamic = "force-dynamic";

export default async function Resultado() {
  let d;
  try { d = await getData(); } catch (e) { return <ErrorBox e={e} />; }
  const meses = ultimosMeses(13).slice(0, 12); // 12 meses completos, sin el actual
  // La misma cuenta que usa Inicio › Mes (lib/resultado.ts)
  const filaDe = (m: string) => { const r = resultadoMes(d, m); return { m, v: r.ventas, fi: r.fijos, va: r.variables, r: r.resultado }; };
  const fila = meses.map(filaDe);
  // El mes en curso va arriba, aparte: no suma en los totales de 12 meses
  const actual = ym(hoyBA()), cur = filaDe(actual);
  const T = fila.reduce((a, x) => ({ v: a.v + x.v, fi: a.fi + x.fi, va: a.va + x.va, r: a.r + x.r }), { v: 0, fi: 0, va: 0, r: 0 });
  const neg = fila.filter((x) => x.r < 0).length;
  const g12 = d.gastos.filter((x) => ym(x.f) >= meses[0] && ym(x.f) <= meses[11]);
  const fijos = sumBy(g12.filter(esFijo), (x) => x.cat, (x) => x.imp).slice(0, 8);
  const vars = sumBy(g12.filter((x) => !esFijo(x)), (x) => x.cat, (x) => x.imp).slice(0, 8);

  return (
    <Page leido={d.leido} eyebrow="Informe · Resultado" title={<>Resultado <em>mes a mes</em></>}
      lede="Últimos 12 meses cerrados y el mes en curso. Ventas cobradas menos gastos cargados: una mirada de caja, no contable.">
      <Back />
      <div style={{ height: 12 }} />
      <Kpis>
        <Kpi q={1} n={fmt.M(T.v)} l="Ventas 12 meses" s={`promedio ${fmt.M(T.v / 12)} / mes`} />
        <Kpi q={2} n={fmt.M(T.fi)} l="Gastos fijos" s={`${fmt.M(T.fi / 12)} / mes`} />
        <Kpi q={3} n={fmt.M(T.va)} l="Gastos variables" s={T.v ? `${fmt.p(T.va / T.v)} de las ventas` : ""} />
        <Kpi q={4} n={fmt.M(T.r)} l="Resultado" s={`${neg} ${neg === 1 ? "mes" : "meses"} en negativo`} tone={T.r >= 0 ? "good" : "bad"} />
      </Kpis>
      <Section title="Ventas vs gastos">
        <Panel>
          <Columns mode="group" labels={meses.map(mesLabel)} series={[{ name: "Ventas", color: "var(--s1)", values: fila.map((x) => x.v) }, { name: "Gastos", color: "var(--s0)", values: fila.map((x) => x.fi + x.va) }]} />
          <Legend items={[{ name: "Ventas", color: "var(--s1)" }, { name: "Gastos (fijos + variables)", color: "var(--s0)" }]} />
        </Panel>
      </Section>
      <Section title="Detalle por mes">
        <Table head={["Mes", "Ventas", "Fijos", "Variables", "Resultado"]} num={[1, 2, 3, 4]}
          rows={[
            ...fila.map((x) => [`${mesLabel(x.m)} ${x.m.slice(2, 4)}`, fmt.M(x.v), fmt.M(x.fi), fmt.M(x.va), x.r < 0 ? <span className="neg">{fmt.M(x.r)}</span> : fmt.M(x.r)]),
            [<b key="c">{mesLabel(actual)} {actual.slice(2, 4)} · en curso</b>, fmt.M(cur.v), cur.fi ? fmt.M(cur.fi) : <span className="muted" key="f">sin cargar</span>, fmt.M(cur.va), cur.r < 0 ? <span className="neg">{fmt.M(cur.r)}</span> : fmt.M(cur.r)],
          ]}
          tot={["Total 12 meses cerrados", fmt.M(T.v), fmt.M(T.fi), fmt.M(T.va), fmt.M(T.r)]} />
        <p className="note">{mesLabel(actual)} {actual.slice(2, 4)} está en curso: es lo que dice Inicio › Mes y no suma en el total. {cur.fi ? "" : "Sus fijos (sueldos, alquileres, dirección) todavía no están cargados, así que su resultado se ve más alto de lo que va a terminar. "}</p>
        <p className="note">Fijo o variable sale de la columna «Tipo» de 01 · Gastos maestro. Si está vacía, sueldos, alquileres y servicios cuentan como fijos.</p>
      </Section>
      <div className="grid2">
        <Section title="Fijos por rubro"><Panel><HBars items={fijos.map(([k, v]) => ({ label: k, value: v, color: "var(--s4)" }))} /></Panel></Section>
        <Section title="Variables por rubro"><Panel><HBars items={vars.map(([k, v]) => ({ label: k, value: v, color: "var(--s3)" }))} /></Panel></Section>
      </div>
    </Page>
  );
}
