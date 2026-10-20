"use client";
import { useEffect, useMemo, useState } from "react";
import { useCompu } from "./Shell";
export type ItemC = { local: string; modelo: string; color: string; talle: string; q: number };
const TALLES = ["1", "2", "3", "4"];
const otros = (tl: Record<string, number>) => Object.entries(tl).reduce((a, [t, k]) => (TALLES.includes(t) ? a : a + k), 0);
const n = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Grilla de stock por modelo con buscador. */
/** `sinTalle`: por modelo, prendas vendidas después del conteo que sólo están en la hoja Ventas (no dice color ni talle). */
export function Grilla({ items, sinTalle = {} }: { items: ItemC[]; sinTalle?: Record<string, number> }) {
  const [q, setQ] = useState("");
  // En la compu hay lugar: los modelos se muestran abiertos, en dos columnas
  const compu = useCompu();
  const porModelo = useMemo(() => {
    const m = new Map<string, Map<string, Record<string, number>>>();
    for (const i of items) {
      const c = m.get(i.modelo) || new Map(); m.set(i.modelo, c);
      const t = c.get(i.color) || {}; c.set(i.color, t);
      t[i.talle] = (t[i.talle] || 0) + i.q;
    }
    return [...m.entries()].map(([k, c]) => {
      const menos = sinTalle[k] || 0;
      return { k, c, menos, tot: [...c.values()].reduce((a, t) => a + Object.values(t).reduce((x, y) => x + y, 0), 0) - menos };
    }).filter((x) => x.tot !== 0 || x.menos).sort((a, b) => b.tot - a.tot);
  }, [items, sinTalle]);
  const lista = porModelo.filter((x) => !q || n(x.k).includes(n(q)) || [...x.c.keys()].some((c) => n(c).includes(n(q))));
  return (
    <>
      <input className="buscar" type="search" placeholder="Buscar modelo o color…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mods">
      {lista.map((x) => (
        <details className="mod" key={`${x.k}${compu ? "-c" : ""}`} open={!!q || compu}>
          <summary><span className="t">{x.k}<span className="m">{x.c.size} {x.c.size === 1 ? "color" : "colores"}</span></span><span className="q">{x.tot}</span><span className="chev">›</span></summary>
          <table className="sz">
            <thead><tr><th>Color</th>{TALLES.map((t) => <th key={t}>T{t}</th>)}<th>Total</th></tr></thead>
            <tbody>
              {[...x.c.entries()].map(([c, tl]) => (
                <tr key={c}>
                  {/* Prendas contadas sin talle (la planilla sólo tiene el total en STOCK ACTUAL): suman al total de la fila */}
                  <td>{c}{otros(tl) > 0 && <small> · {otros(tl)} sin talle</small>}</td>
                  {TALLES.map((t) => { const k = tl[t] ?? 0; return <td key={t} className={k <= 0 ? "z" : k === 1 ? "lo" : ""}>{k}</td>; })}
                  <td className="tot">{Object.values(tl).reduce((a, k) => a + k, 0)}</td>
                </tr>
              ))}
              {x.menos > 0 && (
                <tr className="sintalle">
                  <td colSpan={TALLES.length + 1}>Vendidas sin talle <small>hoja Ventas, después del conteo</small></td>
                  <td className="tot">−{x.menos}</td>
                </tr>
              )}
            </tbody>
          </table>
        </details>
      ))}
      </div>
      {!lista.length && <p className="empty">{q ? "No encontré ese modelo." : "No hay stock cargado."}</p>}
    </>
  );
}

/** Antigüedad de la lectura de las planillas de demostración. */
export function SyncBadge({ leido }: { leido: string }) {
  const [s, setS] = useState(0);
  useEffect(() => {
    const tick = () => setS(Math.max(0, Math.round((Date.now() - new Date(leido).getTime()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [leido]);
  const hace = s < 60 ? `${s} s` : s < 3600 ? `${Math.floor(s / 60)} min` : `${Math.floor(s / 3600)} h`;
  return (
    <p className="syncb on" role="status">
      <span className="dot" /><b>Datos leídos hace {hace}</b><span>Planillas de demostración · Vista de consulta</span>
    </p>
  );
}

export type VentaC = { id: string; ts: string; f: string; canal: "Local" | "Tiendanube"; local: string; prenda: string; cant: number; monto: number; quien: string; medio: string };

/** Historial de ventas con filtros por canal, prenda y quién la cargó. */
export function HistorialVentas({ ventas }: { ventas: VentaC[] }) {
  const [canal, setCanal] = useState<"" | VentaC["canal"]>("");
  const [quien, setQuien] = useState("");
  const [q, setQ] = useState("");
  const quienes = useMemo(() => [...new Set(ventas.map((v) => v.quien))].sort(), [ventas]);
  const lista = ventas.filter((v) => (!canal || v.canal === canal) && (!quien || v.quien === quien) && (!q || n(v.prenda).includes(n(q))));
  const tot = lista.reduce((a, v) => a + v.monto, 0), pr = lista.reduce((a, v) => a + v.cant, 0);
  return (
    <>
      <div className="chipsel" role="radiogroup" aria-label="Canal" style={{ marginBottom: 8 }}>
        {(["", "Local", "Tiendanube"] as const).map((c) => (
          <button key={c} type="button" role="radio" aria-checked={canal === c} className={canal === c ? "on" : ""} onClick={() => setCanal(c)}>{c || "Todas"}</button>
        ))}
      </div>
      <div className="filtros">
        <input className="buscar" type="search" placeholder="Buscar modelo, color o talle…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={quien} onChange={(e) => setQuien(e.target.value)} aria-label="Quién cargó">
          <option value="">Cargó: todas</option>
          {quienes.map((x) => <option key={x}>{x}</option>)}
        </select>
      </div>
      <p className="note" style={{ margin: "0 0 8px" }}>{fmtN(pr)} {pr === 1 ? "prenda" : "prendas"} · $ {fmtN(tot)}</p>
      {lista.length ? (
        <div className="list">
          {lista.slice(0, 100).map((v) => (
            <div className="li" key={v.id}>
              <div>
                <div className="t">{v.prenda}{v.cant > 1 ? ` ×${v.cant}` : ""}</div>
                <div className="m"><span className={`pill ${v.canal === "Tiendanube" ? "good" : "neu"}`}>{v.canal}</span>{v.local} · {v.quien} · {cuando(v.ts, v.f)}{v.medio ? ` · ${v.medio}` : ""}</div>
              </div>
              <div className="v">{v.monto ? `$ ${fmtN(v.monto)}` : "—"}</div>
            </div>
          ))}
        </div>
      ) : <p className="empty">No hay ventas con esos filtros.</p>}
    </>
  );
}

const fmtN = (v: number) => new Intl.NumberFormat("es-AR").format(Math.round(v));
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function cuando(ts: string, f: string) {
  const hora = /\d{2}:\d{2}/.exec(ts.slice(10))?.[0];
  return `${Number(f.slice(8, 10))} ${MES[Number(f.slice(5, 7)) - 1]}${hora ? ` ${hora}` : ""}`;
}
