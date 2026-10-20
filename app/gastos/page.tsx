import { ErrorBox, Page } from "@/components/Page";
import { Columns, HBars, Kpi, Kpis, Legend, Panel, Pill, Section, Seg, Table } from "@/components/ui";
import { SHEETS, sheetUrl } from "@/lib/config";
import { getData } from "@/lib/data";
import { fechaCorta, fmt, hoyBA, mesLabel, sumBy, ym } from "@/lib/fmt";
import { OPTS, inR, rango, ultimosMeses } from "@/lib/periodo";
import { GRUPOS_RUBRO, RUBROS, SIN_RUBRO, rubroDe } from "@/lib/rubros";

export const dynamic = "force-dynamic";

export default async function Gastos({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  let d;
  try { d = await getData(); } catch (e) { return <ErrorBox e={e} />; }
  const r = rango(p), hoy = hoyBA();
  const g = d.gastos.filter((x) => inR(x.f, r)), gc = d.gastos.filter((x) => inR(x.f, r.cmp));
  const total = g.reduce((a, x) => a + x.imp, 0), totalC = gc.reduce((a, x) => a + x.imp, 0);
  const ventas = d.ventas.filter((x) => inR(x.f, r)).reduce((a, x) => a + x.monto, 0);
  const res = ventas - total;
  const pend = d.gastos.filter((x) => /pendiente|programado/i.test(x.est)).sort((a, b) => ((a.venc || a.f) > (b.venc || b.f) ? 1 : -1));
  const pendTot = pend.reduce((a, x) => a + x.imp, 0);
  const sinComp = g.filter((x) => !x.comp).length;
  const src: [string, string][] = [["01 · Gastos maestro", sheetUrl(SHEETS.gastos)]];

  const meses = ultimosMeses(12);
  const vm = meses.map((m) => d.ventas.filter((x) => ym(x.f) === m).reduce((a, x) => a + x.monto, 0));
  const gm = meses.map((m) => d.gastos.filter((x) => ym(x.f) === m).reduce((a, x) => a + x.imp, 0));
  // Rubros como la hoja «Resumen Anual»: se muestran todos, aunque estén en cero
  const porRubro = new Map(sumBy(g, rubroDe, (x) => x.imp)), porRubroC = new Map(sumBy(gc, rubroDe, (x) => x.imp));
  const sinRubro = g.filter((x) => rubroDe(x) === SIN_RUBRO);
  const maxRubro = Math.max(1, ...porRubro.values());
  const grupos = [...GRUPOS_RUBRO.map((t) => ({ t, rubros: RUBROS.filter((x) => x.g === t).map((x) => x.r) })), ...(sinRubro.length ? [{ t: SIN_RUBRO, rubros: [SIN_RUBRO] }] : [])];
  const anios = [...new Set(d.gastos.map((x) => x.f.slice(0, 4)))].sort();
  const porAnio = (rs: string[], a: string) => d.gastos.filter((x) => x.f.startsWith(a) && rs.includes(rubroDe(x))).reduce((s, x) => s + x.imp, 0);
  const porProv = sumBy(g.filter((x) => x.prov), (x) => x.prov, (x) => x.imp).slice(0, 8);

  return (
    <Page leido={d.leido} eyebrow="Gastos y resultado" title={<>En qué se va <em>la plata</em></>} lede={`${r.label}. Comparado con ${r.cmp.label}.`}>
      <div style={{ marginBottom: 14 }}><Seg opts={OPTS} value={r.k} base="/gastos" /></div>
      <Kpis>
        <Kpi q={1} n={fmt.M(total)} l="Gastos" s={`${fmt.var(total, totalC)} · antes ${fmt.M(totalC)}`} tone={total <= totalC ? "good" : "bad"}
          back={{ q: "Suma de los gastos cargados con fecha en el período (USD pasados a pesos).", a: "Incluye pagados y pendientes. Lo marcado «A revisar» también suma.", src }} />
        <Kpi q={2} n={fmt.M(ventas)} l="Ventas" s="mismo período"
          back={{ q: "Lo cobrado en el período, todos los canales.", a: "Se pone al lado de los gastos para ver el resultado.", src: [["02 · Ventas maestro", sheetUrl(SHEETS.ventas)]] }} />
        <Kpi q={3} n={fmt.M(res)} l="Resultado" s={ventas ? `${fmt.p(res / ventas)} de las ventas` : ""} tone={res >= 0 ? "good" : "bad"}
          back={{ q: "Ventas menos gastos del período.", a: "Es una mirada de caja. No descuenta el costo de la ropa vendida en otro período ni impuestos no cargados.", src }} />
        <Kpi q={4} n={fmt.M(pendTot)} l="A pagar" s={`${pend.length} gastos pendientes`} tone={pendTot ? "bad" : "good"}
          back={{ q: "Gastos con estado Pendiente o Programado, de cualquier fecha.", a: "Ordenados por vencimiento en la lista de abajo.", src }} />
      </Kpis>

      <Section title="Ventas vs gastos" sub="Últimos 12 meses.">
        <Panel>
          <Columns mode="group" labels={meses.map(mesLabel)} series={[{ name: "Ventas", color: "var(--s1)", values: vm }, { name: "Gastos", color: "var(--s0)", values: gm }]} />
          <Legend items={[{ name: "Ventas", color: "var(--s1)" }, { name: "Gastos", color: "var(--s0)" }]} />
          <p className="note">Resultado del último mes completo: <b>{fmt.M(vm[10] - gm[10])}</b> ({mesLabel(meses[10])}).</p>
        </Panel>
      </Section>

      <Section title="Por rubro" sub="Los mismos rubros que la hoja Resumen Anual de la planilla de gastos. Tocá uno para ver en qué se fue.">
        <div className="rb-g">
          {grupos.map(({ t, rubros }) => {
            const tot = rubros.reduce((s, r) => s + (porRubro.get(r) || 0), 0);
            return (
              <Panel key={t} title={t} sub={`${fmt.M(tot)}${total ? ` · ${fmt.p(tot / total)} del total` : ""}`}>
                <div className="rb">
                  {rubros.map((r) => {
                    const v = porRubro.get(r) || 0, vc = porRubroC.get(r) || 0;
                    const xs = g.filter((x) => rubroDe(x) === r);
                    // Detalle por subcategoría; si todas comparten la misma (p. ej. Confección / Taller), por proveedor
                    const unaSub = new Set(xs.map((x) => x.sub)).size <= 1;
                    const subs = sumBy(xs, (x) => (r === SIN_RUBRO ? x.cat : (unaSub ? x.prov : x.sub) || x.desc || "Sin detalle"), (x) => x.imp);
                    const uno = r === "Otros gastos" || r === SIN_RUBRO;
                    const info = RUBROS.find((x) => x.r === r)?.d || "Categorías que no entran en ningún rubro de la hoja. Conviene corregirlas en la planilla.";
                    return (
                      <details key={r} open={uno && v > 0} className={`rb-r${v ? "" : " z"}${r === SIN_RUBRO ? " sin" : ""}`}>
                        <summary>
                          <span className="n">{r}<small>{xs.length ? `${xs.length} gasto${xs.length > 1 ? "s" : ""}` : "nada en el período"}{vc || v ? ` · antes ${fmt.M(vc)}` : ""}</small></span>
                          <span className="v">{fmt.M(v)}<small>{total && v ? fmt.p(v / total) : ""}</small></span>
                          <span className="b"><i style={{ width: `${(v / maxRubro) * 100}%` }} /></span>
                        </summary>
                        <p className="rb-d">{info}</p>
                        {uno ? (
                          // «Otros gastos» y «Sin rubro»: gasto por gasto, para que se vea qué hay adentro
                          <ul>{[...xs].sort((a, b) => b.imp - a.imp).map((x, i) => (
                            <li key={i}><span>{x.desc || x.sub || x.cat}<small>{[r === SIN_RUBRO ? x.cat || "Sin categoría" : x.sub, x.prov, fechaCorta(x.f)].filter(Boolean).join(" · ")}</small></span><b>{fmt.ars(x.imp)}</b></li>
                          ))}</ul>
                        ) : (
                          <>
                            {subs.length > 0 && <ul>{subs.slice(0, 10).map(([k, x]) => <li key={k}><span>{k}</span><b>{fmt.ars(x)}</b></li>)}</ul>}
                            {subs.length > 10 && <p className="rb-d">Y {subs.length - 10} más por {fmt.ars(subs.slice(10).reduce((s, [, x]) => s + x, 0))}.</p>}
                          </>
                        )}
                      </details>
                    );
                  })}
                </div>
              </Panel>
            );
          })}
        </div>
        {sinRubro.length > 0 && <p className="note"><b>{sinRubro.length} gastos sin rubro</b> ({fmt.M(sinRubro.reduce((s, x) => s + x.imp, 0))}): tienen una categoría vacía o que la hoja Resumen Anual no cuenta. Completala en la planilla y aparecen en su rubro.</p>}
        {total > 0 && <p className="note">{sinComp} de {g.length} gastos del período no tienen comprobante vinculado.</p>}
      </Section>

      <Section title="Rubros por año" sub="Igual que la hoja Resumen Anual: todos los gastos cargados, por año.">
        <Table head={["Rubro", ...anios]} num={anios.map((_, i) => i + 1)}
          rows={grupos.flatMap(({ t, rubros }) => [
            [<b key="t">{t}</b>, ...anios.map((a) => <b key={a}>{fmt.M(porAnio(rubros, a))}</b>)],
            ...(t === SIN_RUBRO ? [] : rubros.map((r) => [<span key="r" className="rb-in">{r}</span>, ...anios.map((a) => fmt.M(porAnio([r], a)))])),
          ])}
          tot={["Total gastos", ...anios.map((a) => fmt.M(d.gastos.filter((x) => x.f.startsWith(a)).reduce((s, x) => s + x.imp, 0)))]} />
        <p className="note">Diferencia con la planilla: los gastos de «Otros › Moldería / Desarrollo» acá van a Moldería y muestras; en la hoja quedan sumados en Otros gastos.</p>
      </Section>

      <Section title="Principales proveedores">
        <Panel><HBars items={porProv.map(([k, v]) => ({ label: k, value: v, color: "var(--s2)" }))} /></Panel>
      </Section>

      <Section title="A pagar" sub="Pendientes y programados, por vencimiento.">
        {pend.length ? (
          <div className="list">
            {pend.slice(0, 20).map((x, i) => {
              const venc = x.venc || x.f, vencido = venc < hoy;
              return (
                <div className="li" key={i}>
                  <div>
                    <div className="t">{x.prov || x.cat}</div>
                    <div className="m">{x.cat} · <Pill tone={vencido ? "bad" : "warn"}>{vencido ? "Vencido" : "Vence"} {fechaCorta(venc)}</Pill></div>
                  </div>
                  <div className="v">{fmt.ars(x.imp)}<small>{x.est}</small></div>
                </div>
              );
            })}
          </div>
        ) : <p className="empty">No hay gastos pendientes.</p>}
      </Section>
    </Page>
  );
}
