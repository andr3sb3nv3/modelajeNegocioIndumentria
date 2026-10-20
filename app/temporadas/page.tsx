import type { ReactNode } from "react";
import { Aviso, Page } from "@/components/Page";
import { Campos, Fuente, Hero, Linea, cuentaGrande, fechaLinda } from "@/components/Plan";
import { TablaVista, hitos } from "@/components/PlanTabla";
import { Section, Seg } from "@/components/ui";
import { PLAN, folderUrl, sheetUrl } from "@/lib/config";
import { cel, col, cuenta, diasHasta, errorPlan, fechaPlan, leerLibro, norm, type Tabla } from "@/lib/plan";
import { MESES_L, hoyBA } from "@/lib/fmt";

export const dynamic = "force-dynamic";
const CARPETA = "13 · Planificación de temporadas";
const corto = (tab: string) => (/a[ñn]o/i.test(tab) ? "Año" : /ciclo/i.test(tab) ? "Ciclo" : /cyber/i.test(tab) ? "Cyber" : /criterio/i.test(tab) ? "Criterios" : tab);

export default async function Temporadas({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { v = "" } = await searchParams;
  const shell = (leido: string, body: ReactNode) => (
    <Page leido={leido} eyebrow={CARPETA} title={<>Calendario <em>comercial</em></>} lede="Qué pasa cada mes del año de la marca, el ciclo de producción y el checklist de Cyber.">{body}</Page>
  );
  let l;
  try { l = await leerLibro(PLAN.calendario); } catch (e) {
    return shell(new Date().toISOString(), <Aviso t={errorPlan(e, CARPETA)} detalle={String((e as Error)?.message || e).slice(0, 400)} />);
  }
  const tabs = l.tablas.filter((x) => x.rows.length);
  const tab = tabs.find((x) => norm(corto(x.tab)) === norm(v)) || tabs[0];
  if (!tab) return shell(l.leido, <p className="empty">La planilla está vacía.</p>);
  const k = corto(tab.tab);
  return shell(l.leido, (
    <>
      {tabs.length > 1 && <Seg label="Vista" value={k} opts={tabs.map((x) => [corto(x.tab), corto(x.tab)])} href={(o) => (o === corto(tabs[0].tab) ? "/temporadas" : `/temporadas?v=${encodeURIComponent(norm(o))}`)} />}
      {k === "Año" ? <Anio t={tab} /> : k === "Cyber" ? <Cyber t={tab} /> : (
        <Section title={tab.titulo} sub={tab.nota}><TablaVista t={tab} /></Section>
      )}
      <Fuente links={[["Abrir planilla", sheetUrl(PLAN.calendario)], ["Carpeta", folderUrl(PLAN.carpetas.temporadas)]]} />
    </>
  ));
}

function Anio({ t }: { t: Tabla }) {
  const iM = col(t, "Mes");
  const mesHoy = MESES_L[Number(hoyBA().slice(5, 7)) - 1];
  const filas = t.rows.filter((r) => cel(r, iM));
  const campos = (r: string[]) => t.head.map((h, j) => [h, cel(r, j)] as [string, string]).filter(([h, v], j) => j !== iM && h && v);
  const ahora = filas.find((r) => norm(cel(r, iM)) === norm(mesHoy));
  const iA = filas.indexOf(ahora as string[]);
  // Arranca en el mes actual y da la vuelta
  const orden = iA > 0 ? [...filas.slice(iA), ...filas.slice(0, iA)] : filas;
  return (
    <>
      {ahora && (
        <div style={{ marginTop: 16 }}>
          <Hero e="Este mes" t={cel(ahora, iM)}>
            <div className="ph-campos"><Campos items={campos(ahora)} /></div>
          </Hero>
        </div>
      )}
      <Section title={t.titulo} sub={t.nota}>
        <div className="meses">
          {orden.filter((r) => r !== ahora).map((r) => (
            <div className="panel mes-c" key={cel(r, iM)}>
              <h3>{cel(r, iM)}</h3>
              <div className="body"><Campos items={campos(r)} /></div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function Cyber({ t }: { t: Tabla }) {
  const arranque = t.meta.find(([k]) => /arranque|inicio|d[ií]a/i.test(k)) || t.meta[0];
  const f = fechaPlan(arranque?.[1] || "");
  const h = hitos(t) || [];
  const prox = h.find((x) => x.fecha && x.fecha >= hoyBA() && !/hecho/i.test(x.estado || ""));
  const hechos = h.filter((x) => /hecho/i.test(x.estado || "")).length;
  return (
    <>
      <div style={{ marginTop: 16 }}>
        <Hero q={2} e={arranque?.[0] || "Arranque"} t={arranque?.[1] ? fechaLinda(arranque[1], f) : "Sin fecha"} {...cuentaGrande(f)}
          m={prox ? <>Lo próximo: <b>{prox.t}</b> · {prox.cuando}{prox.fecha ? ` (${cuenta(diasHasta(prox.fecha))})` : ""}</> : `${hechos} de ${h.length} pasos hechos`} />
      </div>
      <Section title={t.titulo} sub={t.nota}>
        <div className="panel tl-p"><Linea items={h} titulo={t.titulo} /></div>
        <p className="note">Para otro año, cambiá la fecha de arranque en la planilla: las fechas se recalculan solas.</p>
      </Section>
    </>
  );
}
