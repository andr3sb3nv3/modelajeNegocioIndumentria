import { ErrorBox, Page } from "@/components/Page";
import { Back, Columns, HBars, Kpi, Kpis, Panel, Section } from "@/components/ui";
import { getData } from "@/lib/data";
import { colorCanal, fmt, grupoCanal, hoyBA, mesLabel, ym } from "@/lib/fmt";
import { ultimosMeses } from "@/lib/periodo";

export const dynamic = "force-dynamic";

/** Sólo números agregados: la app nunca muestra nombres de clientas. */
export default async function Clientas() {
  let d;
  try { d = await getData(); } catch (e) { return <ErrorBox e={e} />; }
  const hoy = hoyBA(), hace12 = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const conCli = d.ventas.filter((x) => x.cli);
  const byCli = new Map<string, { n: number; m: number; first: string; canal: string; f12: number }>();
  for (const x of [...conCli].sort((a, b) => (a.f < b.f ? -1 : 1))) {
    const c = byCli.get(x.cli) || { n: 0, m: 0, first: x.f, canal: grupoCanal(x.canal), f12: 0 };
    c.n++; c.m += x.monto; if (x.f >= hace12) c.f12++;
    byCli.set(x.cli, c);
  }
  const all = [...byCli.values()];
  const activas = all.filter((c) => c.f12 > 0);
  const recompra = all.filter((c) => c.n > 1);
  const totalM = all.reduce((a, c) => a + c.m, 0);
  const mRecompra = recompra.reduce((a, c) => a + c.m, 0);
  const meses = ultimosMeses(12);
  const nuevas = meses.map((m) => all.filter((c) => ym(c.first) === m).length);
  const activasMes = meses.map((m) => new Set(conCli.filter((x) => ym(x.f) === m).map((x) => x.cli)).size);
  const entrada = new Map<string, number>();
  for (const c of all) entrada.set(c.canal, (entrada.get(c.canal) || 0) + 1);
  const veces = [1, 2, 3, 4].map((k) => ({ label: k === 4 ? "4 o más" : `${k} ${k === 1 ? "compra" : "compras"}`, value: all.filter((c) => (k === 4 ? c.n >= 4 : c.n === k)).length }));
  const sinCli = d.ventas.length - conCli.length;

  return (
    <Page leido={d.leido} eyebrow="Informe · Clientas" title={<>Quiénes <em>vuelven</em></>}
      lede={`${fmt.n(all.length)} clientas distintas registradas hasta el ${hoy.split("-").reverse().join("/")}. Sólo números: la app no muestra nombres.`}>
      <Back />
      <div style={{ height: 12 }} />
      <Kpis>
        <Kpi q={1} n={fmt.n(activas.length)} l="Activas 12 meses" s="compraron al menos una vez" />
        <Kpi q={2} n={all.length ? fmt.p(recompra.length / all.length) : "—"} l="Compraron 2+ veces" s={`${fmt.n(recompra.length)} clientas`} />
        <Kpi q={3} n={totalM ? fmt.p(mRecompra / totalM) : "—"} l="Facturación de recompra" s="de clientas con 2+ compras" />
        <Kpi q={4} n={all.length ? fmt.M(totalM / all.length) : "—"} l="Gasto por clienta" s="promedio histórico" />
      </Kpis>
      <Section title="Clientas nuevas por mes" sub="Primera compra registrada en ese mes.">
        <Panel><Columns labels={meses.map(mesLabel)} series={[{ name: "Nuevas", color: "var(--s1)", values: nuevas }]} f={fmt.n} highlight={11} /></Panel>
      </Section>
      <Section title="Clientas que compraron cada mes">
        <Panel><Columns labels={meses.map(mesLabel)} series={[{ name: "Activas", color: "var(--s2)", values: activasMes }]} f={fmt.n} highlight={11} /></Panel>
      </Section>
      <div className="grid2">
        <Section title="Cuántas veces compraron"><Panel><HBars items={veces} f={fmt.n} /></Panel></Section>
        <Section title="Por dónde entraron" sub="Canal de la primera compra."><Panel><HBars items={[...entrada.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, value: v, color: colorCanal(k) }))} f={fmt.n} /></Panel></Section>
      </div>
      {sinCli > 0 && <p className="note">{fmt.n(sinCli)} ventas no tienen clienta cargada y no entran en este informe.</p>}
    </Page>
  );
}
