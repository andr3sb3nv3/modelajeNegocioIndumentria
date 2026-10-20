import { ErrorBox, Page } from "@/components/Page";
import { Back, HBars, Kpi, Kpis, Panel, Section } from "@/components/ui";
import { SHEETS, sheetUrl } from "@/lib/config";
import { getData } from "@/lib/data";
import { getExtra } from "@/lib/extra";
import { fmt } from "@/lib/fmt";

export const dynamic = "force-dynamic";
const SEG: [RegExp, string, string][] = [
  [/vip/i, "VIP", "4+ prendas, o 3 temporadas, o 3+ prendas en T26–T27. Adelanto de colección y beneficio exclusivo."],
  [/frecuente/i, "Frecuente", "2+ prendas y última compra en T26 o T27. La próxima compra las pasa a VIP."],
  [/nueva/i, "Nueva", "1 prenda, comprada en T27. Mensaje a los 30 días para la segunda compra."],
  [/recuperar/i, "A recuperar", "2+ prendas, última en T25 o antes. Mensaje de reencuentro."],
  [/una compra/i, "Una compra", "1 prenda, antes de T27. Newsletter general."],
];

export default async function Vip() {
  let d, x;
  try { [d, x] = await Promise.all([getData(), getExtra()]); } catch (e) { return <ErrorBox e={e} />; }
  const { head, rows } = x.clientas;
  const iS = head.findIndex((h) => /segmento/i.test(h));
  const iP = head.findIndex((h) => /prendas/i.test(h));
  const seg = (r: string[]) => r[iS] || "";
  const cuenta = (re: RegExp) => rows.filter((r) => re.test(seg(r))).length;
  const vip = rows.filter((r) => /vip/i.test(seg(r))).sort((a, b) => Number(b[iP] || 0) - Number(a[iP] || 0));
  const frec = rows.filter((r) => /frecuente/i.test(seg(r))).sort((a, b) => Number(b[iP] || 0) - Number(a[iP] || 0));
  const iN = Math.max(0, head.findIndex((h) => /clienta|nombre/i.test(h)));
  const iU = head.findIndex((h) => /últ|ult/i.test(h));
  const iL = head.findIndex((h) => /^temporadas?$/i.test(h.trim()));
  // Una columna por temporada (T22, T23…) si existe; si no, se toma la lista de la columna «Temporadas»
  const tCols = head.map((h, i) => [(h.match(/\bT\d{2}\b/g) || []).length === 1 && !/[–-]|segment|últ|ult/i.test(h) ? h.match(/\bT\d{2}\b/)![0] : "", i] as const).filter(([t]) => t) as [string, number][];
  const TEMPS = tCols.length ? tCols.map(([t]) => t) : ["T22", "T23", "T24", "T25", "T26", "T27"];
  const porTemp = (r: string[]) => TEMPS.map((t) => {
    const c = tCols.find(([x]) => x === t);
    if (c) return Number(String(r[c[1]]).replace(/\D/g, "")) || 0;
    return iL >= 0 && new RegExp(`\\b${t}\\b`).test(r[iL]) ? -1 : 0; // -1 = compró, sin cantidad
  });
  const Lista = ({ rs }: { rs: string[][] }) => (
    <div className="list">
      {rs.map((r, k) => (
        <div className="li vip" key={k}>
          <div>
            <div className="t">{r[iN]}</div>
            <div className="temps">
              {porTemp(r).map((n, j) => (
                <span key={j} className={`tc${n ? " on" : ""}`} title={`${TEMPS[j]}: ${n > 0 ? n + " prendas" : n ? "compró" : "no compró"}`}>
                  <b>{n > 0 ? n : n ? "•" : ""}</b><i>{TEMPS[j]}</i>
                </span>
              ))}
            </div>
          </div>
          <div className="v">{r[iP] || "—"}<small>{iU >= 0 && r[iU] ? `últ. ${r[iU]}` : "prendas"}</small></div>
        </div>
      ))}
    </div>
  );
  const una = rows.filter((r) => Number(r[iP] || 0) === 1).length;
  const src: [string, string][] = [["Clientas de demostración", sheetUrl(SHEETS.clientas)]];

  if (!rows.length) return (
    <Page leido={d.leido} eyebrow="Clientas · Listado VIP" title={<>Clientas <em>y VIP</em></>}>
      <Back />
      <p className="err" style={{ marginTop: 14 }}>{x.errores.find((e) => e.startsWith("Clientas")) ? "No pude leer la planilla de clientas de demostración." : "No encontré la columna «Segmento» en la hoja Clientas."}</p>
    </Page>
  );

  return (
    <Page leido={d.leido} eyebrow="Clientas · Listado VIP" title={<>Clientas <em>y VIP</em></>}
      lede="Todas las ventas de la marca, de T22 a hoy, en un listado que se actualiza solo con cada venta. Datos de contacto ocultos.">
      <Back />
      <div style={{ height: 12 }} />
      <Kpis>
        <Kpi q={1} n={fmt.n(rows.length)} l="Clientas distintas" back={{ q: "Filas de la hoja Clientas de Clientas de demostración.", a: "Junta Rosario, Online, Mendoza y las temporadas T22–T24.", src }} />
        <Kpi q={2} n={fmt.n(vip.length)} l="VIP" s="ver reglas abajo" />
        <Kpi q={3} n={fmt.n(frec.length)} l="Frecuentes" s="a una compra de ser VIP" />
        <Kpi q={4} n={rows.length ? fmt.p(una / rows.length) : "—"} l="Compró una sola prenda" s={`${fmt.n(una)} clientas`} />
      </Kpis>
      <Section title="Segmentos" sub="Cada clienta cae en un solo grupo; cambia sola cuando vuelve a comprar.">
        <Panel><HBars items={SEG.map(([re, n]) => ({ label: n, value: cuenta(re), color: n === "VIP" ? "var(--s1)" : n === "Frecuente" ? "var(--s4)" : "var(--s0)" }))} f={fmt.n} /></Panel>
        <div className="list" style={{ marginTop: 12 }}>{SEG.map(([, n, r]) => <div className="li" key={n}><div><div className="t">{n}</div><div className="m">{r}</div></div></div>)}</div>
      </Section>
      <Section title={`Las ${vip.length} VIP`}>
        <p className="sec-sub">Un círculo por temporada con las prendas que compró en cada una.</p>
        <Lista rs={vip} />
      </Section>
      <Section title="Frecuentes a un paso de ser VIP">
        <Lista rs={frec.slice(0, 40)} />
        {frec.length > 40 && <p className="note">Se muestran 40 de {frec.length}.</p>}
      </Section>
    </Page>
  );
}
