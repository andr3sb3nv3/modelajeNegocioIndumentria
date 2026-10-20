import { ErrorBox, Page } from "@/components/Page";
import { Back, Columns, HBars, Kpi, Kpis, Legend, Panel, Pill, Section } from "@/components/ui";
import { SHEETS, sheetUrl } from "@/lib/config";
import { getData } from "@/lib/data";
import { getExtra } from "@/lib/extra";
import { TIPOS as TIPOS_MOV, abiertos, leerMovimientos, vigentes } from "@/lib/stock";
import { addMonths, fechaCorta, fmt, hoyBA, mesLabel, sumBy, ym } from "@/lib/fmt";

export const dynamic = "force-dynamic";
const TIPOS: [string, string][] = [["canje", "var(--s1)"], ["préstamo", "var(--s2)"], ["contenido", "var(--s3)"]];

export default async function Canjes() {
  let d, x, app;
  try { [d, x, app] = await Promise.all([getData(), getExtra(), leerMovimientos()]); } catch (e) { return <ErrorBox e={e} />; }
  // Lo que se carga desde Stock en la app (préstamos, canjes, contenido), con quién lo cargó
  const afuera = new Set(abiertos(app.movs).map((m) => m.id));
  const enApp = vigentes(app.movs).filter((m) => m.tipo === "prestamo" || m.tipo === "canje" || m.tipo === "contenido").sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, 40);
  const C = [...x.canjes].sort((a, b) => (a.f < b.f ? 1 : -1));
  const prendas = C.reduce((a, c) => a + c.prendas.length, 0);
  const regaladas = C.filter((c) => /sin devoluci/i.test(c.estado + " " + c.devol)).reduce((a, c) => a + c.prendas.length, 0);
  const devueltas = C.filter((c) => /devuelt|confirmad/i.test(c.estado)).length;
  const meses = Array.from({ length: 12 }, (_, i) => addMonths(ym(hoyBA()), i - 11));
  const series = TIPOS.map(([t, color]) => ({ name: t, color, values: meses.map((m) => C.filter((c) => ym(c.f) === m && c.tipo.startsWith(t.slice(0, 4))).length) }));
  const modelos = sumBy(C.flatMap((c) => c.prendas.map((p) => ({ p }))), (o) => o.p, () => 1).slice(0, 10);

  return (
    <Page leido={d.leido} eyebrow="Marca · Préstamos, canjes y contenido" title={<>Préstamos <em>y canjes</em></>}
      lede="Prendas que salieron para canjes, préstamos y contenido, desde Marca demo · Canjes y préstamos.">
      <Back />
      <div style={{ height: 12 }} />
      {x.errores.some((e) => e.startsWith("Canjes")) && <p className="err">No pude leer la planilla de canjes: falta compartirla con la app.</p>}
      <Kpis>
        <Kpi q={1} n={fmt.n(C.length)} l="Registros" s={C.length ? `desde ${fechaCorta(C[C.length - 1].f)} ${C[C.length - 1].f.slice(0, 4)}` : ""} back={{ q: "Filas con fecha de la hoja «Canjes y préstamos».", a: "Un canje o préstamo no es una venta: no suma en facturación.", src: [["Marca demo · Canjes y préstamos", sheetUrl(SHEETS.canjes)]] }} />
        <Kpi q={2} n={fmt.n(prendas)} l="Prendas que salieron" />
        <Kpi q={3} n={fmt.n(regaladas)} l="Prendas regaladas" s="sin devolución" tone={regaladas ? "bad" : undefined} />
        <Kpi q={4} n={fmt.n(devueltas)} l="Devoluciones confirmadas" />
      </Kpis>
      <Section title="Movimientos en el tiempo" sub="Registros por mes y tipo, últimos 12 meses.">
        <Panel><Columns labels={meses.map(mesLabel)} series={series} f={fmt.n} /><Legend items={series.map((s) => ({ name: s.name, color: s.color }))} /></Panel>
      </Section>
      <Section title="Modelos que más salen">
        <Panel><HBars items={modelos.map(([k, v]) => ({ label: k, value: v, color: "var(--s4)" }))} f={fmt.n} /></Panel>
      </Section>
      {enApp.length > 0 && (
        <Section title="Cargados en la app" sub="Desde Stock: qué prenda salió, para quién y quién lo cargó.">
          <div className="list">
            {enApp.map((m) => (
              <div className="li" key={m.id}>
                <div><div className="t">{m.modelo} · {m.color} · T{m.talle}</div><div className="m">{TIPOS_MOV[m.tipo]} · {m.clienta || "—"} · cargó {m.usuario.split("@")[0]}</div></div>
                <div className="v"><Pill tone={m.tipo === "canje" ? "neu" : afuera.has(m.id) ? "warn" : "good"}>{m.tipo === "canje" ? "no vuelve" : afuera.has(m.id) ? "afuera" : "volvió"}</Pill><small>{fechaCorta(m.f)}</small></div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Detalle">
        <div className="list">
          {C.map((c, i) => (
            <div className="li" key={i}>
              <div><div className="t">{c.quien || "Sin nombre"}</div><div className="m">{c.tipo} · {c.prendas.join(", ") || "prendas sin cargar"}</div></div>
              <div className="v"><Pill tone={/devuelt/i.test(c.estado) ? "good" : /sin devoluci/i.test(c.estado) ? "neu" : "warn"}>{c.estado || "—"}</Pill><small>{fechaCorta(c.f)}</small></div>
            </div>
          ))}
        </div>
      </Section>
    </Page>
  );
}
