import { notFound } from "next/navigation";
import { Aviso, Page } from "@/components/Page";
import { Fuente, Hero, cuentaGrande, fechaLinda } from "@/components/Plan";
import { TablaVista } from "@/components/PlanTabla";
import { Back, Section, Seg } from "@/components/ui";
import { PLAN, sheetUrl } from "@/lib/config";
import { archivosLanzamiento, errorPlan, fechaPlan, leerLibro } from "@/lib/plan";

export const dynamic = "force-dynamic";

export default async function Lanzamiento({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ id }, { t = "0" }] = await Promise.all([params, searchParams]);
  const archivos = await archivosLanzamiento();
  if (![...archivos, ...PLAN.lanzamientos].some((a) => a.id === id)) notFound();
  let l;
  try { l = await leerLibro(id); } catch (e) {
    return <Page leido={new Date().toISOString()} eyebrow="Lanzamientos" title="Lanzamiento"><Back href="/lanzamientos" label="Lanzamientos" /><div style={{ marginTop: 16 }}><Aviso t={errorPlan(e, "12 · Timeline de lanzamientos")} /></div></Page>;
  }
  const tabs = l.tablas.filter((x) => x.rows.length);
  const i = Math.min(Math.max(0, Number(t) || 0), Math.max(0, tabs.length - 1));
  const tab = tabs[i];
  const primera = l.tablas[0];
  const meta = l.tablas.flatMap((x) => x.meta).find(([k]) => /d[ií]a l/i.test(k));
  const fL = fechaPlan(meta?.[1] || "");
  return (
    <Page leido={l.leido} eyebrow="Timeline de lanzamientos" title={primera?.titulo || l.nombre} lede={primera?.nota}>
      <Back href="/lanzamientos" label="Lanzamientos" />
      {meta && (
        <div style={{ marginTop: 14 }}>
          <Hero e={meta[0]} t={fechaLinda(meta[1], fL)} {...cuentaGrande(fL)} m="Las fechas de los hitos se cuentan desde este día." />
        </div>
      )}
      {tabs.length > 1 && <div style={{ marginTop: 16 }}><Seg label="Pestaña" value={String(i)} opts={tabs.map((x, k) => [String(k), x.tab])} href={(k) => `/lanzamientos/${id}?t=${k}`} /></div>}
      {tab ? (
        <Section title={tab.titulo} sub={tab !== primera ? tab.nota : undefined}>
          <TablaVista t={tab} />
          {tab.pies.map((p) => <p className="note" key={p}>{p}</p>)}
        </Section>
      ) : <p className="empty" style={{ marginTop: 16 }}>La planilla todavía no tiene datos.</p>}
      <Fuente links={[["Abrir planilla", sheetUrl(id)]]} />
    </Page>
  );
}
