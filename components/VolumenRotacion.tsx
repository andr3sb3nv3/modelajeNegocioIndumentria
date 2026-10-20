import type { CostoVestido } from "@/lib/costos";
import { claveModelo } from "@/lib/costos";
import { fechaCorta, fmt } from "@/lib/fmt";
import { Kpi, Kpis, Section, Seg } from "./ui";

const DIAS = 90;
/** Lo que se gasta al hacer el vestido (lo demás —packaging, envío, comisión— se gasta recién al venderlo). */
const HECHURA = new Set(["tela", "conf", "avios", "estampa", "merma", "otros"]);
const hechura = (m: CostoVestido) => m.partes.filter((p) => HECHURA.has(p.k)).reduce((a, p) => a + p.v, 0);

type Fila = { m: CostoVestido; vend: number; deja: number; aporte: number; stock: number; menos: number; dias: number; parada: number; talles: [string, number, number][] };
const GRUPOS = [
  { k: "ss", t: "Sostienen el negocio", d: "Se venden mucho y dejan mucho. Que nunca falten.", c: "var(--good)" },
  { k: "sn", t: "Se venden mucho, dejan poco", d: "Mueven la caja pero dejan poco por vestido: mirar precio o costo.", c: "var(--s2)" },
  { k: "ns", t: "Dejan mucho, se venden poco", d: "Buen margen pero poca salida: mostrarlos más.", c: "var(--warn)" },
  { k: "nn", t: "Ni mucho ni poco", d: "Poca venta y poco margen: revisar si vale reponerlos.", c: "var(--muted)" },
] as const;
const mediana = (a: number[]) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; };
const ritmo = (d: number) => (!isFinite(d) ? "bad" : d > 180 ? "bad" : d > 90 ? "warn" : "good");
const dec = (v: number) => v.toFixed(v < 10 ? 1 : 0).replace(".", ",");
const porMes = (vend: number) => { const v = (vend / DIAS) * 30; return !v ? "sin ventas" : v < 1 ? "menos de 1 por mes" : `${dec(v)} por mes`; };
const dias = (d: number) => (!isFinite(d) ? "no se vendió" : d >= 730 ? "más de 2 años" : d > 60 ? `${Math.round(d / 30)} meses` : `${Math.round(d)} días`);

/** Volumen × margen (qué modelos sostienen el negocio) y rotación (cuánto tarda en venderse el stock y cuánta plata hay parada). */
export function VolumenRotacion({ modelos, conFijos, vendidos, talles, vendT, sinTalle, temp = "", hrefTemp }: {
  modelos: CostoVestido[]; conFijos: boolean; vendidos: Map<string, number>;
  /** vendidas desde el último conteo que figuran en la hoja Ventas pero no en la app (sin talle) */ sinTalle: { porModelo: Map<string, number>; total: number; desde: string };
  /** temporada elegida para la rotación («» = todas) */ temp?: string; hrefTemp: (t: string) => string;
  /** stock por modelo → talle → prendas */ talles: Map<string, Map<string, number>>;
  /** ventas cargadas en la app por modelo → talle (90 días) */ vendT: Map<string, Map<string, number>>;
}) {
  const filas: Fila[] = modelos.filter((m) => m.precio > 0).map((m) => {
    const k = claveModelo(m.modelo), vend = vendidos.get(k) || 0, deja = conFijos ? m.dejaTot : m.dejaVar;
    const tm = talles.get(k) || new Map<string, number>(), vt = vendT.get(k) || new Map<string, number>();
    const conteo = [...tm.values()].reduce((a, b) => a + b, 0), menos = Math.min(conteo, sinTalle.porModelo.get(k) || 0), stock = conteo - menos;
    const ts = [...new Set([...tm.keys(), ...vt.keys()])].sort((a, b) => (Number(a) || 99) - (Number(b) || 99) || a.localeCompare(b));
    return {
      m, vend, deja, aporte: vend * deja, stock, menos, dias: vend ? stock / (vend / DIAS) : stock ? Infinity : 0, parada: stock * hechura(m),
      talles: ts.map((t) => [t, tm.get(t) || 0, vt.get(t) || 0] as [string, number, number]),
    };
  });
  if (!filas.length) return null;

  // ---- Volumen × margen
  const conVenta = filas.filter((f) => f.vend > 0);
  const mV = mediana(conVenta.map((f) => f.vend)), mD = mediana(filas.map((f) => f.deja));
  const grupo = (f: Fila) => (f.vend > 0 && f.vend >= mV ? "s" : "n") + (f.deja >= mD ? "s" : "n");
  const totAporte = filas.reduce((a, f) => a + Math.max(0, f.aporte), 0);
  const ranking = [...filas].sort((a, b) => b.aporte - a.aporte);
  const maxAp = Math.max(1, ...ranking.map((f) => Math.abs(f.aporte)));
  const top3 = ranking.slice(0, 3).reduce((a, f) => a + Math.max(0, f.aporte), 0);
  // Gráfico: x = vendidos en 90 días, y = lo que deja cada vestido
  const W = 340, H = 230, L = 8, R = 8, T = 10, B = 22;
  const xMax = Math.max(1, ...filas.map((f) => f.vend)) * 1.08;
  const yLo = Math.min(0, ...filas.map((f) => f.deja)), yHi = Math.max(1, ...filas.map((f) => f.deja)) * 1.08;
  const X = (v: number) => L + (v / xMax) * (W - L - R), Y = (v: number) => T + (1 - (v - yLo) / (yHi - yLo)) * (H - T - B);
  const color = (g: string) => GRUPOS.find((x) => x.k === g)!.c;
  const etiquetados = new Set(ranking.slice(0, 5).map((f) => f.m.modelo));

  // ---- Rotación
  const temps = [...new Set(filas.filter((f) => f.stock > 0 && f.m.temp).map((f) => f.m.temp))].sort();
  const tSel = temps.includes(temp) ? temp : "";
  const deTemp = filas.filter((f) => !tSel || f.m.temp === tSel);
  const enStock = deTemp.filter((f) => f.stock > 0).sort((a, b) => b.parada - a.parada);
  const parada = enStock.reduce((a, f) => a + f.parada, 0), paradaPrecio = enStock.reduce((a, f) => a + f.stock * f.m.precio, 0);
  const prendas = enStock.reduce((a, f) => a + f.stock, 0), ventaDia = deTemp.reduce((a, f) => a + f.vend, 0) / DIAS;
  const menosTot = deTemp.reduce((a, f) => a + f.menos, 0);
  const lentos = enStock.filter((f) => f.dias > 180);
  const lentaPlata = lentos.reduce((a, f) => a + f.parada, 0);
  const maxPar = Math.max(1, ...enStock.map((f) => f.parada));
  const conocidos = new Set(filas.map((f) => claveModelo(f.m.modelo)));
  const sinCosto = [...talles.entries()].filter(([k, t]) => !conocidos.has(k) && [...t.values()].some((q) => q > 0)).map(([k]) => k.replace(/^./, (c) => c.toUpperCase()));
  const hayTalleApp = [...vendT.values()].some((t) => t.size);

  return (
    <>
      <Section title="Volumen × margen" sub={`Cuánto se vendió de cada modelo en los últimos ${DIAS} días y cuánto deja cada vestido${conFijos ? " con los fijos incluidos" : " (sólo variables)"}. Las líneas punteadas son la mitad: a la derecha se vende más que el promedio, arriba deja más.`}>
        <div className="vm">
          <svg viewBox={`0 0 ${W} ${H}`} className="vm-g" role="img" aria-label="Vendidos contra lo que deja cada modelo">
            <line x1={X(mV)} x2={X(mV)} y1={T} y2={H - B} className="vm-med" />
            <line x1={L} x2={W - R} y1={Y(mD)} y2={Y(mD)} className="vm-med" />
            {yLo < 0 && <line x1={L} x2={W - R} y1={Y(0)} y2={Y(0)} className="vm-cero" />}
            <text x={W - R} y={T + 9} textAnchor="end" className="vm-q">sostienen</text>
            <text x={L + 2} y={T + 9} className="vm-q">dejan mucho, venden poco</text>
            <text x={W - R} y={H - B - 5} textAnchor="end" className="vm-q">venden mucho, dejan poco</text>
            <text x={L} y={H - 6} className="vm-ax">0</text>
            <text x={W - R} y={H - 6} textAnchor="end" className="vm-ax">{fmt.n(Math.round(xMax))} vendidos →</text>
            {filas.map((f) => (
              <g key={f.m.modelo + f.m.temp}>
                <circle cx={X(f.vend)} cy={Y(f.deja)} r={etiquetados.has(f.m.modelo) ? 6 : 4.5} fill={color(grupo(f))} fillOpacity={0.85} stroke="var(--surface)" strokeWidth={1.5}><title>{`${f.m.modelo}: ${f.vend} vendidos, deja ${fmt.ars(f.deja)} cada uno`}</title></circle>
                {etiquetados.has(f.m.modelo) && <text x={X(f.vend) + (X(f.vend) > W - 70 ? -9 : 9)} y={Y(f.deja) + 4} textAnchor={X(f.vend) > W - 70 ? "end" : "start"} className="vm-l">{f.m.modelo}</text>}
              </g>
            ))}
          </svg>
          <div className="vm-gr">
            {GRUPOS.map((g) => {
              const fs = filas.filter((f) => grupo(f) === g.k).sort((a, b) => b.aporte - a.aporte);
              return (
                <div key={g.k} className="vm-c">
                  <h4><i style={{ background: g.c }} />{g.t}<small>{fs.length}</small></h4>
                  <p>{g.d}</p>
                  <div className="vm-ch">{fs.length ? fs.map((f) => <span key={f.m.modelo + f.m.temp}>{f.m.modelo}</span>) : <em>ninguno</em>}</div>
                </div>
              );
            })}
          </div>
        </div>
        <h3 className="vm-h">Lo que dejó cada modelo en {DIAS} días</h3>
        <p className="vm-s">Vendidos × lo que deja cada uno. {totAporte > 0 && <>Los 3 primeros son el <b>{fmt.p(top3 / totAporte)}</b> de todo lo que quedó.</>}</p>
        <ol className="vm-rk">
          {ranking.filter((f) => f.vend > 0).map((f) => (
            <li key={f.m.modelo + f.m.temp}>
              <span className="n">{f.m.modelo}<small>{f.vend} × {fmt.ars(f.deja)}</small></span>
              <span className="b"><i style={{ width: `${(Math.abs(f.aporte) / maxAp) * 100}%`, background: f.aporte < 0 ? "var(--bad)" : color(grupo(f)) }} /></span>
              <b className={f.aporte < 0 ? "neg" : undefined}>{fmt.M(f.aporte)}</b>
            </li>
          ))}
        </ol>
        {filas.length > conVenta.length && <p className="note">Sin ventas en {DIAS} días: {filas.filter((f) => !f.vend).map((f) => f.m.modelo).join(", ")}.</p>}
      </Section>

      <div id="rotacion" />
      <Section title="Rotación y stock parado" sub={`Cuánto tardaría en venderse lo que hay, al ritmo de los últimos ${DIAS} días, y cuánta plata hay parada en stock a costo de hacerlo (tela, confección y avíos).`}>
        {temps.length > 0 && <div className="rt-seg"><Seg label="Temporada" opts={[["", "Todas"], ...temps.map((t): [string, string] => [t, t])]} value={tSel} href={hrefTemp} /></div>}
        {tSel && <p className="rt-sel">Sólo los modelos de {tSel}: {enStock.length} {enStock.length === 1 ? "modelo" : "modelos"} en stock.</p>}
        <Kpis>
          <Kpi q={1} n={fmt.M(parada)} l="Plata parada en stock" s={`a costo · ${fmt.n(prendas)} prendas`}
            back={{ q: "Prendas en stock (último conteo menos lo vendido desde entonces) × costo de hacer cada una: tela, confección y avíos.", a: "Es la plata que ya se gastó y vuelve recién cuando se vende." }} />
          <Kpi q={2} n={fmt.M(paradaPrecio)} l="Si se vendiera todo" s="a precio de venta"
            back={{ q: "Prendas en stock × precio promedio de venta de cada modelo en los últimos 90 días.", a: "Lo que entraría si se vendiera todo al precio de hoy." }} />
          <Kpi q={3} n={ventaDia ? dias(prendas / ventaDia) : "—"} l="Para vender todo" s={`a ${fmt.n(Math.round(ventaDia * 30))} prendas por mes`}
            back={{ q: `Prendas en stock ÷ prendas vendidas por día (últimos ${DIAS} días, hoja Ventas).`, a: "Cuanto más corto, más rápido vuelve la plata." }} />
          <Kpi q={4} tone={lentos.length ? "bad" : "good"} n={fmt.M(lentaPlata)} l="Parada más de 6 meses" s={`${lentos.length} ${lentos.length === 1 ? "modelo" : "modelos"}`}
            back={{ q: "Modelos que al ritmo actual tardarían más de 6 meses en venderse (o que no se vendieron en 90 días).", a: "Candidatos a liquidar, mostrar más o no reponer." }} />
        </Kpis>
        <div className="rt">
          {enStock.map((f) => (
            <details key={f.m.modelo + f.m.temp} className="rt-m">
              <summary>
                <span className="n"><b>{f.m.modelo}</b><small>{f.stock} en stock · {porMes(f.vend)}</small></span>
                <span className={`pill ${ritmo(f.dias)}`}>{dias(f.dias)}</span>
                <span className="b"><i style={{ width: `${(f.parada / maxPar) * 100}%` }} className={ritmo(f.dias)} /></span>
                <b className="p">{fmt.M(f.parada)}</b>
              </summary>
              <div className="rt-t">
                {f.talles.map(([t, q, v]) => (
                  <span key={t} className={q ? undefined : "z"}><b>{/^\d+$/.test(t) ? `T${t}` : t}</b>{q ? `${q}` : "agotado"}{v ? <small>{v} vend.</small> : null}</span>
                ))}
              </div>
              {f.menos > 0 && <p className="rt-c">El conteo por talle es del {fechaCorta(sinTalle.desde)}. Desde entonces se vendieron {f.menos} más según la hoja Ventas, que no dice el talle: ya están descontadas del total ({f.stock + f.menos} − {f.menos} = {f.stock}).</p>}
              <p className="rt-c">{f.stock} prendas × {fmt.ars(hechura(f.m))} de hacer cada una = {fmt.ars(f.parada)} · {f.vend ? <>{f.vend} vendidos en {DIAS} días = {(f.vend / DIAS).toFixed(2).replace(".", ",")} por día → {f.stock} ÷ {(f.vend / DIAS).toFixed(2).replace(".", ",")} = {dias(f.dias)}</> : <>no se vendió en {DIAS} días</>}</p>
            </details>
          ))}
        </div>
        {menosTot > 0 && <p className="note">El stock es el último conteo ({fechaCorta(sinTalle.desde)}) menos lo vendido desde entonces: los movimientos y las ventas online por talle, y {fmt.n(menosTot)} {menosTot === 1 ? "prenda" : "prendas"} más de la hoja Ventas que se descuentan por modelo porque no dicen el talle.</p>}
        <p className="note">La hoja Ventas no dice el talle, así que los días son por modelo. Abrí uno para ver el stock por talle{hayTalleApp ? " y lo vendido por talle según Movimientos" : "; la venta por talle requiere registros con esa información en las planillas"}.{sinCosto.length ? ` No entran ${sinCosto.join(", ")}: están en stock pero no tienen costo o precio.` : ""}</p>
      </Section>
    </>
  );
}
