import type { ReactNode } from "react";
import { Aviso, Page } from "@/components/Page";
import { FilaDetalle } from "@/components/Detalle";
import { Campos, Estado, Fuente, Grupo, Hero, LinkLi, Linkify, cuentaGrande, fechaPlanCorta } from "@/components/Plan";
import { Section, Seg, Table } from "@/components/ui";
import { PLAN, folderUrl, sheetUrl } from "@/lib/config";
import { archivoDe, archivosLanzamiento, cel, col, cuenta, diasHasta, errorPlan, fechaPlan, leerLibro, metaDe, norm, tablaDe, type Libro, type Tabla } from "@/lib/plan";

export const dynamic = "force-dynamic";

const CARPETA = "12 · Timeline de lanzamientos";

export default async function Lanzamientos({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { v = "" } = await searchParams;
  const vista = v === "ideas" ? "ideas" : "lanz";
  const seg = <Seg label="Vista" value={vista} opts={[["lanz", "Lanzamientos"], ["ideas", "Ideas de contenido"]]} href={(k) => (k === "lanz" ? "/lanzamientos" : "/lanzamientos?v=ideas")} />;
  const shell = (leido: string, body: ReactNode) => (
    <Page leido={leido} eyebrow={CARPETA} title={<>Timeline de <em>lanzamientos</em></>}
      lede="Qué se lanzó, qué viene y cuándo; con los hitos de cada colección y el banco de ideas.">
      {seg}
      {body}
    </Page>
  );
  try {
    if (vista === "ideas") {
      const l = await leerLibro(PLAN.ideas);
      return shell(l.leido, <Ideas l={l} />);
    }
    const [l, archivos] = await Promise.all([leerLibro(PLAN.indice), archivosLanzamiento()]);
    const propios = await Promise.all(archivos.map((a) => leerLibro(a.id).catch(() => null)));
    return shell(l.leido, <Indice l={l} archivos={archivos.map((a, i) => ({ ...a, libro: propios[i] }))} />);
  } catch (e) {
    return shell(new Date().toISOString(), <div style={{ marginTop: 16 }}><Aviso t={errorPlan(e, CARPETA)} detalle={String((e as Error)?.message || e).slice(0, 400)} /></div>);
  }
}

function Indice({ l, archivos }: { l: Libro; archivos: { id: string; name: string; libro: Libro | null }[] }) {
  const t = tablaDe(l, /lanzamiento/i) || l.tablas[0];
  if (!t) return <p className="empty">La planilla está vacía.</p>;
  const c = { n: col(t, "Lanzamiento"), temp: col(t, "Temp"), tipo: col(t, "Tipo"), cuando: col(t, "Cuándo"), L: col(t, "Día L"), est: col(t, "Estado"), det: col(t, "Detalle", "Fuente") };
  const filas = t.rows.filter((r) => cel(r, c.n));
  const hecho = (r: string[]) => /hecho/i.test(cel(r, c.est));
  const vienen = filas.filter((r) => !hecho(r));
  const pasados = filas.filter(hecho).reverse();
  const prox = vienen.find((r) => /curso/i.test(cel(r, c.est))) || vienen[0];
  const temps = [...new Set(pasados.map((r) => cel(r, c.temp) || "Sin temporada"))];

  const fila = (r: string[]) => {
    const f = fechaPlan(cel(r, c.L)), arch = archivoDe(cel(r, c.det), archivos);
    return (
      <FilaDetalle key={cel(r, c.n)} title={cel(r, c.n)} sub={[cel(r, c.tipo), cel(r, c.temp)].filter(Boolean).join(" · ")}
        fila={<><div><div className="t">{cel(r, c.n)}</div><div className="m">{[cel(r, c.tipo), cel(r, c.cuando)].filter(Boolean).join(" · ")}</div></div>
          <div className="v">{hecho(r) ? f && <small>{fechaPlanCorta(f)}</small> : <Estado s={cel(r, c.est)} />}{f && !hecho(r) && <small>{cuenta(diasHasta(f))}</small>}</div></>}>
        <Campos items={[["Cuándo", cel(r, c.cuando)], ["Día L", cel(r, c.L) && `${cel(r, c.L)}${f ? ` · ${cuenta(diasHasta(f))}` : ""}`], ["Estado", cel(r, c.est) && <Estado s={cel(r, c.est)} />], ["Temporada", cel(r, c.temp)], ["Detalle y fuente", cel(r, c.det)]]} />
        {arch && <a className="gbtn wide" style={{ marginTop: 14, textDecoration: "none" }} href={`/lanzamientos/${arch.id}`}>Ver hitos y calendario ›</a>}
      </FilaDetalle>
    );
  };

  const fp = prox ? fechaPlan(cel(prox, c.L)) : "";
  return (
    <>
      {prox && (
        <div style={{ marginTop: 16 }}>
          <Hero e={/curso/i.test(cel(prox, c.est)) ? "En curso" : "Lo próximo"} t={cel(prox, c.n)} {...cuentaGrande(fp)}
            m={[cel(prox, c.tipo), cel(prox, c.cuando), cel(prox, c.temp)].filter(Boolean).join(" · ")} />
        </div>
      )}
      <Section title="Lo que viene" sub="Tocá uno para ver de dónde sale la fecha.">
        {vienen.length ? <div className="list">{vienen.map(fila)}</div> : <p className="empty">No hay lanzamientos pendientes cargados.</p>}
      </Section>
      {archivos.length > 0 && (
        <Section title="Colecciones con su timeline" sub="Hitos día por día, calendario de contenido y pendientes.">
          <div className="list">
            {archivos.map((a) => {
              const dl = metaDe(a.libro?.tablas[0], /d[ií]a l/i), f = fechaPlan(dl);
              return <LinkLi key={a.id} href={`/lanzamientos/${a.id}`} t={a.libro?.tablas[0]?.titulo || a.name}
                m={[f ? `Día L ${fechaPlanCorta(f)}` : "", f ? cuenta(diasHasta(f)) : "", a.libro ? `${a.libro.tablas.length} pestañas` : ""].filter(Boolean).join(" · ")} />;
            })}
          </div>
        </Section>
      )}
      <Section title="Lo que ya se lanzó">
        <div className="list grouped">
          {temps.map((tp) => <Grupo key={tp} t={tp}>{pasados.filter((r) => (cel(r, c.temp) || "Sin temporada") === tp).map(fila)}</Grupo>)}
        </div>
        {t.pies.map((p) => <p className="note" key={p}>{p}</p>)}
      </Section>
      <p className="note" style={{ marginTop: 18 }}>Para sumar un lanzamiento con su timeline: copiá «Modelo · Nuevo lanzamiento» en la carpeta, cargá el día L y aparece acá.</p>
      <Fuente links={[["Índice", sheetUrl(PLAN.indice)], ["Modelo", sheetUrl(PLAN.modelo)], ["Carpeta", folderUrl(PLAN.carpetas.lanzamientos)]]} />
    </>
  );
}

function Ideas({ l }: { l: Libro }) {
  const t = tablaDe(l, /idea/i) || l.tablas[0];
  const rec = tablaDe(l, /recurso/i);
  if (!t) return <p className="empty">La planilla está vacía.</p>;
  const c = { cat: col(t, "Categoría"), idea: col(t, "Idea"), f: col(t, "Fuente"), est: col(t, "Estado"), usada: col(t, "Usada en") };
  const filas = t.rows.filter((r) => cel(r, c.idea));
  const cats = [...new Set(filas.map((r) => cel(r, c.cat) || "Otras"))];
  const usadas = filas.filter((r) => /hecho/i.test(cel(r, c.est))).length;
  const slug = (s: string) => "c-" + norm(s).replace(/[^a-z0-9]+/g, "-");
  return (
    <>
      <div style={{ marginTop: 16 }}>
        <Hero q={3} e="Banco de ideas" t={<>{filas.length} ideas en {cats.length} categorías</>} m={usadas ? `${usadas} ya usadas` : "Ninguna marcada como usada todavía"} />
      </div>
      <nav className="chips" style={{ marginTop: 14 }} aria-label="Categorías">
        {cats.map((k) => <a key={k} className="mini" href={`#${slug(k)}`}>{k.replace(/^Fechas · /, "")}</a>)}
      </nav>
      {cats.map((k) => (
        <section key={k} id={slug(k)} className="pl-sec">
          <div className="grp">{k}</div>
          <div className="list">
            {filas.filter((r) => (cel(r, c.cat) || "Otras") === k).map((r, i) => (
              <div className="li lw" key={i}>
                <div><div className="t">{cel(r, c.idea)}</div><div className="m">{[cel(r, c.f), cel(r, c.usada) && `usada en ${cel(r, c.usada)}`].filter(Boolean).join(" · ")}</div></div>
                <div className="v"><Estado s={cel(r, c.est)} /></div>
              </div>
            ))}
          </div>
        </section>
      ))}
      {rec && <Recursos t={rec} />}
      <Fuente links={[["Banco de ideas", sheetUrl(PLAN.ideas)]]} />
    </>
  );
}

/** Recursos: bloques separados por filas de una sola celda («Referentes», «Tabla de talles») */
function Recursos({ t }: { t: Tabla }) {
  const bloques: { t: string; rows: string[][] }[] = [{ t: "Links", rows: [] }];
  for (const r of [t.head, ...t.rows]) {
    if (r.filter(Boolean).length === 1 && r[0]) bloques.push({ t: r[0], rows: [] });
    else if (!/^para qu/i.test(r[0] || "")) bloques[bloques.length - 1].rows.push(r);
  }
  return (
    <Section title="Recursos y referentes" sub={t.nota}>
      {bloques.filter((b) => b.rows.length).map((b) => {
        if (/talle/i.test(b.t) && b.rows.length > 1) {
          const [h, ...rs] = b.rows;
          const cols = h[1]?.split("·").map((s) => s.trim()) || [];
          return <div key={b.t} className="pl-sec"><div className="grp">{b.t}</div>
            <Table head={[h[0], ...cols]} rows={rs.map((r) => [<b key="t">{r[0]}</b>, ...(r[1]?.split("·").map((s) => s.trim()) || [])])} num={cols.map((_, i) => i + 1)} /></div>;
        }
        return (
          <div key={b.t} className="pl-sec"><div className="grp">{b.t}</div>
            <div className="list">{b.rows.map((r, i) => <div className="li lw" key={i}><div><div className="m">{r[0]}</div><div className="t" style={{ fontWeight: 600 }}><Linkify s={r[1] || ""} /></div></div></div>)}</div>
          </div>
        );
      })}
    </Section>
  );
}
