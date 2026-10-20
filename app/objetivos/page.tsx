import type { ReactNode } from "react";
import { Aviso, Page } from "@/components/Page";
import { FilaDetalle } from "@/components/Detalle";
import { Campos, Fuente, Grupo } from "@/components/Plan";
import { TablaVista } from "@/components/PlanTabla";
import { PeriodoNav, Section, Seg } from "@/components/ui";
import { PLAN, folderUrl, sheetUrl } from "@/lib/config";
import { cel, col, errorPlan, leerLibro, norm, type Tabla } from "@/lib/plan";
import { MESES_L, hoyBA } from "@/lib/fmt";

export const dynamic = "force-dynamic";
const CARPETA = "14 · Objetivos Marca demo";
const VISTAS: [string, string, RegExp][] = [["plan", "Plan del año", /^plan/i], ["tareas", "Tareas", /due[ñn]a|^tareas$/i], ["vendedoras", "Vendedoras", /vendedora|emplead/i], ["mayoristas", "Mayoristas", /mayorist/i]];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default async function Objetivos({ searchParams }: { searchParams: Promise<{ v?: string; a?: string; m?: string }> }) {
  const sp = await searchParams;
  const shell = (leido: string, body: ReactNode) => (
    <Page leido={leido} eyebrow={CARPETA} title={<>Objetivos <em>por área</em></>} lede="El plan del año mes a mes, las tareas que se repiten y el criterio para mayoristas.">{body}</Page>
  );
  let l;
  try { l = await leerLibro(PLAN.objetivos); } catch (e) {
    return shell(new Date().toISOString(), <Aviso t={errorPlan(e, CARPETA)} detalle={String((e as Error)?.message || e).slice(0, 400)} />);
  }
  const planes = l.tablas.filter((t) => /^plan/i.test(t.tab) && t.rows.length).sort((a, b) => (a.tab < b.tab ? 1 : -1));
  const vistas = VISTAS.filter(([k, , re]) => (k === "plan" ? planes.length : l.tablas.some((t) => re.test(t.tab))));
  const otras = l.tablas.filter((t) => t.rows.length && !VISTAS.some(([, , re]) => re.test(t.tab)));
  const opts: [string, string][] = [...vistas.map(([k, n]) => [k, n] as [string, string]), ...otras.map((t) => [norm(t.tab), t.tab] as [string, string])];
  const v = opts.find(([k]) => k === sp.v)?.[0] || opts[0]?.[0] || "plan";
  const tabDe = (re: RegExp) => l.tablas.find((t) => re.test(t.tab));
  let body: ReactNode;
  if (v === "plan") body = <Plan planes={planes} a={sp.a} m={sp.m} />;
  else if (v === "tareas") body = <Tareas t={tabDe(VISTAS[1][2])!} />;
  else if (v === "mayoristas") body = <Pares t={tabDe(VISTAS[3][2])!} />;
  else {
    const t = v === "vendedoras" ? tabDe(VISTAS[2][2]) : otras.find((x) => norm(x.tab) === v);
    body = t ? <Section title={t.titulo} sub={t.nota}><TablaVista t={t} /></Section> : null;
  }
  return shell(l.leido, (
    <>
      {opts.length > 1 && <Seg label="Vista" value={v} opts={opts} href={(k) => (k === opts[0][0] ? "/objetivos" : `/objetivos?v=${encodeURIComponent(k)}`)} />}
      {body}
      <Fuente links={[["Abrir planilla", sheetUrl(PLAN.objetivos)], ["Carpeta", folderUrl(PLAN.carpetas.objetivos)]]} />
    </>
  ));
}

/** Plan por área: filas = áreas, columnas = meses. Se recorre mes a mes. */
function Plan({ planes, a, m }: { planes: Tabla[]; a?: string; m?: string }) {
  const hoy = hoyBA();
  const anio = (t: Tabla) => t.tab.match(/\d{4}/)?.[0] || t.tab;
  const t = planes.find((x) => anio(x) === a) || planes.find((x) => anio(x) === hoy.slice(0, 4)) || planes[0];
  if (!t) return <p className="empty">No hay plan cargado.</p>;
  const y = anio(t);
  const meses = t.head.map((h, j) => [norm(h), j] as [string, number]).filter(([h]) => MESES_L.includes(h));
  const mesHoy = y === hoy.slice(0, 4) ? Number(hoy.slice(5, 7)) : 1;
  const mi = Math.min(Math.max(1, Number(m) || mesHoy), 12);
  const j = meses.find(([h]) => h === MESES_L[mi - 1])?.[1] ?? -1;
  const iA = col(t, "Área");
  const areas = t.rows.filter((r) => cel(r, iA));
  const con = areas.filter((r) => cel(r, j));
  const sin = areas.filter((r) => !cel(r, j)).map((r) => cel(r, iA));
  const url = (k: number, yy = y) => `/objetivos?a=${yy}&m=${k}`;
  // Cuántos objetivos tiene cada mes (para la tira de arriba)
  const cuenta = MESES_L.map((nm) => { const jj = meses.find(([h]) => h === nm)?.[1] ?? -1; return areas.filter((r) => cel(r, jj)).length; });
  const max = Math.max(1, ...cuenta);
  return (
    <>
      {planes.length > 1 && (
        <nav className="chips" style={{ marginTop: 14 }} aria-label="Año">
          {planes.map((p) => <a key={p.tab} className={`mini${p === t ? " on" : ""}`} href={url(mi, anio(p))}>{anio(p)}</a>)}
        </nav>
      )}
      <div style={{ marginTop: planes.length > 1 ? 0 : 16 }}>
        <PeriodoNav label={`${cap(MESES_L[mi - 1])} ${y}`} prev={mi > 1 ? { href: url(mi - 1), t: "Mes anterior" } : null} next={mi < 12 ? { href: url(mi + 1), t: "Mes siguiente" } : null} />
      </div>
      <nav className="tira" aria-label="Meses">
        {MESES_L.map((nm, k) => (
          <a key={nm} href={url(k + 1)} className={k + 1 === mi ? "on" : ""} aria-label={`${nm}: ${cuenta[k]} objetivos`}>
            <i style={{ height: `${Math.max(8, (cuenta[k] / max) * 100)}%`, opacity: cuenta[k] ? 1 : 0.35 }} />
            <span>{nm.slice(0, 1).toUpperCase()}</span>
          </a>
        ))}
      </nav>
      <Section title={`Qué hay en ${MESES_L[mi - 1]}`} sub={t.nota}>
        {con.length ? (
          <div className="list">
            {con.map((r) => <div className="li lw objm" key={cel(r, iA)}><div><div className="m">{cel(r, iA)}</div><div className="t">{cel(r, j)}</div></div></div>)}
          </div>
        ) : <p className="empty">Nada planeado para este mes.</p>}
        {con.length > 0 && sin.length > 0 && <p className="note">Sin nada este mes: {sin.join(", ")}.</p>}
      </Section>
    </>
  );
}

function Tareas({ t }: { t: Tabla }) {
  const c = { t: col(t, "Tarea"), d: col(t, "Descripción"), f: col(t, "Frecuencia"), a: col(t, "Área"), donde: col(t, "Archivo", "Dónde"), u: col(t, "Última vez") };
  const filas = t.rows.filter((r) => cel(r, c.t));
  const orden = ["diaria", "semanal", "quincenal", "mensual", "trimestral", "anual"];
  const frec = [...new Set(filas.map((r) => cel(r, c.f) || "Sin frecuencia"))].sort((a, b) => {
    const ia = orden.indexOf(norm(a)), ib = orden.indexOf(norm(b));
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  return (
    <Section title={t.titulo} sub={t.nota}>
      <div className="list grouped">
        {frec.map((fq) => (
          <Grupo key={fq} t={fq}>
            {filas.filter((r) => (cel(r, c.f) || "Sin frecuencia") === fq).map((r, i) => (
              <FilaDetalle key={i} className="li lw" title={cel(r, c.t)} sub={[cel(r, c.f), cel(r, c.a)].filter(Boolean).join(" · ")}
                fila={<><div><div className="t">{cel(r, c.t)}</div><div className="m">{[cel(r, c.a), cel(r, c.d)].filter(Boolean).join(" · ")}</div></div><div className="v">{cel(r, c.u) && <small>{cel(r, c.u)}</small>}</div></>}>
                <Campos items={t.head.map((h, j) => [h, cel(r, j)])} />
              </FilaDetalle>
            ))}
          </Grupo>
        ))}
      </div>
    </Section>
  );
}

/** Pestañas de «clave: valor» (Mayoristas) */
function Pares({ t }: { t: Tabla }) {
  const filas = [t.head, ...t.rows].filter((r) => r.some(Boolean));
  return (
    <Section title={t.titulo} sub={t.nota}>
      <div className="panel"><Campos items={filas.map((r) => [r[0] || "", r.slice(1).filter(Boolean).join(" · ")])} /></div>
    </Section>
  );
}
