"use client";
import { useEffect, useRef, useState } from "react";
import { CANALES, colorCanal, fmt } from "@/lib/fmt";
import type { Dia } from "@/lib/semana";
import { useAnchoSvg } from "./Columns";
import { Modal } from "./Sheet";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const corta = (iso: string) => `${Number(iso.slice(8, 10))} ${MESES[Number(iso.slice(5, 7)) - 1]}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const hace = (f: string, hoy: string) => { const n = Math.round((Date.parse(hoy) - Date.parse(f)) / 864e5); return n === 0 ? "Hoy" : n === 1 ? "Ayer" : `Hace ${n} días`; };

/** Estado del día: sin cargas / N para revisar / falta archivo / todo en orden */
export function estadoDia(d: Dia): { tone: "good" | "warn" | "bad" | "neu"; t: string }[] {
  if (!d.cargado) return [{ tone: "neu", t: "Sin cargas" }];
  const out: { tone: "good" | "warn" | "bad" | "neu"; t: string }[] = [];
  const n = d.alertas.length || (Number(d.alertasTxt) || 0);
  if (n) out.push({ tone: "bad", t: `${n} para revisar` });
  if (d.falta) out.push({ tone: "warn", t: "Falta archivo" });
  if (!out.length) out.push({ tone: "good", t: "Todo en orden" });
  return out;
}
const punto = (d: Dia) => (!d.cargado ? "neu" : d.alertas.length ? "bad" : d.falta ? "warn" : "good");

/** Tira de 7 días + una tarjeta por día que se desliza de a una. Abre en hoy. */
export function DiasSemana({ dias, hoy }: { dias: Dia[]; hoy: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(dias.length - 1);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth; // abre en hoy
    const onScroll = () => setI(Math.max(0, Math.min(dias.length - 1, Math.round(el.scrollLeft / el.clientWidth))));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [dias.length]);

  // El alto de la tira sigue a la tarjeta que se ve, así un día corto no deja espacio vacío
  useEffect(() => {
    const el = track.current, c = el?.children[i] as HTMLElement | undefined;
    if (!el || !c) return;
    const fit = () => { const cs = getComputedStyle(el); el.style.height = `${c.offsetHeight + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)}px`; };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(c);
    return () => ro.disconnect();
  }, [i]);

  const ir = (k: number) => {
    const el = track.current;
    if (el) el.scrollTo({ left: k * el.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  return (
    <div className="sem">
      <div className="strip" role="tablist" aria-label="Días de la semana">
        {dias.map((d, k) => (
          <button key={d.f} role="tab" aria-selected={k === i} className={`sd${k === i ? " on" : ""}`} onClick={() => ir(k)}
            aria-label={`${cap(d.dia)} ${corta(d.f)}: ${estadoDia(d).map((e) => e.t).join(", ")}`}>
            <span className="sd-d">{d.f === hoy ? "Hoy" : cap(d.dia).slice(0, 3)}</span>
            <span className="sd-n">{Number(d.f.slice(8, 10))}</span>
            <span className={`sd-p p-${punto(d)}`} />
          </button>
        ))}
      </div>
      <div className="cards" ref={track}>
        {dias.map((d) => <TarjetaDia key={d.f} d={d} hoy={hoy} />)}
      </div>
      <div className="sem-nav">
        <button type="button" onClick={() => ir(i - 1)} disabled={i === 0} aria-label="Día anterior">‹</button>
        <span>Deslizá para ver otro día</span>
        <button type="button" onClick={() => ir(i + 1)} disabled={i === dias.length - 1} aria-label="Día siguiente">›</button>
      </div>
    </div>
  );
}

function TarjetaDia({ d, hoy }: { d: Dia; hoy: string }) {
  const [ver, setVer] = useState<"ventas" | "gastos" | null>(null);
  return (
    <article className="dc" aria-label={`${cap(d.dia)} ${corta(d.f)}`}>
      <header className="dc-h">
        <div>
          <div className="dc-e">{hace(d.f, hoy)}</div>
          <div className="dc-t">{cap(d.dia)} {corta(d.f)}</div>
        </div>
        <div className="dc-b">{estadoDia(d).map((e) => <span key={e.t} className={`pill ${e.tone}`}>{e.t}</span>)}</div>
      </header>

      <div className="dc-k">
        <button type="button" className="dk q1" onClick={() => setVer("ventas")} aria-label={`Ver las ventas del ${cap(d.dia)}`}>
          <div className="n">{d.cargado ? fmt.M(d.ventas) : "—"}</div><div className="l">Ventas</div>
          <div className="s">{fmt.n(d.prendas)} {d.prendas === 1 ? "prenda" : "prendas"}<span className="dk-go" aria-hidden>›</span></div>
        </button>
        <button type="button" className="dk q2" onClick={() => setVer("gastos")} aria-label={`Ver los gastos del ${cap(d.dia)}`}>
          <div className="n">{d.cargado ? fmt.M(d.gastos) : "—"}</div><div className="l">Gastos variables</div>
          <div className="s">{fmt.n(d.gastosN)} {d.gastosN === 1 ? "gasto" : "gastos"}{d.fijos ? ` · ${fmt.M(d.fijos)} fijos` : ""}<span className="dk-go" aria-hidden>›</span></div>
        </button>
      </div>

      {d.alertas.length > 0 && (
        <div className="dc-s">
          <div className="dc-l">Para revisar</div>
          <ul className="rev">
            {d.alertas.map((a, k) => (
              <li key={k}>
                <div className="rv-t">{a.alerta || a.detalle}{a.importe ? <b>{fmt.ars(a.importe)}</b> : null}</div>
                {a.alerta && a.detalle && <div className="rv-m">{[a.origen, a.fila].filter(Boolean).join(" · ")}{a.origen || a.fila ? " — " : ""}{a.detalle}</div>}
                {a.queHacer && <div className="rv-q"><span>Qué hacer</span>{a.queHacer}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!d.cargado && <p className="empty">No hubo ventas ni gastos cargados este día.</p>}

      <Modal open={ver === "ventas"} onClose={() => setVer(null)} title={`Ventas del ${cap(d.dia)} ${corta(d.f)}`}
        sub={`${d.ventasL.length} ${d.ventasL.length === 1 ? "venta" : "ventas"} · ${fmt.n(d.prendas)} ${d.prendas === 1 ? "prenda" : "prendas"} · ${fmt.ars(d.ventas)}`}>
        {d.ventasL.length ? (
          <div className="list">
            {d.ventasL.map((v, k) => (
              <div className="li" key={k}>
                <div>
                  <div className="t">{v.modelo || "Sin modelo"}{v.prendas > 1 ? ` ×${v.prendas}` : ""}</div>
                  <div className="m"><span className="cdot" style={{ background: colorCanal(v.canal) }} />{[v.canal, v.medio, v.clienta].filter(Boolean).join(" · ")}</div>
                </div>
                <div className="v">{fmt.ars(v.monto)}</div>
              </div>
            ))}
          </div>
        ) : <p className="empty">No hubo ventas este día.</p>}
      </Modal>
      <Modal open={ver === "gastos"} onClose={() => setVer(null)} title={`Gastos del ${cap(d.dia)} ${corta(d.f)}`}
        sub={`${d.gastosL.length} ${d.gastosL.length === 1 ? "gasto" : "gastos"} · ${fmt.ars(d.gastos)} variables${d.fijos ? ` · ${fmt.ars(d.fijos)} fijos (se miran en el mes)` : ""}`}>
        {d.gastosL.length ? (
          <div className="list">
            {d.gastosL.map((g, k) => (
              <div className="li" key={k}>
                <div>
                  <div className="t">{g.prov || g.cat || "Sin detalle"}</div>
                  <div className="m">{[g.prov ? g.cat : "", g.medio].filter(Boolean).join(" · ")}{g.fijo && <span className="pill">Fijo</span>}{/pendiente|programado/i.test(g.est) && <span className="pill warn">{g.est}</span>}</div>
                </div>
                <div className="v">{fmt.ars(g.imp)}</div>
              </div>
            ))}
          </div>
        ) : <p className="empty">No hubo gastos este día.</p>}
      </Modal>

      <div className="dc-f">
        {d.archivo ? <a href={d.archivo} target="_blank" rel="noopener">Abrir archivo del día ↗</a> : <span className="muted">{d.falta ? "Falta el archivo del día" : "Sin archivo del día"}</span>}
      </div>
    </article>
  );
}

/** Ventas y gastos por día: columnas agrupadas, con tooltip al tocar o pasar el mouse. */
export function SemanaChart({ dias, hoy }: { dias: Dia[]; hoy: string }) {
  const [h, setH] = useState<number | null>(null);
  const [ref, W] = useAnchoSvg(340);
  const H = 190, mt = 22, mb = 24, n = dias.length;
  const max = Math.max(1, ...dias.flatMap((d) => [d.ventas, d.gastos])) * 1.1;
  const y = (v: number) => mt + (H - mt - mb) * (1 - v / max);
  const band = W / n, bw = Math.min(W > 400 ? 24 : 16, (band - 14) / 2), gap = 2;
  const top = dias.reduce((b, d, k) => (d.ventas > dias[b].ventas ? k : b), 0);
  const col = (x: number, v: number, c: string) => {
    if (v <= 0) return null;
    const y0 = y(0), y1 = y(v), r = Math.min(4, y0 - y1);
    return <path d={`M${x},${y0} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + bw - r} Q${x + bw},${y1} ${x + bw},${y1 + r} V${y0} Z`} fill={c} />;
  };
  const short = (v: number) => (v >= 1e6 ? (v / 1e6).toFixed(1).replace(".", ",") + " M" : Math.round(v / 1e3) + " mil");
  const sel = h === null ? null : dias[h];
  return (
    <div ref={ref} className="chart sc" onPointerLeave={() => setH(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Ventas y gastos variables por día, últimos 7 días">
        <line x1={0} x2={W} y1={y(0)} y2={y(0)} className="base" />
        {dias.map((d, k) => {
          const cx = k * band + band / 2, x0 = cx - bw - gap / 2;
          return (
            <g key={d.f} opacity={h === null || h === k ? 1 : 0.45}>
              {col(x0, d.ventas, "var(--s1)")}
              {col(cx + gap / 2, d.gastos, "var(--s2)")}
              {k === top && d.ventas > 0 && <text x={x0 + bw / 2} y={y(d.ventas) - 6} textAnchor="middle" className="vl">{short(d.ventas)}</text>}
              <text x={cx} y={H - 7} textAnchor="middle" className={d.f === hoy ? "hoy" : ""}>{d.f === hoy ? "Hoy" : cap(d.dia).slice(0, 3)}</text>
              <rect x={k * band} y={0} width={band} height={H} fill="transparent" tabIndex={0} aria-label={`${cap(d.dia)}: ventas ${fmt.ars(d.ventas)}, gastos ${fmt.ars(d.gastos)}`}
                onPointerEnter={() => setH(k)} onPointerDown={() => setH(k)} onFocus={() => setH(k)} onBlur={() => setH(null)} />
            </g>
          );
        })}
      </svg>
      {sel && h !== null && (
        <div className="tip" style={{ left: `${Math.min(78, Math.max(22, ((h + 0.5) / n) * 100))}%` }}>
          <div className="tip-t">{cap(sel.dia)} {corta(sel.f)}</div>
          <div className="tip-r"><i style={{ background: "var(--s1)" }} /><span>Ventas</span><b>{fmt.ars(sel.ventas)}</b></div>
          {CANALES.filter((c) => sel.canales?.[c]).map((c) => (
            <div key={c} className="tip-r tip-sub"><i style={{ background: colorCanal(c) }} /><span>{c}</span><b>{fmt.ars(sel.canales[c])}</b></div>
          ))}
          <div className="tip-r"><i style={{ background: "var(--s2)" }} /><span>Gastos variables</span><b>{fmt.ars(sel.gastos)}</b></div>
        </div>
      )}
    </div>
  );
}
