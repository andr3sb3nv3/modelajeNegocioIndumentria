import { ErrorBox, Page } from "@/components/Page";
import { PrecioLleno } from "@/components/PrecioLleno";
import { precioLleno } from "@/lib/precioLleno";
import { Columns, HBars, Kpi, Kpis, Legend, Panel, Section, Seg, Table } from "@/components/ui";
import { SHEETS, sheetUrl } from "@/lib/config";
import { getData } from "@/lib/data";
import { CANALES, addMonths, fechaCorta, colorCanal, fmt, grupoCanal, hoyBA, mesLabel, normMedio, sumBy, temporada, ym } from "@/lib/fmt";
import { OPTS, inR, rango } from "@/lib/periodo";
import { leerMovimientos, vigentes } from "@/lib/stock";
import { HistorialVentas, type VentaC } from "@/components/StockApp";
import { USUARIO_TN } from "@/lib/sync";
import { DEMO_ONLINE_USER } from "@/lib/demo-sales-movements";

export const dynamic = "force-dynamic";
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const slug = (c: string) => c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");

export default async function Ventas({ searchParams }: { searchParams: Promise<{ p?: string; c?: string; u?: string }> }) {
  const { p, c: cq, u } = await searchParams;
  let d;
  let app;
  try { [d, app] = await Promise.all([getData(), leerMovimientos()]); } catch (e) { return <ErrorBox e={e} />; }
  const r = rango(p);
  const hoy = hoyBA();
  const meses = Array.from({ length: 24 }, (_, i) => addMonths(ym(hoy), i - 23));
  const canales = CANALES.filter((k) => d.ventas.some((x) => grupoCanal(x.canal) === k && x.f >= meses[0]));
  // Filtro de canal: reemplaza los viejos informes «Showroom Rosario» y «Shop Online Ventas»
  const canal = canales.find((k) => slug(k) === cq) || null;
  const delCanal = (x: { canal: string }) => !canal || grupoCanal(x.canal) === canal;
  const qs = (o: { p?: string; c?: string | null; u?: string }) => {
    const q = new URLSearchParams();
    const pp = o.p ?? r.k, cc = o.c === undefined ? (canal && slug(canal)) : o.c, uu = o.u ?? u;
    if (pp !== "mes") q.set("p", pp);
    if (cc) q.set("c", cc);
    if (uu === "m") q.set("u", "m");
    const t = q.toString();
    return t ? `/ventas?${t}` : "/ventas";
  };

  // Historial ficticio: el canal online despacha desde el depósito de la demo.
  const esOnline = (m: { usuario: string }) => m.usuario === USUARIO_TN || m.usuario === DEMO_ONLINE_USER;
  const enApp = vigentes(app.movs).filter((m) => m.tipo === "venta" && inR(m.f, r))
    .filter((m) => !canal || (canal === "Online" ? esOnline(m) || grupoCanal(m.local) === "Online" : !esOnline(m) && grupoCanal(m.local) === canal))
    .sort((a, b) => (a.ts < b.ts ? 1 : -1));
  const v = d.ventas.filter((x) => delCanal(x) && inR(x.f, r)), c = d.ventas.filter((x) => delCanal(x) && inR(x.f, r.cmp));
  const monto = v.reduce((a, x) => a + x.monto, 0), montoC = c.reduce((a, x) => a + x.monto, 0);
  const pr = v.reduce((a, x) => a + x.prendas, 0), prC = c.reduce((a, x) => a + x.prendas, 0);
  const tk = pr ? monto / pr : 0, tkC = prC ? montoC / prC : 0;
  const totalNegocio = d.ventas.filter((x) => inR(x.f, r)).reduce((a, x) => a + x.monto, 0);
  const src: [string, string][] = [["Ventas Rosario (demo)", sheetUrl(SHEETS.ventasSI)], ["Ventas online (demo)", sheetUrl(SHEETS.ventasOnline)], ["02 · Ventas maestro › Todos (Mendoza y otros canales)", sheetUrl(SHEETS.ventas)]];
  const color = canal ? colorCanal(canal) : undefined;

  const porCanal = sumBy(v, (x) => grupoCanal(x.canal), (x) => x.monto);
  const prendasModelo = new Map(sumBy(v, (x) => x.modelo || "Sin modelo", (x) => x.prendas));
  const porModelo = sumBy(v, (x) => x.modelo || "Sin modelo", (x) => x.monto).slice(0, 12);
  const porMedio = sumBy(v, (x) => normMedio(x.medio), (x) => x.monto);
  const dow = Array.from({ length: 7 }, (_, i) => v.filter((x) => new Date(x.f + "T12:00:00Z").getUTCDay() === i).reduce((a, x) => a + x.monto, 0));
  const ordenDow = [1, 2, 3, 4, 5, 6, 0];

  // Mes a mes, 24 meses: prendas (volumen real) o facturación
  const enPesos = u === "m";
  const mesCanales = canal ? [canal] : canales;
  const series = mesCanales.map((k) => ({ name: k, color: colorCanal(k), values: meses.map((m) => d.ventas.filter((x) => ym(x.f) === m && grupoCanal(x.canal) === k).reduce((a, x) => a + (enPesos ? x.monto : x.prendas), 0)) }));

  // Temporada contra temporada (antes «Ventas Consolidado»). Cada temporada va de agosto a julio.
  const t0 = temporada(hoy);
  const tot = (rr: { desde: string; hasta: string }, k?: string) => {
    const x = d.ventas.filter((y) => inR(y.f, rr) && (!k || grupoCanal(y.canal) === k));
    return { m: x.reduce((a, y) => a + y.monto, 0), p: x.reduce((a, y) => a + y.prendas, 0) };
  };
  // Las últimas tres temporadas, salvo las que no tienen ventas cargadas
  const temps = [2, 1, 0].map((k) => {
    const y = Number(t0.hasta.slice(0, 4)) - k;
    return { nombre: "T" + String(y).slice(2), desde: `${y - 1}-08-01`, hasta: `${y}-07-31` };
  }).filter((t, i, a) => i === a.length - 1 || tot(t).p > 0);
  const rows = canales.map((k) => [k, ...temps.flatMap((t) => { const x = tot(t, k); return [fmt.M(x.m), fmt.n(x.p)]; })]);
  const totals = ["Total", ...temps.flatMap((t) => { const x = tot(t); return [fmt.M(x.m), fmt.n(x.p)]; })];
  const mix = temps.slice(-2).map((t) => ({ t, v: tot(t), c: canales.map((k) => ({ c: k, m: tot(t, k).m })) }));

  return (
    <Page leido={d.leido} eyebrow={canal ? `Análisis de ventas · ${canal}` : "Análisis de ventas"} title={<>Lo que <em>vendimos</em></>} lede={`${r.label}. Comparado con ${r.cmp.label}.`}>
      {!d.ventas.length && <p className="note" style={{ marginBottom: 12 }}>Todavía no hay ventas registradas en las planillas de demostración.</p>}
      <div style={{ marginBottom: 8 }}><Seg opts={OPTS} value={r.k} href={(k) => qs({ p: k })} /></div>
      {d.fuentesVentas?.map((f) => (
        <p key={f.canal} className={f.error ? "warn" : "note"} style={{ margin: "0 0 6px" }}>
          {f.canal}: {f.error ? `uso la copia vieja de 02 · Ventas maestro (hasta el ${fechaCorta(f.hasta)}). ${f.error}` : f.filas ? `datos de la planilla de demostración, última venta el ${fechaCorta(f.hasta)}.` : "sin ventas registradas en la planilla de demostración."}
        </p>
      ))}
      <div style={{ marginBottom: 14 }}><Seg label="Canal" opts={[["", "Todos"], ...canales.map((k): [string, string] => [slug(k), k === "Otros canales" ? "Otros" : k])]} value={canal ? slug(canal) : ""} href={(k) => qs({ c: k || null })} /></div>
      <Kpis>
        <Kpi q={1} n={fmt.M(monto)} l="Facturación" s={`${fmt.var(monto, montoC)} · antes ${fmt.M(montoC)}`} tone={monto >= montoC ? "good" : "bad"}
          back={{ q: canal ? `Suma de lo cobrado en el período, sólo ${canal}.` : "Suma de lo cobrado en el período, todos los canales.", a: "En pesos corrientes: parte del crecimiento es inflación. Para ver volumen real mirá las prendas.", src }} />
        <Kpi q={2} n={fmt.n(pr)} l="Prendas" s={`${fmt.var(pr, prC)} · antes ${fmt.n(prC)}`} tone={pr >= prC ? "good" : "bad"}
          back={{ q: "Unidades vendidas en el período.", a: "Crecimiento real, sin efecto de precios.", src }} />
        <Kpi q={3} n={fmt.M(tk)} l="Ticket por prenda" s={`${fmt.var(tk, tkC)} vs antes`}
          back={{ q: "Facturación dividida prendas.", a: "Si crece menos que la inflación, hay más descuentos o más ventas en efectivo/transferencia (15% off).", src }} />
        {canal
          ? <Kpi q={4} n={totalNegocio ? fmt.p(monto / totalNegocio) : "—"} l="Del total del negocio" s={`${fmt.n(v.length)} ventas en el período`}
              back={{ q: `Qué parte de la facturación total hizo ${canal}.`, a: "Sirve para ver si el canal gana o pierde peso frente a los otros.", src }} />
          : <Kpi q={4} n={fmt.n(v.length)} l="Ventas" s={`${(pr / Math.max(1, v.length)).toFixed(1).replace(".", ",")} prendas por venta`}
              back={{ q: "Cantidad de operaciones registradas.", a: "Si sube la cantidad de prendas por venta, las clientas se llevan más de una (conjuntos, regalos).", src }} />}
      </Kpis>

      <div className="duo">
      {!canal && (
        <Section title="Por canal" sub="Tocá un canal arriba para ver sólo ese.">
          <Panel>
            <HBars items={porCanal.map(([k, val]) => ({ label: k, value: val, color: colorCanal(k), sub: monto ? fmt.p(val / monto) : "" }))} />
          </Panel>
        </Section>
      )}

      <Section title="Modelos más vendidos" sub="Los 12 que más facturaron en el período.">
        <Panel>
          <HBars items={porModelo.map(([k, val]) => ({ label: k, value: val, color, sub: `${fmt.n(prendasModelo.get(k) || 0)} un.` }))} />
        </Panel>
      </Section>
      </div>

      <div className="grid2">
        <Section title="Cómo pagan">
          <Panel><HBars items={porMedio.map(([k, val]) => ({ label: k, value: val, color: "var(--s2)", sub: monto ? fmt.p(val / monto) : "", mute: k === "Sin dato" }))} /></Panel>
        </Section>
        <Section title="Día de la semana">
          <Panel><Columns labels={ordenDow.map((i) => DIAS[i])} series={[{ name: "Ventas", color: color || "var(--s3)", values: ordenDow.map((i) => dow[i]) }]} h={170} /></Panel>
        </Section>
      </div>

      <Section title="Historial de ventas" sub="Las ventas ficticias, con modelo, color, talle, importe y canal. Sale de la hoja Movimientos de Producción y stock.">
        {app.error && <p className="err">No pude leer los movimientos: {app.error}</p>}
        {enApp.length ? <HistorialVentas ventas={enApp.map((m): VentaC => ({
          id: m.id, ts: m.ts, f: m.f, canal: esOnline(m) ? "Online" : "Local", local: m.local,
          prenda: `${m.modelo} · ${m.color} · T${m.talle}`, cant: -m.cant, monto: m.monto, quien: m.usuario.split("@")[0], medio: m.medio,
        }))} /> : !app.error && <p className="empty">En este período no hay ventas registradas en Movimientos{canal ? ` para ${canal}` : ""}.</p>}
      </Section>

      <Section title="Mes a mes" sub={`Últimos 24 meses${canal ? `, ${canal}` : " por canal"}, sin importar el período elegido.`}>
        <div style={{ marginBottom: 10 }}><Seg label="Unidad" opts={[["p", "Prendas"], ["m", "Facturación"]]} value={enPesos ? "m" : "p"} href={(k) => qs({ u: k })} /></div>
        <Panel>
          <Columns labels={meses.map((m, i) => (i % 2 ? "" : mesLabel(m)))} series={series} f={enPesos ? fmt.M : fmt.n} h={230} highlight={23} />
          <Legend items={series.map((s) => ({ name: s.name, color: s.color }))} />
        </Panel>
      </Section>

      <div id="temporadas" />
      <Section title="Temporada contra temporada" sub="Facturación y prendas por canal. Cada temporada va de agosto a julio; la actual va hasta hoy.">
        <Table head={["Canal", ...temps.flatMap((t) => [`${t.nombre} $`, "un."])]} rows={rows} tot={totals} num={temps.flatMap((_, i) => [2 * i + 1, 2 * i + 2])} />
      </Section>

      <div id="precio-lleno" />
      <PrecioLleno ventas={precioLleno(d.ventas).filter(delCanal)} temps={temps} actual={t0.nombre} canal={canal} />

      <Section title="Mix de canales" sub="Qué parte de la facturación hizo cada canal.">
        <Panel>
          {mix.map(({ t, v: tv, c: tc }) => (
            <div key={t.nombre} style={{ marginBottom: 14 }}>
              <div className="m" style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}><b>{t.nombre}{t.nombre === t0.nombre ? " (en curso)" : ""}</b><span>{fmt.M(tv.m)}</span></div>
              <div style={{ display: "flex", gap: 2, height: 24 }}>
                {tc.filter((x) => x.m > 0).map((x) => <div key={x.c} title={`${x.c} ${fmt.p(x.m / tv.m)}`} style={{ flex: `${x.m} 1 0`, background: colorCanal(x.c), borderRadius: 4 }} />)}
              </div>
              <div className="legend">{tc.filter((x) => x.m > 0).map((x) => <span key={x.c}><i style={{ background: colorCanal(x.c) }} />{x.c} {fmt.p(x.m / tv.m)}</span>)}</div>
            </div>
          ))}
        </Panel>
      </Section>
    </Page>
  );
}
