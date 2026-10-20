import { cel, col, fechaPlan, norm, type Tabla } from "@/lib/plan";
import { FilaDetalle } from "./Detalle";
import { Campos, Estado, Linea, Linkify, fechaPlanCorta, type Hito } from "./Plan";

const DIAS = /^(lun|mar|mi[eé]|jue|vie|s[aá]b|dom)\.?$/i;
const offset = (v: string, h: string) => {
  const n = Number(v.replace(/[−–]/g, "-"));
  if (!v || Number.isNaN(n)) return v;
  const s = n === 0 ? "" : n > 0 ? `+${n}` : `−${-n}`;
  return /\bl\b|desde l/i.test(norm(h)) ? `L${s ? " " + s : ""}` : n === 0 ? "día 0" : `${s} d`;
};

/** Pestaña con fechas y hitos → línea de tiempo */
export function hitos(t: Tabla): Hito[] | null {
  const iT = col(t, "Hito", "Paso", "Qué pasó", "Qué");
  const iF = col(t, "Fecha", "Cuándo");
  if (iT < 0 || iF < 0) return null;
  const iOff = col(t, "Días desde L", "Relativo al día L", "Día");
  const iDia = t.head.findIndex((_, j) => j !== iOff && t.rows.some((r) => DIAS.test(cel(r, j))));
  const iArea = col(t, "Área"), iResp = col(t, "Responsable"), iEst = col(t, "Estado");
  return t.rows.filter((r) => cel(r, iT)).map((r) => {
    const f = fechaPlan(cel(r, iF));
    return {
      cuando: f ? fechaPlanCorta(f) : cel(r, iF), fecha: f || undefined,
      sub: [iDia >= 0 ? cel(r, iDia) : "", offset(cel(r, iOff), t.head[iOff] || "")].filter(Boolean).join(" · "),
      t: cel(r, iT), m: [cel(r, iArea), cel(r, iResp)].filter(Boolean).join(" · "), estado: cel(r, iEst),
      detalle: t.head.map((h, j) => [h, cel(r, j)] as [string, string]).filter(([h, v], j) => h && v && j !== iT && j !== iDia),
    };
  });
}

/** Muestra cualquier pestaña de las planillas de planificación según sus columnas. */
export function TablaVista({ t }: { t: Tabla }) {
  const h = hitos(t);
  if (h) return <div className="panel tl-p"><Linea items={h} titulo={t.titulo} /></div>;

  // Calendario de contenido: un día por fila, columnas por formato (Reel, Post…)
  const fmts = ["Reel", "Post", "Historia", "TikTok", "Acciones"].map((n) => col(t, n)).filter((i) => i >= 0);
  const iF = col(t, "Fecha");
  if (fmts.length >= 2 && iF >= 0) {
    const iL = col(t, "L"), iD = col(t, "Día");
    const dias = t.rows.filter((r) => fmts.some((i) => cel(r, i)));
    return (
      <>
        <div className="list">
          {dias.map((r, k) => (
            <div className={`li lw cal${cel(r, iL) === "0" ? " l0" : ""}`} key={k}>
              <div>
                <div className="t">{cel(r, iD)} {cel(r, iF)}{iL >= 0 && cel(r, iL) && <span className="ltag">{offset(cel(r, iL), "L")}</span>}</div>
                {fmts.filter((i) => cel(r, i)).map((i) => <div className="cal-e" key={i}><b>{t.head[i]}</b>{cel(r, i)}</div>)}
              </div>
            </div>
          ))}
        </div>
        {t.rows.length > dias.length && <p className="note">{t.rows.length - dias.length === 1 ? "Un día sin nada cargado no se muestra." : `${t.rows.length - dias.length} días sin nada cargado no se muestran.`}</p>}
      </>
    );
  }

  // Una sola columna: textos (los cortos son subtítulos)
  if (t.head.filter(Boolean).length <= 1) {
    return (
      <div className="panel prosa">
        {[t.head, ...t.rows].filter((r) => r[0]).map((r, k) => (r[0].length < 40 ? <h3 key={k}>{r[0]}</h3> : <p key={k}><Linkify s={r[0]} /></p>))}
      </div>
    );
  }

  // Genérico: agrupa por la primera columna si se repite (celdas vacías = misma que arriba)
  const filas: string[][] = [];
  for (const r of t.rows) filas.push(!r[0] && filas.length ? [filas[filas.length - 1][0], ...r.slice(1)] : r);
  const agrupa = t.head.length > 2 && new Set(filas.map((r) => r[0])).size < filas.length;
  const iEst = col(t, "Estado"), iU = col(t, "Unidades");
  let iT = col(t, "Hito", "Paso", "Pendiente", "Tarea", "Idea", "Qué", "Tipo", "Color");
  if (iT < 0 || (agrupa && iT === 0)) iT = agrupa ? 1 : 0;
  const resto = (r: string[]) => t.head.map((_, j) => j).filter((j) => j !== iT && j !== iEst && j !== iU && !(agrupa && j === 0) && cel(r, j));
  const item = (r: string[], k: number) => {
    const titulo = cel(r, iT) + (iU >= 0 && cel(r, iU) ? ` · ${cel(r, iU)} u.` : "");
    const fila = <><div><div className="t">{titulo || "—"}</div><div className="m">{resto(r).map((j) => cel(r, j)).join(" · ")}</div></div><div className="v"><Estado s={cel(r, iEst)} /></div></>;
    return t.head.length > 4
      ? <FilaDetalle key={k} className="li lw" title={titulo} sub={agrupa ? r[0] : undefined} fila={fila}><Campos items={t.head.map((hd, j) => [hd, cel(r, j)])} /></FilaDetalle>
      : <div className="li lw" key={k}>{fila}</div>;
  };
  if (!agrupa) return <div className="list">{filas.map(item)}</div>;
  const grupos = [...new Set(filas.map((r) => r[0]))];
  return (
    <div className="list grouped">
      {grupos.map((g) => <div key={g} style={{ display: "contents" }}><div className="grp">{g}</div>{filas.filter((r) => r[0] === g).map(item)}</div>)}
    </div>
  );
}
