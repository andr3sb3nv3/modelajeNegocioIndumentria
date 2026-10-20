"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type DiaIA = { dia: string; dow: string; num: number; mes: string; temas: string[]; on: boolean; hoy: boolean };

/**
 * Calendario de la interacción con Claude y Codex: una tira de días que se puede mover para cualquier lado
 * (flechas de a dos semanas, «Hoy» y un selector de fecha). Al pasar el mouse por un día con charlas se ven sus
 * temas; el globo va en posición fija para que el scroll horizontal no lo corte.
 */
export function IADias({ dias, dia, hoy, antes, despues }: { dias: DiaIA[]; dia: string; hoy: string; antes: string; despues: string }) {
  const router = useRouter();
  const fila = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; d: DiaIA } | null>(null);

  useEffect(() => {
    fila.current?.querySelector<HTMLElement>(".ia-dd.on")?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [dia]);

  const ver = (e: React.SyntheticEvent<HTMLElement>, d: DiaIA) => {
    if (!d.temas.length) return setTip(null);
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ x: Math.min(Math.max(r.left + r.width / 2, 130), window.innerWidth - 130), y: r.bottom + 8, d });
  };

  return (
    <div className="ia-dias">
      <div className="ia-cal-nav">
        <Link href={`/ia?d=${antes}`} scroll={false} aria-label="Dos semanas antes">‹</Link>
        <div className="ia-dias-row" ref={fila} onScroll={() => setTip(null)}>
          {dias.map((d) => (
            <Link key={d.dia} href={`/ia?d=${d.dia}`} scroll={false}
              className={`ia-dd${d.on ? " on" : ""}${d.temas.length ? "" : " vacio"}${d.hoy ? " es-hoy" : ""}`}
              onMouseEnter={(e) => ver(e, d)} onFocus={(e) => ver(e, d)} onMouseLeave={() => setTip(null)} onBlur={() => setTip(null)}
              aria-label={`${d.dow} ${d.num} ${d.mes}${d.temas.length ? `: ${d.temas.join(", ")}` : ""}`}>
              <span className="w">{d.hoy ? "hoy" : d.dow}</span>
              <b>{d.num}</b>
              <span className="m">{d.mes}</span>
              <span className="pts" aria-hidden>{d.temas.slice(0, 5).map((_, i) => <i key={i} />)}</span>
            </Link>
          ))}
        </div>
        <Link href={`/ia?d=${despues}`} scroll={false} aria-label="Dos semanas después">›</Link>
      </div>
      <div className="ia-cal-ir">
        {dia !== hoy && <Link href="/ia" scroll={false}>Hoy</Link>}
        <input type="date" value={dia} aria-label="Ir a una fecha" onChange={(e) => e.target.value && router.push(`/ia?d=${e.target.value}`, { scroll: false })} />
      </div>
      {tip && (
        <div className="ia-tip" style={{ left: tip.x, top: tip.y }} role="tooltip">
          <span>{tip.d.dow} {tip.d.num} {tip.d.mes} · {tip.d.temas.length} {tip.d.temas.length === 1 ? "tema" : "temas"}</span>
          {tip.d.temas.map((t, i) => <p key={i}>{t}</p>)}
        </div>
      )}
    </div>
  );
}
