import Link from "next/link";
import type { ReactNode } from "react";
import { cuenta, diasHasta, tonoEstado } from "@/lib/plan";
import { fechaCorta, hoyBA } from "@/lib/fmt";
import { FilaDetalle } from "./Detalle";
import { Pill } from "./ui";

/** Pares título → valor para el detalle (se saltean los vacíos). */
export function Campos({ items }: { items: [string, ReactNode][] }) {
  const f = items.filter(([, v]) => v !== "" && v != null);
  if (!f.length) return <p className="empty">Sin más datos.</p>;
  return (
    <dl className="campos">
      {f.map(([k, v], i) => <div key={i}><dt>{k}</dt><dd>{typeof v === "string" ? <Linkify s={v} /> : v}</dd></div>)}
    </dl>
  );
}

/** Texto con links tocables */
export function Linkify({ s }: { s: string }) {
  const parts = s.split(/(https?:\/\/\S+)/g);
  return <>{parts.map((p, i) => (/^https?:\/\//.test(p) ? <a key={i} href={p} target="_blank" rel="noopener">{p.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")} ↗</a> : p))}</>;
}

export const Estado = ({ s }: { s: string }) => (s ? <Pill tone={tonoEstado(s)}>{s}</Pill> : null);

/** Tarjeta destacada de arriba (vidrio) */
export function Hero({ e, t, m, n, nl, q = 1, children }: { e: string; t: ReactNode; m?: ReactNode; n?: string; nl?: string; q?: 1 | 2 | 3 | 4; children?: ReactNode }) {
  return (
    <div className={`ph q${q}`}>
      <div className="ph-top">
        <div className="ph-e">{e}</div>
        {n && <div className="ph-n">{n}<small>{nl}</small></div>}
      </div>
      <div className="ph-t">{t}</div>
      {m && <div className="ph-m">{m}</div>}
      {children}
    </div>
  );
}

/** Días que faltan como número grande + leyenda */
export function cuentaGrande(iso: string): { n?: string; nl?: string } {
  const d = diasHasta(iso);
  if (d == null) return {};
  if (d > 1) return { n: String(d), nl: "días" };
  if (d < -1) return { n: String(-d), nl: "días atrás" };
  return { n: cuenta(d) };
}

export type Hito = { cuando: string; fecha?: string; sub?: string; t: string; m?: string; estado?: string; detalle?: [string, string][] };

/** Línea de tiempo vertical; marca «hoy» entre lo pasado y lo que viene. */
export function Linea({ items, titulo }: { items: Hito[]; titulo?: string }) {
  const hoy = hoyBA();
  const fechadas = items.some((x) => x.fecha);
  const iHoy = fechadas ? items.findIndex((x) => x.fecha && x.fecha >= hoy) : -1;
  const iNext = items.findIndex((x) => x.fecha && x.fecha >= hoy && !/hecho/i.test(x.estado || ""));
  const out: ReactNode[] = [];
  items.forEach((x, i) => {
    if (i === iHoy && i > 0) out.push(<div className="tl-hoy" key="hoy"><span>Hoy</span></div>);
    const cls = `tl-i${/hecho|listo|entregad/i.test(x.estado || "") ? " ok" : ""}${i === iNext ? " next" : ""}`;
    const fila = (
      <>
        <span className="tl-f">{x.cuando}{x.sub && <small>{x.sub}</small>}</span>
        <span className="tl-c"><span className="tl-t">{x.t}</span>{x.m && <span className="tl-m">{x.m}</span>}</span>
        <span className="tl-v">{x.estado && !/hecho/i.test(x.estado) && <Estado s={x.estado} />}</span>
      </>
    );
    out.push(x.detalle?.some(([, v]) => v)
      ? <FilaDetalle key={i} className={cls} fila={fila} title={x.t} sub={[x.cuando, x.fecha && cuenta(diasHasta(x.fecha))].filter(Boolean).join(" · ")}><Campos items={x.detalle} /></FilaDetalle>
      : <div key={i} className={cls}>{fila}</div>);
  });
  return <div className="tl" aria-label={titulo}>{out}</div>;
}

/** Fecha aaaa-mm-dd → «19 ago» (+ año si no es este) */
export const fechaPlanCorta = (iso: string) => (iso ? fechaCorta(iso) + (iso.slice(0, 4) !== hoyBA().slice(0, 4) ? ` ${iso.slice(2, 4)}` : "") : "");

export function Fuente({ links }: { links: [string, string][] }) {
  return (
    <p className="pl-src">
      Sólo lectura: se edita en el Drive.{" "}
      {links.map(([t, u]) => <a key={u} href={u} target="_blank" rel="noopener">{t} ↗</a>)}
    </p>
  );
}

export function Grupo({ t, children }: { t: string; children: ReactNode }) {
  return <><div className="grp">{t}</div>{children}</>;
}

export const LinkLi = ({ href, t, m, v }: { href: string; t: ReactNode; m?: ReactNode; v?: ReactNode }) => (
  <Link className="li" href={href}><div><div className="t">{t}</div>{m && <div className="m">{m}</div>}</div>{v ?? <span className="arrow">›</span>}</Link>
);

/** «19/08/2026» → «19 ago 2026»; si no es fecha completa queda como está */
export const fechaLinda = (raw: string, iso: string) => (iso ? `${fechaCorta(iso)} ${iso.slice(0, 4)}` : raw);
