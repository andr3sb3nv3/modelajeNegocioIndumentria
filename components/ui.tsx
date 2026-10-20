import Link from "next/link";
import type { ReactNode } from "react";
import { fmt } from "@/lib/fmt";
import { ColumnsChart, type Serie } from "./Columns";
import { Flip } from "./Flip";

export type KpiProps = { n: string; l: string; s?: string; q?: 1 | 2 | 3 | 4; tone?: "good" | "bad"; back?: { q: string; a: string; src?: [string, string][] } };

export function Kpi({ n, l, s, q = 1, tone, back }: KpiProps) {
  const front = (
    <div className={`kpi q${q}`}>
      <div className="n">{n}</div>
      <div className="l">{l}</div>
      {s && <div className={`s ${tone || ""}`}>{s}</div>}
    </div>
  );
  if (!back) return front;
  return (
    <Flip title={`${n} · ${l}`} back={
      <div className="bk-in">
        <div><div className="bk-e">Detrás del dato</div><div className="bk-t">{l}</div></div>
        <div className="bk-s"><b>Qué muestra</b>{back.q}</div>
        <div className="bk-s"><b>Cómo se lee</b>{back.a}</div>
        {back.src && <div className="bk-src"><span>Fuente:</span>{back.src.map(([t, u]) => <a key={u} href={u} target="_blank" rel="noopener">{t} ↗</a>)}</div>}
      </div>
    }>{front}</Flip>
  );
}

export function Kpis({ children }: { children: ReactNode }) {
  return <div className="kpis">{children}</div>;
}

export function Section({ title, sub, children, right }: { title: string; sub?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section>
      <div className="sec-h"><h2>{title}</h2>{right}</div>
      {sub && <p className="sec-sub">{sub}</p>}
      {children}
    </section>
  );
}

export function Panel({ title, sub, children }: { title?: string; sub?: string; children: ReactNode }) {
  return (
    <div className="panel">
      {title && <h3>{title}</h3>}
      {sub && <p className="sub">{sub}</p>}
      <div className={title || sub ? "body" : ""}>{children}</div>
    </div>
  );
}

export type Bar = { label: string; value: number; sub?: string; color?: string; mute?: boolean };
export function HBars({ items, f = fmt.M, max }: { items: Bar[]; f?: (v: number) => string; max?: number }) {
  const m = max ?? Math.max(1, ...items.map((d) => d.value));
  if (!items.length) return <p className="empty">Sin datos en este período.</p>;
  return (
    <div className="hb">
      {items.map((d) => (
        <div className="row" key={d.label}>
          <div className="lab">{d.label}</div>
          <div className="trk"><div className={`bar${d.mute ? " mute" : ""}`} style={{ width: `${Math.max(0.5, (d.value / m) * 100)}%`, background: d.color }} /></div>
          <div className="val">{f(d.value)}{d.sub && <small>{d.sub}</small>}</div>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { name: string; color: string; cls?: string }[] }) {
  return <div className="legend">{items.map((i) => <span key={i.name}><i className={i.cls} style={{ background: i.color }} />{i.name}</span>)}</div>;
}

/** Columnas SVG apiladas o agrupadas, tocables (ver ColumnsChart). Etiqueta arriba de cada columna con el total. */
export function Columns({ f = fmt.M, ...p }: {
  labels: string[]; series: Serie[]; mode?: "stack" | "group"; f?: (v: number) => string; h?: number; highlight?: number;
}) {
  return <ColumnsChart {...p} unidad={f === fmt.n ? "n" : "M"} />;
}

/** Botonera de opciones. Por defecto arma ?p=…; href permite conservar otros parámetros. */
export function Seg({ opts, value, base, href, label = "Período" }: { opts: [string, string][]; value: string; base?: string; href?: (k: string) => string; label?: string }) {
  return (
    <nav className="seg" aria-label={label}>
      {opts.map(([k, t]) => <Link key={k} href={href ? href(k) : `${base}?p=${k}`} className={k === value ? "on" : ""} scroll={false}>{t}</Link>)}
    </nav>
  );
}

export function Pill({ tone, children }: { tone: "good" | "warn" | "bad" | "neu"; children: ReactNode }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

/** Tabla simple; columnas numéricas alineadas a la derecha. tot = fila de totales. */
export function Table({ head, rows, num = [], tot }: { head: string[]; rows: ReactNode[][]; num?: number[]; tot?: ReactNode[] }) {
  return (
    <div className="tw">
      <table>
        <thead><tr>{head.map((h, i) => <th key={i} className={num.includes(i) ? "n" : ""}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, j) => <tr key={j}>{r.map((c, i) => <td key={i} className={num.includes(i) ? "n" : ""}>{c}</td>)}</tr>)}
          {tot && <tr className="tot">{tot.map((c, i) => <td key={i} className={num.includes(i) ? "n" : ""}>{c}</td>)}</tr>}
        </tbody>
      </table>
    </div>
  );
}

export function Back({ href = "/informes", label = "Informes" }: { href?: string; label?: string }) {
  return <Link href={href} className="back">‹ {label}</Link>;
}

/** Para moverse en el tiempo: período anterior / siguiente (sin siguiente cuando ya es el actual). */
export function PeriodoNav({ label, prev, next }: { label: string; prev: { href: string; t: string } | null; next: { href: string; t: string } | null }) {
  const flecha = (d: string) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
  return (
    <nav className="pnav" aria-label="Cambiar período">
      {prev ? <Link href={prev.href} className="pn-b" aria-label={prev.t} scroll={false}>{flecha("M15 5l-7 7 7 7")}</Link> : <span className="pn-b off" aria-hidden>{flecha("M15 5l-7 7 7 7")}</span>}
      <span className="pn-l">{label}</span>
      {next ? <Link href={next.href} className="pn-b" aria-label={next.t} scroll={false}>{flecha("M9 5l7 7-7 7")}</Link> : <span className="pn-b off" aria-hidden>{flecha("M9 5l7 7-7 7")}</span>}
    </nav>
  );
}

export type Vista = "dia" | "semana" | "mes";
const VISTAS: [Vista, string][] = [["dia", "Día"], ["semana", "Semana"], ["mes", "Mes"]];

/** Inicio: botonera Día / Semana / Mes. Cada una abre en el período actual. */
export function VistaNav({ v }: { v: Vista }) {
  return (
    <nav className="vnav" aria-label="Ver por">
      {VISTAS.map(([k, t]) => (
        <Link key={k} href={k === "dia" ? "/" : `/?v=${k}`} className={k === v ? "on" : ""} aria-current={k === v ? "page" : undefined} scroll={false}>{t}</Link>
      ))}
    </nav>
  );
}
