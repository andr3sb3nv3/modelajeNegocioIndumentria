import Link from "next/link";
import type { Costos, CostoVestido, Parte } from "@/lib/costos";
import { NOMBRE_PLANILLA, claveModelo } from "@/lib/costos";
import { fmt } from "@/lib/fmt";
import { Kpi, Kpis, Section } from "./ui";

const k = (v: number) => (v < 0 ? "−" : "") + fmt.ars(Math.abs(v));
const COLOR: Record<Parte["k"] | "fijo", string> = {
  tela: "var(--s2)", conf: "var(--s4)", avios: "var(--s3)", estampa: "#c98a2e", pack: "#b9a2ad",
  merma: "#d9c6cf", otros: "#a3979d", com: "#d68aa6", envio: "#7fa7c9", fijo: "var(--accent)",
};
type Pieza = { k: Parte["k"] | "fijo"; t: string; v: number; n?: string };

/** Costo unitario: cuánto cuesta hacer y vender cada vestido, sólo variables o con su parte de los fijos, contra su precio. */
export type Fuente = { t: string; u: string };
export type Fuentes = { compras: Fuente; prod: Fuente; gastos: Fuente; ventas: Fuente };

const Ir = ({ f }: { f: Fuente }) => <a className="cu-ir" href={f.u} target="_blank" rel="noopener">{f.t} ↗</a>;

export function CostoUnitario({ c, fuentes, conFijos, href, stock, vendidos }: {
  c: Costos; fuentes: Fuentes; conFijos: boolean; href: (total: boolean) => string;
  stock: Map<string, number>; vendidos: Map<string, number>;
}) {
  const piezas = (m: CostoVestido): Pieza[] => [...m.partes, ...(conFijos && m.fijo > 0 ? [{ k: "fijo" as const, t: "Parte de fijos y campañas", v: m.fijo, n: m.notas.fijo }] : [])];
  const costo = (m: CostoVestido) => m.variable + (conFijos ? m.fijo : 0);
  const planilla: Fuente | null = c.fuente === "planilla" && c.url ? { t: `${NOMBRE_PLANILLA} › Costo unitario`, u: c.url } : null;
  const fuenteDe = (k: Pieza["k"]): Fuente[] =>
    k === "fijo" ? [fuentes.gastos, fuentes.ventas] : planilla ? [planilla] : k === "tela" ? [fuentes.compras, fuentes.prod] : k === "conf" ? [fuentes.prod] : [fuentes.gastos, fuentes.ventas];
  const ejemplo = (k: Parte["k"]) => c.modelos.flatMap((m) => m.partes.filter((p) => p.k === k && p.n).map((p) => ({ m, p }))).find((x) => !/promedio/i.test(x.p.n || "")) || c.modelos.flatMap((m) => m.partes.filter((p) => p.k === k && p.n).map((p) => ({ m, p })))[0];
  const lista = [...c.modelos].sort((a, b) => costo(b) - costo(a));

  // Promedios pesados por lo vendido en 90 días (si nada se vendió, promedio simple)
  const pesos = lista.map((m) => vendidos.get(claveModelo(m.modelo)) || 0);
  const totQ = pesos.reduce((a, b) => a + b, 0);
  const prom = (f: (m: CostoVestido) => number) =>
    totQ ? lista.reduce((a, m, i) => a + f(m) * pesos[i], 0) / totQ : lista.length ? lista.reduce((a, m) => a + f(m), 0) / lista.length : 0;
  const costoProm = prom(costo);
  // % del precio: sólo entre los que tienen precio de venta
  const conPrecio = lista.filter((m) => m.precio > 0);
  const pesoP = (m: CostoVestido) => vendidos.get(claveModelo(m.modelo)) || 0;
  const qP = conPrecio.reduce((a, m) => a + pesoP(m), 0);
  const promP = (f: (m: CostoVestido) => number) => qP ? conPrecio.reduce((a, m) => a + f(m) * pesoP(m), 0) / qP : conPrecio.length ? conPrecio.reduce((a, m) => a + f(m), 0) / conPrecio.length : 0;
  const precioProm = promP((m) => m.precio), costoPromP = promP(costo);
  // De cada $100 de costo, cuánto es tela, confección, etc.
  const comp = new Map<string, Pieza>();
  for (const m of lista) for (const p of piezas(m)) { const a = comp.get(p.k) || { ...p, v: 0 }; a.v += p.v * (totQ ? pesos[lista.indexOf(m)] / totQ : 1 / lista.length); comp.set(p.k, a); }
  const compTot = [...comp.values()].reduce((a, p) => a + p.v, 0);
  const caro = lista[0], barato = lista[lista.length - 1];
  const pierden = lista.filter((m) => m.precio > 0 && m.precio < costo(m));
  const sinPrecio = lista.length - conPrecio.length;
  const src: [string, string][] = c.url ? [[NOMBRE_PLANILLA, c.url]] : [];

  return (
    <div className="cu">
      <div className="cu-cab">
        <nav className="seg cu-seg" aria-label="Qué costo ver">
          <Link href={href(false)} className={conFijos ? "" : "on"} scroll={false}>Sólo variables</Link>
          <Link href={href(true)} className={conFijos ? "on" : ""} scroll={false}>Con fijos incluidos</Link>
        </nav>
        <p className="cu-exp">{conFijos
          ? <>Lo que cuesta hacer y vender un vestido <b>más su parte de los fijos y las campañas</b>. Los fijos ({fmt.M(c.fijosMes)} por mes) más fotos y campañas ({fmt.M(c.campanaMes)} por mes) son el <b>{fmt.p(c.fijoPct, 1)}</b> de lo que se vende por mes ({fmt.M(c.ventasMes)}), así que a cada vestido le toca ese {fmt.p(c.fijoPct, 1)} de su precio: el que se vende más caro paga más fijo.</>
          : <>Lo que cuesta hacer y vender un vestido: tela, confección, avíos, packaging, envíos y comisión. No incluye sueldos, pauta, fotos ni campañas.</>}</p>
      </div>

      <Kpis>
        <Kpi q={1} n={fmt.ars(costoProm)} l="Costo unitario promedio" s={precioProm ? `${fmt.p(costoPromP / precioProm)} del precio de venta` : undefined}
          back={{ q: "Promedio del costo de un vestido, pesado por lo que se vendió de cada modelo en los últimos 90 días.", a: conFijos ? "Incluye la parte de los fijos." : "Sólo lo que se gasta por cada vestido que se hace y se vende.", src }} />
        <Kpi q={2} n={caro ? fmt.ars(costo(caro)) : "—"} l="El más caro de hacer" s={caro?.modelo}
          back={{ q: "El modelo con mayor costo unitario.", a: "Conviene que también sea de los de precio más alto.", src }} />
        <Kpi q={3} n={barato ? fmt.ars(costo(barato)) : "—"} l="El más barato de hacer" s={barato?.modelo}
          back={{ q: "El modelo con menor costo unitario.", a: "Si además se vende caro, es de los que más dejan.", src }} />
        <Kpi q={4} n={fmt.p(c.fijoPct, 1)} l="Fijos y campañas, de cada venta" s={conFijos ? "ya sumado al costo" : "no sumado (tocá «Con fijos»)"}
          back={{ q: `(Fijos ${fmt.M(c.fijosMes)} + fotos y campañas ${fmt.M(c.campanaMes)} por mes) ÷ ${fmt.M(c.ventasMes)} vendidos por mes. Fijos = Tipo Fijo en 01 · Gastos maestro, promedio de los últimos 3 meses cerrados.`, a: "Cuanto más se vende por mes, menos porcentaje se llevan los fijos.", src }} />
      </Kpis>

      {c.avisos.map((a) => <p key={a} className="note">{a}</p>)}

      {compTot > 0 && (
        <Section title="De qué está hecho el costo" sub="De cada $ 100 que cuesta un vestido promedio, cuánto se va en cada cosa.">
          <div className="cu-comp">
            <div className="cu-comp-bar">{[...comp.values()].map((p) => <i key={p.k} style={{ flexGrow: p.v, background: COLOR[p.k] }} className={p.k === "fijo" ? "fijo" : undefined} title={p.t} />)}</div>
            <ul>{[...comp.values()].sort((a, b) => b.v - a.v).map((p) => (
              <li key={p.k}><i style={{ background: COLOR[p.k] }} className={p.k === "fijo" ? "fijo" : undefined} /><span>{p.t}</span><b>{fmt.p(p.v / compTot)}</b><em>{fmt.ars(p.v)}</em></li>
            ))}</ul>
          </div>
        </Section>
      )}

      <Section title="De dónde salen los números" sub="Cada parte del costo, de qué planilla sale (tocá el link para abrirla) y cómo se calcula. Todos los números provienen de las planillas ficticias de esta demostración.">
        <div className="cu-fu">
          {planilla && <div className="cu-fr"><h4>Todo lo variable</h4><p>Sale tal cual de la hoja «Costo unitario» de la planilla {NOMBRE_PLANILLA}, una fila por modelo.</p><div className="cu-irs"><Ir f={planilla} /></div></div>}
          {!planilla && ([
            ["tela", "Tela", "Metros de tela comprados para ese modelo y temporada × precio por metro (Compras de telas, columna «Modelo destino») ÷ prendas producidas de ese modelo (Producción). Si el modelo no tiene compras con destino o el número da muy alto, se usa el promedio de la temporada."],
            ["conf", "Confección", "La columna «Precio confeccion unit» de la hoja Producción: lo que cobra el taller por prenda de ese modelo y temporada. Si no está cargado, el promedio de la temporada."],
            ["avios", "Avíos (cierres, mercería)", "Lo gastado en cierres, botones, hilos, mercería e insumos en los últimos 90 días (Gastos: categoría o subcategoría que lo nombra) ÷ vestidos vendidos en esos 90 días (Ventas). Es igual para todos los modelos."],
            ["pack", "Packaging", "Packaging, bolsas, cajas y etiquetas de los últimos 90 días (Gastos) ÷ vestidos vendidos en esos 90 días (Ventas). Igual para todos."],
            ["envio", "Envíos", "Envíos, logística, correo y cadetes de los últimos 90 días (Gastos) ÷ vestidos vendidos en esos 90 días (Ventas). Igual para todos."],
            ["com", "Comisión de venta", "Comisiones de los últimos 90 días (Gastos) ÷ vestidos vendidos en esos 90 días (Ventas). Igual para todos."],
          ] as [Parte["k"], string, string][]).map(([kk, t, como]) => {
            const e = ejemplo(kk);
            return (
              <div key={kk} className="cu-fr">
                <h4><i style={{ background: COLOR[kk] }} />{t}</h4>
                <p>{como}</p>
                {e && <p className="cu-ej"><b>Ejemplo{["tela", "conf"].includes(kk) ? `, ${e.m.modelo} ${e.m.temp}` : ""}:</b> {e.p.n}</p>}
                <div className="cu-irs">{fuenteDe(kk).map((f) => <Ir key={f.t} f={f} />)}</div>
              </div>
            );
          })}
          <div className="cu-fr">
            <h4><i className="fijo" style={{ background: COLOR.fijo }} />Fijos y campañas</h4>
            <p>Gastos con Tipo «Fijo» en Gastos (promedio de los últimos 3 meses cerrados: {fmt.M(c.fijosMes)} por mes) más el resto de los gastos variables que no son por vestido, como fotos, campañas, modelos y moldería ({fmt.M(c.campanaMes)} por mes, promedio de 90 días), divididos lo vendido por mes ({fmt.M(c.ventasMes)}) = <b>{fmt.p(c.fijoPct, 1)}</b>. A cada vestido le toca ese porcentaje de su precio. Sólo se suma en «Con fijos incluidos».</p>
            <div className="cu-irs">{fuenteDe("fijo").map((f) => <Ir key={f.t} f={f} />)}</div>
          </div>
          <div className="cu-fr">
            <h4>Precio de venta</h4>
            <p>Lo cobrado por ese modelo en los últimos 90 días ÷ prendas vendidas (hoja Ventas, pestaña Todos). Si no se vendió en 90 días, el promedio del último año.</p>
            <div className="cu-irs"><Ir f={fuentes.ventas} /></div>
          </div>
        </div>
        <p className="note">Tocá cualquier vestido de abajo y debajo de cada número está su cuenta exacta, con el link a la planilla de donde sale.</p>
      </Section>

      <Section title="Vestido por vestido" sub="Ordenados del más caro al más barato de hacer. Cada barra es el precio de venta entero: los colores son lo que cuesta y lo verde, lo que queda. Tocá uno para ver la cuenta.">
        {pierden.length > 0 && <p className="err">{pierden.map((m) => m.modelo).join(", ")} {pierden.length === 1 ? "cuesta" : "cuestan"} más de lo que se {pierden.length === 1 ? "vende" : "venden"}{conFijos ? " cuando se suman los fijos" : ""}.</p>}
        {sinPrecio > 0 && <p className="note">{sinPrecio} {sinPrecio === 1 ? "modelo no tiene" : "modelos no tienen"} precio porque no se {sinPrecio === 1 ? "vendió" : "vendieron"} en el último año: se muestra sólo el costo.</p>}
        <div className="cu-list">
          {lista.map((m) => {
            const cu = costo(m), d = m.precio - cu, sp = !m.precio;
            const kq = claveModelo(m.modelo), sq = Math.max(0, stock.get(kq) || 0), vq = vendidos.get(kq) || 0;
            return (
              <details key={m.modelo + m.temp} className={`cu-m${d < 0 ? " no" : ""}`}>
                <summary>
                  <div className="cu-h">
                    <span className="cu-n"><b>{m.modelo}</b>{m.temp && <small>{m.temp}</small>}</span>
                    <span className="cu-c"><small>cuesta</small><strong>{fmt.ars(cu)}</strong></span>
                  </div>
                  <div className="cu-bar" role="img" aria-label={sp ? `Cuesta ${fmt.ars(cu)}, sin precio de venta` : `Se vende a ${fmt.ars(m.precio)}: cuesta ${fmt.ars(cu)} y ${d >= 0 ? "queda" : "pierde"} ${fmt.ars(Math.abs(d))}`}>
                    {piezas(m).map((p) => <i key={p.k} style={{ flexGrow: p.v, background: COLOR[p.k] }} className={p.k === "fijo" ? "fijo" : undefined} />)}
                    {!sp && d > 0 && <i className="gana" style={{ flexGrow: d }} />}
                    {!sp && d < 0 && <em style={{ left: `${(m.precio / cu) * 100}%` }} />}
                  </div>
                  <div className="cu-s">
                    {sp ? <span className="sp">sin precio: no se vendió en el último año</span> : <span>se vende a {fmt.ars(m.precio)}</span>}
                    {!sp && <span className={d < 0 ? "no" : "ok"}>{d >= 0 ? "deja" : "pierde"} {k(Math.abs(d))} · {fmt.p(Math.abs(d) / m.precio)}</span>}
                  </div>
                </summary>
                <ul className="cu-det">
                  {piezas(m).map((p) => <li key={p.k}><i style={{ background: COLOR[p.k] }} className={p.k === "fijo" ? "fijo" : undefined} />{p.t}<b>{fmt.ars(p.v)}</b><em>{cu ? fmt.p(p.v / cu) : ""}</em>{p.n && <small className="cta">{p.n} {fuenteDe(p.k).map((f) => <a key={f.t} href={f.u} target="_blank" rel="noopener">{f.t.split(" › ").pop()} ↗</a>)}</small>}</li>)}
                  <li className="sub">Costo unitario<b>{fmt.ars(cu)}</b><em /></li>
                  {sp ? <li className="sub">Precio de venta<b>sin precio</b><em /></li> : <>
                    <li className="sub">Precio de venta<b>{fmt.ars(m.precio)}</b><em />{m.notas.precio && <small className="cta">{m.notas.precio} <a href={fuentes.ventas.u} target="_blank" rel="noopener">Ventas ↗</a></small>}</li>
                    <li className={`tot${d < 0 ? " no" : ""}`}>{d >= 0 ? "Queda por vestido" : "Pierde por vestido"}<b>{k(d)}</b><em /><small className="cta">{fmt.ars(m.precio)} − {fmt.ars(cu)} = {k(d)}</small></li>
                  </>}
                  <li className="ej">{sq} en stock · {vq} vendidos en 90 días{m.ejemplos > 0 ? ` · ${m.ejemplos} ${m.ejemplos === 1 ? "dato es" : "datos son"} de ejemplo en la planilla` : ""}</li>
                </ul>
              </details>
            );
          })}
        </div>
        {!lista.length && <p className="note">No encontré modelos en Producción ni en el último conteo de stock.</p>}
      </Section>

      <p className="cu-src"><Link href="/ventas#precio-lleno">¿Cuánto de cada temporada se vende a precio lleno? Miralo en Análisis de ventas →</Link></p>
      <p className="cu-src">{c.fuente === "planilla"
        ? <>Costos de la planilla <a href={c.url} target="_blank" rel="noopener">{NOMBRE_PLANILLA} ↗</a> (carpeta Producción y stock). Fijos y precios, de 01 · Gastos maestro y Ventas.</>
        : <>Costos estimados: tela y confección de Producción y stock, el resto de Gastos. Cuando esté la planilla «{NOMBRE_PLANILLA}» en el Drive, salen de ahí.</>}</p>
    </div>
  );
}
