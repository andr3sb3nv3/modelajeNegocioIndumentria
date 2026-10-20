import { ErrorBox, Page } from "@/components/Page";
import { Back, Pill, Section } from "@/components/ui";
import { SHEETS, sheetUrl } from "@/lib/config";
import { getData } from "@/lib/data";
import { fechaCorta, fmt, hoyBA } from "@/lib/fmt";

export const dynamic = "force-dynamic";

type Item = { t: string; d: string; n: number; total: number; meta: number; src: string };

export default async function Control() {
  let d;
  try { d = await getData(); } catch (e) { return <ErrorBox e={e} />; }
  const hoy = hoyBA(), anio = hoy.slice(0, 4);
  const g = d.gastos.filter((x) => x.f.startsWith(anio));
  const v = d.ventas.filter((x) => x.f.startsWith(anio));
  const G = sheetUrl(SHEETS.gastos), V = sheetUrl(SHEETS.ventas), S = sheetUrl(SHEETS.stock);
  const items: Item[] = [
    { t: "Gastos sin comprobante", d: `Gastos de ${anio} sin link en «Comprobante».`, n: g.filter((x) => !x.comp).length, total: g.length, meta: 0.1, src: G },
    { t: "Gastos sin medio de pago", d: `Gastos de ${anio} sin «Medio de pago».`, n: g.filter((x) => !x.medio).length, total: g.length, meta: 0, src: G },
    { t: "Gastos «A revisar»", d: "Marcados en la columna R. Confirmar o corregir.", n: d.gastos.filter((x) => x.rev).length, total: d.gastos.length, meta: 0, src: G },
    { t: "Gastos sin estado", d: "Sin Pagado / Pendiente: no se sabe qué se debe.", n: d.gastos.filter((x) => !x.est).length, total: d.gastos.length, meta: 0, src: G },
    { t: "Gastos en «Otros»", d: `Gastos de ${anio} en categoría Otros o sin categoría.`, n: g.filter((x) => /otros|sin cat/i.test(x.cat)).length, total: g.length, meta: 0.05, src: G },
    { t: "Ventas sin modelo", d: `Ventas de ${anio} sin modelo cargado.`, n: v.filter((x) => !x.modelo).length, total: v.length, meta: 0, src: V },
    { t: "Ventas sin medio de pago", d: `Ventas de ${anio} sin medio de pago.`, n: v.filter((x) => !x.medio).length, total: v.length, meta: 0, src: V },
    { t: "Ventas sin clienta", d: `Ventas de ${anio} sin clienta (no entran en el informe de clientas).`, n: v.filter((x) => !x.cli).length, total: v.length, meta: 0.05, src: V },
  ];
  const ult = new Map<string, string>();
  for (const s of d.stock) if (s.fecha > (ult.get(s.local) || "")) ult.set(s.local, s.fecha);
  const dias = (f: string) => Math.round((Date.parse(hoy) - Date.parse(f)) / 864e5);
  const tone = (x: Item) => { const r = x.total ? x.n / x.total : 0; return x.n === 0 ? "good" : r <= x.meta ? "warn" : "bad"; };
  const pend = items.filter((x) => x.n > 0).length;

  return (
    <Page leido={d.leido} eyebrow="Informe · Control de carga" title={<>Qué falta <em>cargar</em></>}
      lede={pend ? `${pend} de ${items.length} controles con pendientes. Cada uno lleva a la planilla para corregirlo.` : "Todo al día."}>
      <Back />
      <Section title="Planillas">
        <div className="list">
          {items.map((x) => (
            <a className="li" key={x.t} href={x.src} target="_blank" rel="noopener">
              <div>
                <div className="t">{x.t}</div>
                <div className="m">{x.d}</div>
              </div>
              <div className="v"><Pill tone={tone(x)}>{x.n === 0 ? "OK" : fmt.n(x.n)}</Pill><small>{x.total ? `de ${fmt.n(x.total)}` : ""}</small></div>
            </a>
          ))}
        </div>
      </Section>
      <Section title="Conteos de stock" sub="Días desde el último conteo de cada local.">
        <div className="list">
          {[...ult.entries()].map(([l, f]) => (
            <a className="li" key={l} href={S} target="_blank" rel="noopener">
              <div><div className="t">{l}</div><div className="m">Último conteo: {fechaCorta(f)}</div></div>
              <div className="v"><Pill tone={dias(f) <= 15 ? "good" : dias(f) <= 45 ? "warn" : "bad"}>{dias(f)} días</Pill></div>
            </a>
          ))}
        </div>
      </Section>
    </Page>
  );
}
