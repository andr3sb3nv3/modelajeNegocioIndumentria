"use client";
import { useEffect, useRef, useState } from "react";
import { fmt } from "@/lib/fmt";

export type Serie = { name: string; color: string; values: number[]; outline?: boolean };

/** Columnas SVG apiladas o agrupadas. Al tocar (o pasar el mouse por) una columna se ve el detalle de cada serie. */
export function ColumnsChart({ labels, series, mode = "stack", unidad = "M", h = 210, highlight }: {
  labels: string[]; series: Serie[]; mode?: "stack" | "group"; unidad?: "M" | "n"; h?: number; highlight?: number;
}) {
  const [sel, setSel] = useState<number | null>(null);
  const [ref, W] = useAnchoSvg(340);
  const mt = 18, mb = 22, n = labels.length;
  const tots = labels.map((_, i) => (mode === "group" ? Math.max(0, ...series.map((s) => s.values[i] || 0)) : series.reduce((a, s) => a + Math.max(0, s.values[i] || 0), 0)));
  const max = Math.max(1, ...tots) * 1.08;
  const y = (v: number) => mt + (h - mt - mb) * (1 - v / max);
  // Con mucho ancho (compu) las columnas no pasan de 44 y quedan centradas
  const bw = W / n, inner = Math.min(44, bw - Math.min(5, bw * 0.16) * 2), pad = (bw - inner) / 2;
  const short = (v: number) => (unidad === "n" ? fmt.n(v) : v >= 1e6 ? (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(".", ",") : v >= 1e3 ? Math.round(v / 1e3) + "k" : String(Math.round(v)));
  const largo = unidad === "n" ? fmt.n : fmt.ars;
  const foco = sel ?? highlight;
  const filas = sel === null ? [] : series.map((s) => ({ s, v: s.values[sel] || 0 })).filter((x) => x.v);
  const total = sel === null ? 0 : series.reduce((a, s) => a + (s.values[sel] || 0), 0);
  return (
    <div ref={ref} className="chart cc" onPointerLeave={(e) => e.pointerType === "mouse" && setSel(null)}>
      <svg viewBox={`0 0 ${W} ${h}`} role="img" aria-label={series.map((s) => s.name).join(", ")}>
        <line x1={0} x2={W} y1={y(0)} y2={y(0)} className="base" />
        {labels.map((lab, i) => {
          const x0 = i * bw;
          let acc = 0;
          return (
            <g key={i} opacity={foco === undefined || foco === i ? 1 : 0.4} style={{ transition: "opacity .15s" }}>
              {mode === "group"
                ? series.map((s, j) => {
                    const v = Math.max(0, s.values[i] || 0), gw = inner / series.length;
                    if (!v) return null;
                    return <rect key={j} x={x0 + pad + j * gw + 0.5} y={y(v)} width={Math.max(1, gw - 1)} height={y(0) - y(v)} rx={2}
                      fill={s.outline ? "none" : s.color} stroke={s.outline ? s.color : "none"} strokeDasharray={s.outline ? "3 2" : undefined} />;
                  })
                : series.map((s, j) => {
                    const v = Math.max(0, s.values[i] || 0);
                    if (!v) return null;
                    const top = y(acc + v), bot = y(acc) - (acc ? 1 : 0);
                    acc += v;
                    return <rect key={j} x={x0 + pad} y={top} width={inner} height={Math.max(0, bot - top)} rx={j === series.length - 1 ? 2 : 0} fill={s.color} />;
                  })}
              {tots[i] > 0 && <text x={x0 + bw / 2} y={y(tots[i]) - 4} textAnchor="middle" className="vl">{short(tots[i])}</text>}
              <text x={x0 + bw / 2} y={h - 6} textAnchor="middle" className={sel === i ? "hoy" : ""}>{lab}</text>
              <rect x={x0} y={0} width={bw} height={h} fill="transparent" tabIndex={0} style={{ cursor: "pointer", outline: "none" }}
                aria-label={`${lab}: ${series.map((s) => `${s.name} ${largo(s.values[i] || 0)}`).join(", ")}`}
                onPointerEnter={(e) => e.pointerType === "mouse" && setSel(i)} onClick={() => setSel(sel === i ? null : i)} onFocus={(e) => e.currentTarget.matches(":focus-visible") && setSel(i)} />
            </g>
          );
        })}
      </svg>
      {sel !== null && (
        <div className="tip" style={{ left: `${Math.min(74, Math.max(26, ((sel + 0.5) / n) * 100))}%` }}>
          <div className="tip-t">{labels[sel]}</div>
          {filas.length ? filas.map(({ s, v }) => (
            <div key={s.name} className="tip-r"><i style={{ background: s.color }} /><span>{s.name}</span><b>{largo(v)}</b></div>
          )) : <div className="tip-r"><span>Sin datos</span></div>}
          {mode === "stack" && filas.length > 1 && <div className="tip-r tip-tot"><span>Total</span><b>{largo(total)}</b></div>}
        </div>
      )}
    </div>
  );
}

/** Ancho del dibujo según el lugar que tiene: en el celular queda en `base`; en la compu crece
 *  para que letras y barras no se agranden de más al estirar el gráfico. */
export function useAnchoSvg(base: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(base);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => setW(Math.max(base, Math.round(el.clientWidth / 1.3)));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [base]);
  return [ref, w] as const;
}
