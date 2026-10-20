"use client";
import { useRef, useState } from "react";
import { fmt } from "@/lib/fmt";
import type { DiaResultado } from "@/lib/resultado";

const k = (v: number) => (Math.abs(v) >= 1e6 ? fmt.M(v) : fmt.ars(v));
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const dia = (f: string) => `${Number(f.slice(8, 10))} ${MES[Number(f.slice(5, 7)) - 1]}`;

/**
 * Inicio › Mes: utilidad acumulada contra la línea de costos fijos, con la misma cuenta del P&L.
 * Utilidad = ventas − gastos variables (los cargados en 01 · Gastos maestro), sumado día a día.
 * Cuando la utilidad pasa los fijos del mes, lo que sigue es ganancia. Tocá o pasá por un día para ver la cuenta a esa fecha.
 * `total` = días del mes (el gráfico deja lugar para los que faltan y los proyecta al ritmo actual).
 */
export function Utilidad({ dias, fijos, fijosCargados, total, actual, fijosTxt }: {
  dias: DiaResultado[]; fijos: number; fijosCargados: number; total: number; actual: boolean; fijosTxt: string;
}) {
  const acV: number[] = [], acVar: number[] = [], acumulado: number[] = [];
  let v = 0, va = 0, cruceI = -1;
  dias.forEach((d, i) => {
    v += d.ventas; va += d.variables;
    acV.push(v); acVar.push(va); acumulado.push(v - va);
    if (cruceI < 0 && fijos > 0 && v - va >= fijos) cruceI = i;
  });
  const ult = acumulado.length - 1;
  const [sel, setSel] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const i = sel ?? ult;

  const W = 320, H = 180, P = { l: 6, r: 6, t: 26, b: 22 };
  const ya = acumulado[ult] ?? 0;
  const proyeccion = actual && acumulado.length && acumulado.length < total ? (ya / acumulado.length) * total : ya;
  const top = Math.max(fijos * 1.25, proyeccion, ...acumulado, 1);
  const bot = Math.min(0, ...acumulado);
  const x = (j: number) => P.l + (j / Math.max(1, total - 1)) * (W - P.l - P.r);
  const y = (val: number) => P.t + (1 - (val - bot) / (top - bot)) * (H - P.t - P.b);
  const pts = acumulado.map((val, j) => `${x(j).toFixed(1)},${y(val).toFixed(1)}`);

  const elegir = (clientX: number) => {
    const el = svgRef.current;
    if (!el || ult < 0) return;
    const r = el.getBoundingClientRect();
    const vx = ((clientX - r.left) / r.width) * W;
    setSel(Math.max(0, Math.min(ult, Math.round(((vx - P.l) / (W - P.l - P.r)) * (total - 1)))));
  };

  const u = acumulado[i] ?? 0, falta = fijos - u, esHoy = i === ult && actual;
  const cuando = esHoy ? "Hoy" : `Al ${dia(dias[i]?.f || "")}`;
  const msg = !fijos ? <>No hay gastos fijos cargados para comparar.</>
    : cruceI >= 0 && cruceI <= i ? <>{cuando} {esHoy ? "llevás" : "llevabas"} <b>{k(u - fijos)}</b> de ganancia: desde el <b>{dia(dias[cruceI].f)}</b> la utilidad cubre los {k(fijos)} de fijos.</>
    : <>{cuando} {esHoy ? "te faltan" : "faltaban"} <b>{k(falta)}</b> para cubrir los {k(fijos)} de fijos{actual && i === ult && proyeccion >= fijos ? ". Al ritmo que vas, los pasás antes de fin de mes" : ""}.</>;

  return (
    <div className="panel ut">
      <div className={`eq-msg ${cruceI >= 0 && cruceI <= i ? "ok" : "va"}`}>{msg}</div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="eq-svg ut-svg" role="img" aria-label="Utilidad acumulada del mes contra los costos fijos. Tocá un día para ver la cuenta."
        onPointerMove={(e) => elegir(e.clientX)} onPointerDown={(e) => elegir(e.clientX)} onPointerLeave={(e) => { if (e.pointerType === "mouse") setSel(null); }}>
        <defs>
          <linearGradient id="utA" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2fb38f" stopOpacity=".35" /><stop offset="1" stopColor="#2fb38f" stopOpacity="0" /></linearGradient>
        </defs>
        {fijos > 0 && <>
          <rect x={P.l} y={y(top)} width={W - P.l - P.r} height={Math.max(0, y(fijos) - y(top))} className="eq-zona" />
          <line x1={P.l} x2={W - P.r} y1={y(fijos)} y2={y(fijos)} className="eq-fijo" />
          <text x={W - P.r - 2} y={y(fijos) - 5} textAnchor="end" className="eq-lbl">Fijos {k(fijos)}</text>
        </>}
        {bot < 0 && <line x1={P.l} x2={W - P.r} y1={y(0)} y2={y(0)} className="eq-cero" />}
        {pts.length > 0 && <>
          <path d={`M${x(0)},${y(0)} L${pts.join(" L")} L${x(ult)},${y(0)} Z`} fill="url(#utA)" />
          <polyline points={pts.join(" ")} className="eq-line" />
          {actual && ult < total - 1 && <line x1={x(ult)} y1={y(ya)} x2={x(total - 1)} y2={y(proyeccion)} className="eq-proy" />}
        </>}
        {cruceI >= 0 && <circle cx={x(cruceI)} cy={y(acumulado[cruceI])} r="5.5" className="eq-cruce" />}
        {ult >= 0 && <g className="ut-sel">
          <line x1={x(i)} x2={x(i)} y1={P.t - 8} y2={H - P.b} className="ut-guia" />
          <circle cx={x(i)} cy={y(u)} r="5" className="eq-hoy" />
          <g transform={`translate(${Math.min(Math.max(x(i), esHoy ? 44 : 30), W - (esHoy ? 44 : 30))},${P.t - 14})`}>
            <rect x={esHoy ? -42 : -28} y="-10" width={esHoy ? 84 : 56} height="18" rx="9" className={esHoy ? "ut-chip hoy" : "ut-chip"} />
            <text y="3" textAnchor="middle" className="ut-chipt">{esHoy ? "Hoy estás acá" : dia(dias[i].f)}</text>
          </g>
        </g>}
        {[1, 8, 15, 22, total].map((n, j, a) => <text key={n} x={x(n - 1)} y={H - 6} className="eq-ax" textAnchor={j === 0 ? "start" : j === a.length - 1 ? "end" : "middle"}>{n}</text>)}
      </svg>
      <p className="ut-tip">Tocá o pasá por la línea para ver cómo venía cada día.</p>
      <ul className="ut-ley" aria-hidden>
        <li><i className="l-ut" />Utilidad (ventas − variables)</li>
        <li><i className="l-fi" />Costos fijos</li>
        <li><i className="l-zo" />Zona de ganancia</li>
      </ul>
      <div className="ut-cta">
        <div><span>Vendiste {esHoy || !actual && i === ult ? "en el mes" : `hasta el ${dia(dias[i]?.f || "")}`}</span><b>{k(acV[i] ?? 0)}</b></div>
        <div className="menos"><span>Gastos variables</span><b>− {k(acVar[i] ?? 0)}</b><small>telas, talleres, envíos, publicidad… (01 · Gastos maestro)</small></div>
        <div className="igual"><span>Utilidad</span><b>{k(u)}</b><small>lo que dejaron las ventas después de los variables</small></div>
        <div className="menos"><span>Costos fijos del mes{fijos !== fijosCargados ? " (referencia)" : ""}</span><b>− {k(fijos)}</b>
          <small>{fijos !== fijosCargados ? "los de este mes todavía no están cargados: son los del último mes del P&L" : "sueldos, dirección, alquiler… cargados en 01 · Gastos maestro"}</small></div>
        <div className={`fin ${u >= fijos ? "ok" : "no"}`}><span>{u >= fijos ? "Ganancia" : actual ? "Falta cubrir" : "Pérdida"}</span><b>{k(Math.abs(u - fijos))}</b></div>
      </div>
      <details className="ut-cuenta">
        <summary>Cómo se calcula</summary>
        <p>Es la misma cuenta que el <b>P&amp;L</b>: ventas de 02 · Ventas maestro menos los gastos de 01 · Gastos maestro por la fecha en que se cargaron. Si un mes está cerrado, la ganancia de acá es igual al resultado del P&amp;L.</p>
        <p><b>Utilidad</b> (línea verde): lo vendido menos los gastos <b>variables</b> (todo lo que no es fijo), sumado día a día. Por eso baja los días que se paga tela o taller.</p>
        <p><b>Costos fijos</b> (línea punteada): {fijosTxt}. Fijo o variable sale de la columna «Tipo» de 01 · Gastos maestro; si está vacía, sueldos, alquileres y servicios son fijos.</p>
        <p><b>Zona de ganancia</b> (verde clarito): cuando la utilidad entra ahí, lo fijo ya está pago y lo que sigue es ganancia.{actual && ult < total - 1 ? " La línea de puntitos sigue el ritmo que venís llevando hasta fin de mes." : ""}</p>
      </details>
    </div>
  );
}
