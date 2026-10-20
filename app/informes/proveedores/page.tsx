import Link from "next/link";
import { ErrorBox, Page } from "@/components/Page";
import { Back, Columns, HBars, Kpi, Kpis, Panel, Section, Seg } from "@/components/ui";
import { getData } from "@/lib/data";
import { getExtra } from "@/lib/extra";
import { fechaCorta, fmt, mesLabel, sumBy, ym } from "@/lib/fmt";
import { ultimosMeses } from "@/lib/periodo";

export const dynamic = "force-dynamic";

const ES_TALLER_NORTE = /taller demo norte/i;
const slug = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/** A qué proveedor corresponde un nombre cargado en las planillas (los registros de Taller Demo Norte se agrupan). */
const clave = (nombre: string) => (ES_TALLER_NORTE.test(nombre) ? "taller-demo-norte" : slug(nombre));
/** Cuántos proveedores entran en la botonera; el resto queda en «Más». */
const VISIBLES = 8;

/** Datos fijos de contacto (no están en ninguna planilla todavía). */
const CONTACTO: Record<string, { quien: string; donde: string }> = {
  "taller-demo-norte": { quien: "Equipo Taller Demo Norte", donde: "Contacto ficticio · Atención de ejemplo de 10 a 17 h" },
};

export default async function Proveedores({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p: pq } = await searchParams;
  let d, x;
  try { [d, x] = await Promise.all([getData(), getExtra()]); } catch (e) { return <ErrorBox e={e} />; }

  // Todos los proveedores que aparecen en Producción, Pagos a producción, Compras de telas y Gastos.
  const meses = ultimosMeses(12);
  const nombres = new Map<string, { nombre: string; peso: number; que: Set<string> }>();
  const suma = (n: string, peso: number, que: string) => {
    if (!n.trim()) return;
    const k = clave(n);
    const e = nombres.get(k) || { nombre: k === "taller-demo-norte" ? "Taller Demo Norte" : n.trim(), peso: 0, que: new Set<string>() };
    e.peso += peso; e.que.add(que); nombres.set(k, e);
  };
  x.prod.forEach((r) => suma(r.taller, 0, "Confección"));
  x.pagos.forEach((r) => suma(r.taller, r.moneda === "ARS" ? r.monto : 0, "Confección"));
  x.telas.forEach((r) => suma(r.prov, r.moneda === "ARS" ? r.total : 0, "Telas"));
  d.gastos.filter((g) => ym(g.f) >= meses[0]).forEach((g) => suma(g.prov, g.imp, g.cat));
  if (!nombres.has("taller-demo-norte")) nombres.set("taller-demo-norte", { nombre: "Taller Demo Norte", peso: 0, que: new Set(["Confección"]) });

  const lista = [...nombres.entries()].sort(([a, A], [b, B]) => (a === "taller-demo-norte" ? -1 : b === "taller-demo-norte" ? 1 : B.peso - A.peso));
  const sel = lista.find(([k]) => k === pq)?.[0] || (pq === "mas" ? "mas" : "taller-demo-norte");
  const visibles = lista.slice(0, VISIBLES);
  if (sel !== "mas" && !visibles.some(([k]) => k === sel)) visibles.push(lista.find(([k]) => k === sel)!);
  const opts: [string, string][] = [...visibles.map(([k, v]): [string, string] => [k, v.nombre]), ...(lista.length > VISIBLES ? [["mas", "Más"] as [string, string]] : [])];
  const selector = <div className="prov-sel"><Seg label="Proveedor" opts={opts} value={sel} href={(k) => `/informes/proveedores?p=${k}`} /></div>;

  if (sel === "mas") {
    return (
      <Page leido={d.leido} eyebrow="Proveedores" title={<>Todos los <em>proveedores</em></>}
        lede="Todos los que aparecen en Producción y stock y en 01 · Gastos maestro (último año), de mayor a menor plata.">
        <Back />
        {selector}
        <div className="list">
          {lista.map(([k, v]) => (
            <Link className="li" key={k} href={`/informes/proveedores?p=${k}`}>
              <div><div className="t">{v.nombre}</div><div className="m">{[...v.que].slice(0, 3).join(" · ")}</div></div>
              <div className="v">{v.peso ? fmt.M(v.peso) : "—"}</div>
            </Link>
          ))}
        </div>
      </Page>
    );
  }

  const prov = nombres.get(sel)!;
  const es = (n: string) => !!n.trim() && clave(n) === sel;
  const P = x.prod.filter((r) => es(r.taller));
  const pagos = x.pagos.filter((r) => es(r.taller)).sort((a, b) => (a.f < b.f ? 1 : -1));
  const telas = x.telas.filter((r) => es(r.prov)).sort((a, b) => (a.f < b.f ? 1 : -1));
  const gastos = d.gastos.filter((g) => es(g.prov)).sort((a, b) => (a.f < b.f ? 1 : -1));
  const gastosAno = gastos.filter((g) => ym(g.f) >= meses[0]);
  const hecho = (e: string) => /entreg|recib|termin/i.test(e);
  const entregadas = P.filter((r) => hecho(r.estado)).reduce((a, r) => a + r.cant, 0);
  const enCurso = P.filter((r) => !hecho(r.estado)).reduce((a, r) => a + r.cant, 0);
  const pagado = pagos.filter((r) => r.moneda === "ARS").reduce((a, r) => a + r.monto, 0);
  const telasArs = telas.filter((r) => r.moneda === "ARS").reduce((a, r) => a + r.total, 0);
  const metros = telas.reduce((a, r) => a + r.metros, 0);
  const precios = P.filter((r) => r.precio).sort((a, b) => b.precio - a.precio);
  const porMes = meses.map((m) => gastos.filter((g) => ym(g.f) === m).reduce((a, g) => a + g.imp, 0));
  const totalAno = porMes.reduce((a, b) => a + b, 0);
  const ultimo = gastos[0]?.f || pagos[0]?.f || telas[0]?.f || "";
  const cats = sumBy(gastosAno, (g) => g.cat, (g) => g.imp);
  const contacto = CONTACTO[sel];

  const falta: string[] = [];
  if (!contacto) falta.push("contacto (quién es, dirección, horarios)");
  if (!P.length && !telas.length && !pagos.length) falta.push("pedidos o compras en Producción y stock (sólo aparece en Gastos)");
  if (!gastos.length) falta.push("gastos en 01 · Gastos maestro con este proveedor en la columna «Proveedor»");

  const kpis: [string, string, string][] = [["Plata último año", fmt.M(totalAno), `${gastosAno.length} gastos en Gastos`]];
  if (P.length) kpis.push(["Prendas entregadas", fmt.n(entregadas), `${fmt.n(enCurso)} en curso`]);
  if (pagos.length) kpis.push(["Pagos documentados", fmt.M(pagado), `${pagos.length} pagos`]);
  if (telas.length) kpis.push(["Telas compradas", fmt.M(telasArs), `${fmt.n(metros)} m en ${telas.length} compras`]);
  if (precios[0]) kpis.push(["Confección más cara", fmt.ars(precios[0].precio), `${precios[0].modelo} ${precios[0].temp}`]);
  kpis.push(["Último movimiento", ultimo ? fechaCorta(ultimo) : "—", ultimo.slice(0, 4)]);

  return (
    <Page leido={d.leido} eyebrow="Proveedores" title={<>{prov.nombre}{sel === "taller-demo-norte" && <> · <em>Equipo demo</em></>}</>}
      lede={`${[...prov.que].slice(0, 3).join(" · ")}. Desde Producción y stock y 01 · Gastos maestro.`}>
      <Back />
      {selector}
      {contacto && (
        <div className="list" style={{ margin: "0 0 6px" }}>
          <div className="li"><div><div className="t">{contacto.quien}</div><div className="m">{contacto.donde}</div></div></div>
        </div>
      )}
      <Kpis>{kpis.slice(0, 4).map(([l, n, s], i) => <Kpi key={l} q={(i + 1) as 1 | 2 | 3 | 4} n={n} l={l} s={s} />)}</Kpis>

      {P.length > 0 && <>
        <Section title="Pedidos por temporada y estado">
          <Panel><HBars items={sumBy(P, (r) => `${r.temp} · ${r.estado || "sin estado"}`, (r) => r.cant).map(([k, v]) => ({ label: k, value: v, color: /entreg|recib/i.test(k) ? "var(--s3)" : "var(--s4)" }))} f={fmt.n} /></Panel>
        </Section>
        {precios.length > 0 && <Section title="Confección por prenda" sub="Precio por prenda en cada temporada.">
          <Panel><HBars items={[...new Map(precios.map((r) => [`${r.modelo} ${r.temp}`, r.precio])).entries()].slice(0, 15).map(([k, v]) => ({ label: k, value: v, color: "var(--s4)" }))} f={fmt.ars} /></Panel>
        </Section>}
      </>}

      <Section title="Plata" sub="Lo cargado en 01 · Gastos maestro para este proveedor, últimos 12 meses.">
        {totalAno ? <Panel><Columns labels={meses.map(mesLabel)} series={[{ name: "Gastos", color: "var(--s1)", values: porMes }]} highlight={11} /></Panel>
          : <p className="empty">Sin gastos a su nombre en el último año.</p>}
      </Section>
      {cats.length > 1 && <Section title="En qué se le pagó" sub="Por categoría de Gastos, último año.">
        <Panel><HBars items={cats.slice(0, 8).map(([k, v]) => ({ label: k, value: v, color: "var(--s2)" }))} /></Panel>
      </Section>}

      {telas.length > 0 && <Section title="Compras de telas">
        <div className="list">
          {telas.slice(0, 20).map((r, i) => (
            <div className="li" key={i}><div><div className="t">{r.tela || "Tela"}</div><div className="m">{[r.temp, r.metros ? `${fmt.n(r.metros)} m` : ""].filter(Boolean).join(" · ")}</div></div>
              <div className="v">{r.moneda === "ARS" ? fmt.ars(r.total) : `${r.moneda} ${fmt.n(r.total)}`}<small>{fechaCorta(r.f)}</small></div></div>
          ))}
        </div>
      </Section>}

      {pagos.length > 0 && <Section title="Pagos documentados" sub="Hoja «Pagos a producción».">
        <div className="list">
          {pagos.slice(0, 20).map((r, i) => (
            <div className="li" key={i}><div><div className="t">{r.concepto || "Pago"}{r.modelo ? ` · ${r.modelo}` : ""}</div><div className="m">{r.temp} · {r.taller}</div></div>
              <div className="v">{r.moneda === "ARS" ? fmt.ars(r.monto) : `${r.moneda} ${fmt.n(r.monto)}`}<small>{fechaCorta(r.f)}</small></div></div>
          ))}
        </div>
      </Section>}

      {gastos.length > 0 && <Section title="Últimos gastos" sub="01 · Gastos maestro.">
        <div className="list">
          {gastos.slice(0, 15).map((g, i) => (
            <div className="li" key={i}><div><div className="t">{g.desc || g.cat}</div><div className="m">{[g.cat, g.medio, g.est].filter(Boolean).join(" · ")}</div></div>
              <div className="v">{fmt.ars(g.imp)}<small>{fechaCorta(g.f)}</small></div></div>
          ))}
        </div>
      </Section>}

      {falta.length > 0 && <Section title="Qué falta cargar">
        <div className="list">
          {falta.map((f) => <div className="li" key={f}><div><div className="m">{f}</div></div></div>)}
          <div className="li"><div><div className="t">Se completa en la planilla de prueba</div><div className="m">Podés completar los datos ficticios del proveedor en la planilla de prueba. La app los refleja en su próxima actualización.</div></div></div>
        </div>
      </Section>}
    </Page>
  );
}
