import type { Equilibrio as Eq } from "@/lib/equilibrio";
import { SHEETS, sheetUrl } from "@/lib/config";
import { fechaCorta, fmt, mesLabel } from "@/lib/fmt";

const C = { tela: "#c98aa6", conf: "#8f7bd6", otros: "#6fa7d8", fijo: "#b8a7b1", gana: "#2fb38f", pierde: "#e0457b" };
const n1 = (v: number) => v.toLocaleString("es-AR", { maximumFractionDigits: 0 });
const k = (v: number) => (Math.abs(v) >= 1e6 ? fmt.M(v) : fmt.ars(v));

/** Pulso › «¿Cuándo empezás a ganar plata?»: costo de cada vestido, el mes contra lo fijo y el punto de equilibrio. */
export function Equilibrio({ e, hoy }: { e: Eq; hoy: string }) {
  if (!e.precio) return <section className="neo-card"><div className="neo-h"><h2>¿Cuándo empezás a ganar plata?</h2></div><p className="empty">No hay ventas en los últimos 90 días para hacer la cuenta.</p></section>;
  const eq = Number.isFinite(e.equilibrio) ? Math.ceil(e.equilibrio) : null;
  const completo = e.variable + e.fijoPorVendido;
  return (
    <>
      <div className="eq-t">
        <span>La cuenta de cada vestido</span>
        <h2>¿Cuándo empezás a ganar plata?</h2>
        <p>Cada vestido primero repone lo que costó hacerlo y venderlo. Lo que sobra paga lo fijo del mes. Cuando lo fijo está cubierto, todo lo demás es ganancia.</p>
      </div>
      <Vestido e={e} completo={completo} />
      <Mes e={e} eq={eq} hoy={hoy} />
      <Punto e={e} eq={eq} />
      <Modelos e={e} />
      <Criterio e={e} />
    </>
  );
}

function Vestido({ e, completo }: { e: Eq; completo: number }) {
  const partes = [
    { n: "Tela", v: e.tela, c: C.tela, s: e.fuente === "produccion" ? `compras de telas ${e.temp} ÷ prendas producidas` : "telas de Gastos, 12 meses" },
    { n: "Confección", v: e.confeccion, c: C.conf, s: e.fuente === "produccion" ? `precio de taller promedio ${e.temp}` : "talleres de Gastos, 12 meses" },
    { n: "Otros variables", v: e.otros, c: C.otros, s: "envíos, packaging, publicidad, avíos…" },
    { n: "Parte de lo fijo", v: e.fijoPorVendido, c: C.fijo, s: `fijos del mes ÷ ${n1(e.vendidosMes)} vestidos vendidos` },
  ];
  const gana = e.precio - completo, escala = Math.max(e.precio, completo);
  return (
    <section className="neo-card">
      <div className="neo-h"><h2>Lo que cuesta un vestido</h2><span>promedio</span></div>
      <div className="eq-big">
        <div><span>Se vende a</span><b>{k(e.precio)}</b></div>
        <div><span>Cuesta</span><b>{k(completo)}</b></div>
        <div className={gana >= 0 ? "ok" : "no"}><span>{gana >= 0 ? "Te queda" : "Perdés"}</span><b>{k(Math.abs(gana))}</b></div>
      </div>
      <div className="eq-stack" role="img" aria-label="Costo de un vestido por partes contra su precio">
        {partes.map((p) => <i key={p.n} style={{ width: `${(p.v / escala) * 100}%`, background: p.c }} />)}
        {gana > 0 && <i className="gana" style={{ width: `${(gana / escala) * 100}%` }} />}
        <em style={{ left: `${(e.precio / escala) * 100}%` }}><span>precio</span></em>
      </div>
      <ul className="eq-leg">
        {partes.map((p) => (
          <li key={p.n}><i style={{ background: p.c }} /><div><b>{p.n}</b><span>{p.s}</span></div><strong>{k(p.v)}</strong></li>
        ))}
        <li className="tot"><i style={{ background: gana >= 0 ? C.gana : C.pierde }} /><div><b>{gana >= 0 ? "Ganancia por vestido" : "Pérdida por vestido"}</b><span>{fmt.p(Math.abs(gana) / e.precio)} del precio</span></div><strong>{k(gana)}</strong></li>
      </ul>
      {e.fijoPorProducido > 0 && (
        <p className="neo-note">Si repartís lo fijo entre lo que producís ({n1(e.producidosMes)} prendas por mes en {e.temp}) en vez de lo que vendés, a cada vestido le tocan {k(e.fijoPorProducido)} de fijos y el costo completo queda en {k(e.variable + e.fijoPorProducido)}.</p>
      )}
    </section>
  );
}

function Mes({ e, eq, hoy }: { e: Eq; eq: number | null; hoy: string }) {
  const { dias, acumulado, cruce, diasMes, proyeccion, vendidos } = e.mes;
  const W = 320, H = 170, P = { l: 6, r: 6, t: 14, b: 22 };
  const top = Math.max(e.fijosMes * 1.25, proyeccion, ...acumulado, 1);
  const bot = Math.min(0, ...acumulado);
  const x = (i: number) => P.l + (i / Math.max(1, diasMes - 1)) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - (v - bot) / (top - bot)) * (H - P.t - P.b);
  const pts = acumulado.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const ult = acumulado.length - 1, ya = acumulado[ult] ?? 0;
  const iC = cruce ? dias.indexOf(cruce) : -1;
  const falta = Math.max(0, e.fijosMes - ya), faltanV = e.margen > 0 ? Math.ceil(falta / e.margen) : null;
  const ritmo = dias.length ? ya / dias.length : 0;
  const diaLlega = !cruce && ritmo > 0 ? Math.ceil(e.fijosMes / ritmo) : null;
  const mesTxt = mesLabel(hoy.slice(0, 7));
  return (
    <section className="neo-card">
      <div className="neo-h"><h2>Este mes</h2><span>lo que dejan las ventas contra lo fijo</span></div>
      <div className={`eq-msg ${cruce ? "ok" : "va"}`}>
        {cruce ? <>Desde el <b>{fechaCorta(cruce)}</b> estás ganando plata: ya cubriste los {k(e.fijosMes)} de fijos y llevás <b>{k(ya - e.fijosMes)}</b> de ganancia.</>
          : <>Te faltan <b>{k(falta)}</b>{faltanV != null && <> (unos <b>{n1(faltanV)} vestidos</b>)</>} para cubrir lo fijo. {diaLlega && diaLlega <= diasMes ? <>Al ritmo de este mes llegás el <b>{diaLlega} {mesTxt}</b>.</> : <>Al ritmo de este mes no llegás a cubrirlo.</>}</>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="eq-svg" role="img" aria-label="Contribución acumulada del mes contra los costos fijos">
        <defs>
          <linearGradient id="eqA" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={C.gana} stopOpacity=".35" /><stop offset="1" stopColor={C.gana} stopOpacity="0" /></linearGradient>
        </defs>
        <rect x={P.l} y={y(top)} width={W - P.l - P.r} height={y(e.fijosMes) - y(top)} className="eq-zona" />
        <line x1={P.l} x2={W - P.r} y1={y(e.fijosMes)} y2={y(e.fijosMes)} className="eq-fijo" />
        <text x={P.l + 2} y={y(e.fijosMes) - 5} className="eq-lbl">Fijos {k(e.fijosMes)}</text>
        {bot < 0 && <line x1={P.l} x2={W - P.r} y1={y(0)} y2={y(0)} className="eq-cero" />}
        {pts.length > 0 && <>
          <path d={`M${x(0)},${y(0)} L${pts.join(" L")} L${x(ult)},${y(0)} Z`} fill="url(#eqA)" />
          <polyline points={pts.join(" ")} className="eq-line" />
          {ult < diasMes - 1 && <line x1={x(ult)} y1={y(ya)} x2={x(diasMes - 1)} y2={y(proyeccion)} className="eq-proy" />}
          <circle cx={x(ult)} cy={y(ya)} r="4.5" className="eq-hoy" />
        </>}
        {iC >= 0 && <g><circle cx={x(iC)} cy={y(acumulado[iC])} r="6" className="eq-cruce" /><text x={Math.min(x(iC) + 8, W - 70)} y={y(acumulado[iC]) + 16} className="eq-lbl b">desde acá ganás</text></g>}
        {[1, 8, 15, 22, diasMes].map((dd) => <text key={dd} x={x(dd - 1)} y={H - 6} className="eq-ax" textAnchor={dd === 1 ? "start" : dd === diasMes ? "end" : "middle"}>{dd}</text>)}
      </svg>
      <div className="eq-prog">
        <div className="eq-bar"><i style={{ width: `${Math.min(100, eq ? (vendidos / eq) * 100 : 0)}%` }} />{eq && vendidos > eq && <i className="extra" style={{ width: `${Math.min(100, ((vendidos - eq) / eq) * 100)}%` }} />}</div>
        <span><b>{n1(vendidos)}</b> vestidos vendidos{eq ? <> de los <b>{n1(eq)}</b> que cubren lo fijo</> : null}</span>
      </div>
      <p className="neo-note">La línea es lo vendido menos los gastos variables cargados en 01 · Gastos maestro, sumado día a día: la misma cuenta del P&L. La punteada sigue el ritmo del mes hasta el {diasMes}.</p>
    </section>
  );
}

function Punto({ e, eq }: { e: Eq; eq: number | null }) {
  const W = 320, H = 190, P = { l: 6, r: 8, t: 12, b: 24 };
  const ref = Math.max(eq || 0, e.vendidosMes, e.mes.vendidos, 1);
  const qmax = Math.max(10, Math.ceil((ref * 1.5) / 10) * 10);
  const top = Math.max(e.precio * qmax, e.fijosMes + e.variable * qmax);
  const x = (q: number) => P.l + (q / qmax) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - v / top) * (H - P.t - P.b);
  const ing = (q: number) => e.precio * q, cos = (q: number) => e.fijosMes + e.variable * q;
  const qe = eq != null ? Math.min(e.equilibrio, qmax) : qmax;
  const prom = e.vendidosMes;
  return (
    <section className="neo-card">
      <div className="neo-h"><h2>Punto de equilibrio</h2><span>por mes</span></div>
      <p className="eq-frase">
        De cada vestido de <b>{k(e.precio)}</b>, <b className="c-var">{k(e.variable)}</b> reponen lo variable y <b className="c-mar">{k(e.margen)}</b> van a pagar lo fijo.{" "}
        {eq != null ? <>Con <b>{n1(eq)} vestidos por mes</b> cubrís los {k(e.fijosMes)} de fijos: del {n1(eq + 1)} en adelante es ganancia.</> : <>Con este precio y estos costos, ningún volumen cubre lo fijo.</>}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="eq-svg" role="img" aria-label="Ingresos contra costos según cantidad de vestidos">
        <path d={`M${x(0)},${y(ing(0))} L${x(qe)},${y(ing(qe))} L${x(qe)},${y(cos(qe))} L${x(0)},${y(cos(0))} Z`} className="eq-pierde" />
        {eq != null && eq < qmax && <path d={`M${x(qe)},${y(ing(qe))} L${x(qmax)},${y(ing(qmax))} L${x(qmax)},${y(cos(qmax))} Z`} className="eq-gana" />}
        <line x1={x(0)} y1={y(e.variable * 0)} x2={x(qmax)} y2={y(e.variable * qmax)} className="eq-var" />
        <line x1={x(0)} y1={y(cos(0))} x2={x(qmax)} y2={y(cos(qmax))} className="eq-cos" />
        <line x1={x(0)} y1={y(0)} x2={x(qmax)} y2={y(ing(qmax))} className="eq-ing" />
        {eq != null && eq <= qmax && <g>
          <line x1={x(qe)} x2={x(qe)} y1={y(ing(qe))} y2={H - P.b} className="eq-guia" />
          <circle cx={x(qe)} cy={y(ing(qe))} r="5.5" className="eq-cruce" />
          <text x={x(qe)} y={H - 8} textAnchor="middle" className="eq-lbl b">{n1(eq)}</text>
        </g>}
        {prom > 0 && prom <= qmax && <g>
          <line x1={x(prom)} x2={x(prom)} y1={P.t} y2={H - P.b} className="eq-prom" />
          <text x={Math.min(x(prom) + 4, W - 74)} y={P.t + 10} className="eq-lbl">vendés {n1(prom)}/mes</text>
        </g>}
        <text x={P.l} y={H - 8} className="eq-ax">0</text>
        <text x={W - P.r} y={H - 8} className="eq-ax" textAnchor="end">{qmax} vestidos</text>
      </svg>
      <ul className="eq-key">
        <li><i className="ing" />Lo que entra</li>
        <li><i className="cos" />Costo total (fijo + variable)</li>
        <li><i className="var" />Sólo variable</li>
      </ul>
      <p className="neo-note">El promedio de {e.mesesFijos.map(mesLabel).join(", ")} fue {n1(e.vendidosMes)} vestidos por mes{eq ? (e.vendidosMes >= eq ? `: ${n1(e.vendidosMes - eq)} por encima del equilibrio.` : `: ${n1(eq - e.vendidosMes)} por debajo del equilibrio.`) : "."}</p>
    </section>
  );
}

function Modelos({ e }: { e: Eq }) {
  if (!e.modelos.length) return null;
  const max = Math.max(...e.modelos.map((m) => Math.max(m.precio, m.costo + e.fijoPorVendido)));
  return (
    <section className="neo-card">
      <div className="neo-h"><h2>Modelo por modelo</h2><span>últimos 90 días</span></div>
      <div className="eq-mods">
        {e.modelos.map((m) => {
          const full = m.costo + e.fijoPorVendido, gana = m.precio - full;
          return (
            <div key={m.modelo} className="eq-mod">
              <div className="eq-mod-h"><b>{m.modelo}</b><span>{n1(m.vendidos)} vendidos · precio {k(m.precio)}</span></div>
              <div className="eq-mod-b">
                <i className="v" style={{ width: `${(m.costo / max) * 100}%` }} />
                <i className="f" style={{ width: `${(e.fijoPorVendido / max) * 100}%` }} />
                <em style={{ left: `${(m.precio / max) * 100}%` }} />
              </div>
              <div className="eq-mod-n">
                <span>deja {k(m.margen)} sobre lo variable</span>
                <b className={gana >= 0 ? "ok" : "no"}>{gana >= 0 ? "+" : "−"}{k(Math.abs(gana))} con todo</b>
              </div>
            </div>
          );
        })}
      </div>
      <ul className="eq-key">
        <li><i className="v" />Costo variable</li>
        <li><i className="f" />Parte de lo fijo</li>
        <li><i className="p" />Precio promedio</li>
      </ul>
    </section>
  );
}

function Criterio({ e }: { e: Eq }) {
  return (
    <section className="neo-card eq-crit">
      <div className="neo-h"><h2>Cómo hago la cuenta</h2></div>
      <ul>
        <li><b>Fijo o variable</b> lo decide la columna «Tipo» de <a href={sheetUrl(SHEETS.gastos)} target="_blank" rel="noreferrer">01 · Gastos maestro</a>. Si está vacía, sueldos, alquileres y servicios cuentan como fijos y el resto como variable. Cambiando esa columna cambia esta cuenta.</li>
        <li><b>Tela y confección</b> {e.fuente === "produccion" ? <>salen de <a href={sheetUrl(SHEETS.stock)} target="_blank" rel="noreferrer">Producción y stock</a> ({e.temp}): el precio de taller de cada prenda y las compras de telas repartidas entre lo producido. Por eso talleres y telas de Gastos no se suman dos veces.</> : <>salen de Gastos (talleres y telas de los últimos 12 meses) repartidos entre lo vendido, porque no pude leer precios en Producción y stock.</>}</li>
        <li><b>Precio y otros variables</b>: promedio de los últimos 90 días. <b>Fijos</b>: promedio de {e.mesesFijos.map(mesLabel).join(", ")} ({k(e.fijosMes)} por mes).</li>
      </ul>
      <div className="eq-cats">
        <div><span>Fijos por mes</span>{e.fijosCats.slice(0, 5).map(([c, v]) => <p key={c}>{c}<b>{k(v)}</b></p>)}</div>
        <div><span>Otros variables, 90 días</span>{e.otrosCats.slice(0, 5).map(([c, v]) => <p key={c}>{c}<b>{k(v)}</b></p>)}</div>
      </div>
      {e.avisos.map((a) => <p key={a} className="warn">{a}</p>)}
    </section>
  );
}
