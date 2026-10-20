"use client";
import { Fragment, type ReactNode } from "react";
import { fmt } from "@/lib/fmt";
import type { Capitulo } from "@/lib/tesis-mayorista";

/** Piezas que comparten las dos opciones del canal mayorista (online a todo el país y multimarcas). */
/** **negrita** → <b> */
export function T({ s }: { s: string }) {
  const links = (t: string) => t.split(/(https:\/\/\S+)/g).map((u, j) => (j % 2 ? <a key={j} href={u} target="_blank" rel="noopener">abrir ↗</a> : u));
  return <>{s.split(/\*\*(.+?)\*\*/g).map((t, i) => (i % 2 ? <b key={i}>{t}</b> : <Fragment key={i}>{links(t)}</Fragment>))}</>;
}

export function Reparto({ t, partes, total }: { t: string; partes: [string, string, number][]; total: number }) {
  return (
    <div className="my-rep">
      <span className="t">{t}</span>
      <div className="my-rep-bar">{partes.map(([k, l, v]) => <i key={k} className={k} style={{ flexGrow: v }} title={`${l}: ${fmt.ars(v)}`}>{v / total > 0.14 ? <span>{l}<br />{fmt.M(v)}</span> : null}</i>)}</div>
      <div className="my-rep-ley">{partes.map(([k, l, v]) => <span key={k}><i className={k} />{l} {fmt.M(v)}</span>)}</div>
    </div>
  );
}

export function TesisVista({ caps, ey, titulo, planilla, generado }: { caps: Capitulo[]; ey: string; titulo: string; planilla: string; generado: string }) {
  const bloque = (b: Capitulo["b"][number], i: number): ReactNode =>
    "p" in b ? <p key={i}><T s={b.p} /></p>
      : "ul" in b ? <ul key={i}>{b.ul.map((l) => <li key={l}><T s={l} /></li>)}</ul>
        : <div key={i} className="my-tt"><table><thead><tr>{b.tabla.cab.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>{b.tabla.filas.map((f, j) => <tr key={j}>{f.map((c, k) => <td key={k}><T s={c} /></td>)}</tr>)}</tbody></table></div>;
  return (
    <article className="my-tesis">
      <header className="gl my-tes-cab">
        <span className="my-ey">{ey}</span>
        <h2>{titulo}</h2>
        <p>Un modelo de negocio ficticio para explorar. Los números salen de la planilla «{planilla}» al {new Date(generado).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}.</p>
      </header>
      <nav className="gl my-ind" aria-label="Índice">
        <b>Índice</b>
        <ol>{caps.map((c, i) => (
          <Fragment key={c.id}>
            {c.parte && c.parte !== caps[i - 1]?.parte && <li className="parte">{c.parte}</li>}
            <li value={i + 1}><a href={`#${c.id}`}>{c.t}</a></li>
          </Fragment>
        ))}</ol>
      </nav>
      {caps.map((c, i) => (
        <Fragment key={c.id}>{c.parte && c.parte !== caps[i - 1]?.parte && <div className="my-parte">{c.parte}</div>}<section id={c.id} className="my-cap">
          <h3><span>{i + 1}</span>{c.t}</h3>
          {c.b.map(bloque)}
        </section></Fragment>
      ))}
    </article>
  );
}

export function Rango({ l, v, min, max, step, f, on }: { l: string; v: number; min: number; max: number; step: number; f: (v: number) => string; on: (v: number) => void }) {
  return (
    <label className="my-r">
      <span>{l}<b>{f(v)}</b></span>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => on(Number(e.target.value))} />
    </label>
  );
}
