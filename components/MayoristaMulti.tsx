"use client";
import { Fragment, useMemo, useState } from "react";
import { fmt } from "@/lib/fmt";
import { DATOS, escenario, porModelo, type Escenario, type ModeloBase } from "@/lib/multimarcas";
import { Rango, Reparto } from "@/components/MayoristaComun";

const P = DATOS.params;
const BASE = DATOS.modelos as unknown as ModeloBase[];
const ESC = DATOS.escenarios.map((e) => ({ nombre: e.nombre, modo: e.modo, tiendas: e.tiendas, xt: e.xt, st: e.st, ag: e.ag }) as Escenario);
const x = (v: number) => "×" + v.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
const sM = (v: number) => (v < 0 ? "−" : "") + fmt.M(Math.abs(v));

const ICON: Record<string, string> = {
  precio: "M20 12l-8 8-9-9V3h8zM7.5 7.5h.01",
  minimo: "M4 7h16M4 12h16M4 17h10",
  consig: "M3 12h13M12 7l5 5-5 5M21 5v14",
  plazo: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  zona: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  repo: "M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5",
  ficha: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5",
  donde: "M3 9l1.5-5h15L21 9M3 9h18M5 12v8h14v-8M10 20v-5h4v5",
};
const REGLAS: [string, string, string][] = [
  ["precio", "El precio", `La tienda te paga y multiplica por ${x(P.mult)} para llegar al mismo precio al público.`],
  ["minimo", "Pedido mínimo", "Unas 12 prendas para abrir, 4 a 6 modelos, con más talles del medio."],
  ["consig", "Consignación o compra", "Para probar, consignación. Para crecer, que la tienda compre."],
  ["plazo", "Cuándo se cobra", "50% de seña al pedir y el resto a 30 días."],
  ["zona", "Una tienda por ciudad", "Exclusividad por zona a cambio de un mínimo. Distancia del showroom de ejemplo."],
  ["repo", "Reponer lo que vuela", "A mitad de temporada se repone lo que se vende. Guardar producción."],
  ["ficha", "La ficha mayorista", "Fotos, colores, talles, precios, mínimo y plazos en una hoja."],
  ["donde", "Dónde están", "Tiendas ficticias de distintas regiones y encuentros comerciales de ejemplo."],
];
const CAMINOS = ["Probar", "Crecer", "Escalar"];
const ESTADO: Record<string, string> = { Ejemplo: "ej" };
/** Supuestos de la planilla en palabras simples */
const LLANO: Record<string, string> = {
  mult: "Cuánto multiplica la tienda lo que nos paga", fijoPct: "Lo que se llevan los fijos de la marca demo de cada venta", log: "Envío hasta la tienda, por vestido",
  tasa: "Lo que cuesta esperar para cobrar, por mes", plazo: "Días para cobrar cuando la tienda compra", devol: "Vestidos que vuelven con falla",
  consig: "Lo que se queda la tienda en consignación", plazoC: "Días para cobrar en consignación", deter: "Devueltos que ya no se venden a precio lleno",
  agente: "Comisión de un agente o showroom", fotos: "Fotos y ficha mayorista, por temporada", visitas: "Visitas y envío de muestrarios, por mes",
  feria: "Feria o showroom, por temporada", cap: "Capacidad mensual supuesta, en prendas",
  comOn: "Comisión de Tiendanube y pasarela", envOn: "Envío que paga la marca demo en la venta online", cac: "Pauta para conseguir cada venta online nueva", pautaMay: "Pauta para conseguir compradoras mayoristas, por mes",
};

function Ico({ k }: { k: string }) {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={ICON[k]} /></svg>;
}
function Tiendas({ n }: { n: number }) {
  const max = 15;
  return <div className="my-tiendas" aria-label={`${n} tiendas`}>{Array.from({ length: Math.min(n, max) }, (_, i) => <svg key={i} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={ICON.donde} /></svg>)}</div>;
}

/** Segunda opción del canal mayorista: vender a multimarcas (?m=multi). */
export function VistazoMulti() {
  const [esc, setEsc] = useState<Escenario>(ESC[1]);
  const [preset, setPreset] = useState(1);
  const base = useMemo(() => porModelo(BASE, P), []);
  const r = useMemo(() => escenario(esc, base, P), [esc, base]);
  const a = DATOS.prom, vs = DATOS.vs;
  const van = base.filter((m) => m.va).sort((p, q) => q.deja - p.deja), noVan = base.filter((m) => !m.va).sort((p, q) => q.deja - p.deja);
  const maxDeja = Math.max(...base.map((m) => m.deja));
  const tienda = a.pvp - a.may, otrosMay = a.log + a.fin + a.fal, otrosMin = a.pvp - a.fab - a.dejaMin;
  const cambiar = (c: Partial<Escenario>) => { setEsc({ ...esc, ...c }); setPreset(-1); };
  const res = DATOS.escenarios.map((e) => e.resMes), maxRes = Math.max(...res);
  const consig = esc.modo === "Consignación";

  return (
    <>
      <section className="gl my-hero">
        <span className="my-ey">Segunda opción · multimarcas</span>
        <h2 className="my-h2">De un vestido de {fmt.M(a.pvp)}, ¿cuánto le queda a la marca demo?</h2>
        <Reparto t="Vendido en el showroom" partes={[["fab", "Fábrica", a.fab], ["otr", "Cobro y envío", otrosMin], ["gana", "Marca demo", a.dejaMin]]} total={a.pvp} />
        <Reparto t="Vendido en una multimarca" partes={[["tie", "La tienda", tienda], ["fab", "Fábrica", a.fab], ["otr", "Envío y plazo", otrosMay], ["gana", "Marca demo", a.deja]]} total={a.pvp} />
        <p className="my-lead">Por mayor queda <b>un tercio</b> ({fmt.p(a.vsMin)}). Por eso el mayorista sirve para <b>sumar clientas nuevas en otras ciudades</b>, nunca para reemplazar las del showroom.</p>
      </section>

      <div className="my-tres">
        <div className="gl my-num q1"><b>{fmt.M(a.may)}</b><span>te paga la tienda por cada vestido</span></div>
        <div className="gl my-num q2"><b>{van.length} de {base.length}</b><span>modelos sirven para vender por mayor</span></div>
        <div className="gl my-num q3"><b>+{fmt.M(DATOS.escenarios[1].resMes)}</b><span>por mes con {DATOS.escenarios[1].tiendas} tiendas</span></div>
      </div>

      <section>
        <div className="sec-h"><h2>Las reglas del juego</h2></div>
        <p className="sec-sub">Cómo se trabaja con multimarcas, según lo investigado. Hay que confirmarlo hablando con ellas.</p>
        <div className="my-reglas">
          {REGLAS.map(([k, t, d]) => <div key={k} className="gl my-regla"><i><Ico k={k} /></i><b>{t}</b><span>{d}</span></div>)}
        </div>
      </section>

      <section>
        <div className="sec-h"><h2>Qué vestidos llevar</h2></div>
        <p className="sec-sub">Lo que le queda a la marca demo por cada vestido vendido por mayor. Van los que se quedan con al menos el {fmt.p(P.umbral)} de lo que paga la tienda; {noVan.slice(0, 2).map((m) => m.modelo).join(" y ")} quedan justo debajo del límite.</p>
        <div className="gl my-rank">
          {[...van, ...noVan].map((m, i) => (
            <Fragment key={m.modelo}>
              {i === van.length && <div className="my-corte"><span>no van</span></div>}
              <div className={`my-rk${m.va ? "" : " fuera"}`}>
                <span className="n">{m.modelo}</span>
                <span className="b"><i style={{ width: `${Math.max(1, (Math.max(0, m.deja) / maxDeja) * 100)}%` }} /></span>
                <span className="v">{m.deja < 0 ? "pierde" : fmt.M(m.deja)}</span>
              </div>
            </Fragment>
          ))}
        </div>
      </section>

      <section>
        <div className="sec-h"><h2>Tres caminos</h2></div>
        <p className="sec-sub">Por mes, en una temporada de 6 meses.</p>
        <div className="my-caminos">
          {DATOS.escenarios.map((e, i) => (
            <button key={e.nombre} type="button" className={`gl my-cam${preset === i ? " on" : ""}`} onClick={() => { setEsc(ESC[i]); setPreset(i); }}>
              <small>{CAMINOS[i]}</small>
              <Tiendas n={e.tiendas} />
              <span className="t">{e.tiendas} tiendas · {e.modo === "Consignación" ? "consignación" : "compran"}{e.ag ? " · con agente" : ""}</span>
              <b>+{fmt.M(e.resMes)}</b>
              <span className="bar"><i style={{ width: `${(e.resMes / maxRes) * 100}%` }} /></span>
              <span className="f">+{Math.round(e.prodMes)} prendas por mes · {fmt.M(e.capital)} a poner</span>
            </button>
          ))}
        </div>
        <details className="gl my-ajuste">
          <summary>Probar con otros números</summary>
          <div className="my-ctl">
            <div className="my-modo">
              {(["Consignación", "Compra en firme"] as const).map((m) => <button key={m} type="button" className={esc.modo === m ? "on" : ""} onClick={() => cambiar({ modo: m })}>{m === "Compra en firme" ? "La tienda compra" : m}</button>)}
            </div>
            <Rango l="Tiendas" v={esc.tiendas} min={1} max={30} step={1} f={String} on={(v) => cambiar({ tiendas: v })} />
            <Rango l="Prendas por tienda en la temporada" v={esc.xt} min={6} max={60} step={6} f={String} on={(v) => cambiar({ xt: v })} />
            {consig && <Rango l="Parte que vende la tienda" v={esc.st} min={0.2} max={1} step={0.05} f={(v) => fmt.p(v)} on={(v) => cambiar({ st: v })} />}
            <label className="my-chk"><input type="checkbox" checked={esc.ag === 1} onChange={(e) => cambiar({ ag: e.target.checked ? 1 : 0 })} />Con agente o showroom</label>
            <div className={`my-big${r.res < 0 ? " no" : ""}`}><small>Queda por mes</small><strong>{sM(r.resMes)}</strong>
              <span>{fmt.n(r.vend)} vestidos cobrados · +{fmt.n(r.prodMes)} prendas por mes de producción · {fmt.M(r.capital)} a poner antes de cobrar</span></div>
          </div>
        </details>
      </section>

      <section>
        <div className="sec-h"><h2>¿Consignación o que la tienda compre?</h2></div>
        <p className="sec-sub">Dejando 100 vestidos en tiendas.</p>
        <div className="my-vs">
          {(["consig", "firme"] as const).map((k) => {
            const v = vs[k] as Record<string, number>, q = v["Prendas cobradas"];
            return (
              <div key={k} className="gl my-vc">
                <b>{k === "consig" ? "Consignación" : "La tienda compra"}</b>
                <div className="my-dots" role="img" aria-label={`${q} se cobran, ${100 - q} vuelven`}>{Array.from({ length: 100 }, (_, i) => <i key={i} className={i < q ? "on" : ""} />)}</div>
                <span className="my-leg"><i className="on" />{q} se cobran {100 - q > 0 && <><i />{100 - q} vuelven</>}</span>
                <strong>{fmt.M(v["Deja"])}</strong>
                <span>le quedan a la marca demo · la plata llega a los {v["Cuándo entra la plata (días)"]} días</span>
              </div>
            );
          })}
        </div>
        <p className="note">La consignación sirve para entrar a una tienda nueva. Para que deje lo mismo que una compra, la tienda tendría que vender el {fmt.p(vs.empate)}.</p>
      </section>

      <section>
        <div className="sec-h"><h2>Por dónde empezar</h2></div>
        <ol className="my-pasos">
          {DATOS.pasos.map((p) => <li key={p.que} className="gl"><small>{p.cuando}</small><b>{p.que}</b></li>)}
        </ol>
      </section>

      <section>
        <div className="sec-h"><h2>Supuestos de la demostración</h2></div>
        <p className="sec-sub">Todos los valores son ficticios y permiten comparar escenarios del modelo.</p>
        <div className="my-ley"><span className="ej">Ejemplo ficticio</span></div>
        <ul className="gl my-sup">
          {DATOS.supuestos.filter((s) => !["umbral", "meses", "comOn", "envOn", "cac", "pautaMay"].includes(s.k)).map((s) => (
            <li key={s.k} className={ESTADO[s.estado]}><i /><span>{LLANO[s.k] || s.t}</span><b>{s.k === "mult" ? x(s.v) : s.v < 1 ? fmt.p(s.v, s.v * 100 % 1 ? 1 : 0) : s.v >= 1000 ? fmt.M(s.v) : `${s.v}${/^plazo/.test(s.k) ? " días" : ""}`}</b></li>
          ))}
        </ul>
        <p className="my-xls"><a href="/mayorista/canal-mayorista-multimarcas.xlsx" download="Canal mayorista · multimarcas.xlsx">Bajar la planilla «Canal mayorista · multimarcas» ↓</a><span>Con todas las cuentas, vestido por vestido.</span></p>
      </section>
    </>
  );
}
