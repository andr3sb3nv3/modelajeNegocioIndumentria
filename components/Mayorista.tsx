"use client";
import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { fmt } from "@/lib/fmt";
import { DATOS, directo, porModelo, promedio, reven, type Directo as DirectoT, type ModeloBase, type Reven as RevenT } from "@/lib/mayorista";
import { tesis } from "@/lib/tesis-mayorista";
import { tesisMulti } from "@/lib/tesis-multimarcas";
import { DATOS as MULTI } from "@/lib/multimarcas";
import { Rango, Reparto, TesisVista } from "@/components/MayoristaComun";
import { VistazoMulti } from "@/components/MayoristaMulti";

const P = DATOS.params;
const BASE = DATOS.modelos as unknown as ModeloBase[];
const x = (v: number) => "×" + v.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
const sM = (v: number) => (v < 0 ? "−" : "") + fmt.M(Math.abs(v));

const ICON: Record<string, string> = {
  precio: "M20 12l-8 8-9-9V3h8zM7.5 7.5h.01",
  envio: "M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  caja: "M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8",
  charla: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z",
  invita: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6",
  talle: "M4 7h16M4 12h16M4 17h10",
  medir: "M3 3v18h18M7 15l4-4 3 3 5-6",
  vidriera: "M3 9l1.5-5h15L21 9M3 9h18M5 12v8h14v-8M10 20v-5h4v5",
  experiencia: "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z",
  plata: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15 9.5c-.6-1-1.7-1.5-3-1.5-1.7 0-3 .9-3 2s1.3 1.7 3 2 3 .9 3 2-1.3 2-3 2c-1.3 0-2.4-.5-3-1.5M12 6v12",
  clienta: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
};
const NO_MULTI: [string, string, string][] = [
  ["precio", "El precio deja de ser nuestro", `La tienda multiplica por ${x(P.mult)} o más para poder rebajar. La clienta aprende a esperar la rebaja.`],
  ["experiencia", "La experiencia también", "El vestido cuelga al lado de otras marcas y lo vende alguien que no es de la marca demo."],
  ["plata", "Deja menos", `${fmt.M(DATOS.prom.dejaMay)} por vestido, a ${P.plazo} días y con riesgo de no cobrar.`],
  ["clienta", "La clienta es de la tienda", "No sabemos quién compró ni la podemos volver a contactar."],
];
const REGLAS: [string, string, string][] = [
  ["precio", "Un solo precio", "El mismo en el showroom, en la tienda online y en las revendedoras. Nadie rebaja antes de la fecha."],
  ["envio", "Envío gratis", "A todo el país, y el cambio de talle sin costo."],
  ["caja", "La caja es parte del vestido", "Packaging de regalo y una nota: la entrega es la primera impresión."],
  ["charla", "Atención personal", "WhatsApp o videollamada para elegir talle y modelo antes de comprar."],
  ["invita", "Revendedoras por invitación", "La tabla mayorista no se publica: una por ciudad, pedido mínimo, sin marketplaces."],
  ["talle", "Todos los talles", "Comprando sin probarse, quedarse sin un talle es perder la venta."],
  ["medir", "Medir cada venta", "Cuánto costó en pauta, de qué ciudad vino y si tuvo cambio."],
  ["vidriera", "Vidriera sin multimarcas", "Un pop-up de 2 o 3 días en las ciudades que más compran online."],
];
const CAMINOS = ["Probar", "Crecer", "Escalar"];
const ESTADO: Record<string, string> = { Ejemplo: "ej" };
/** Supuestos de la planilla en palabras simples */
const LLANO: Record<string, string> = {
  fijoPct: "Lo que se llevan los fijos de la marca demo de cada venta", comOn: "Comisión de la tienda online y pasarela", envOn: "Envío gratis a otra ciudad, por venta",
  camb: "Ventas que se cambian de talle", devol: "Vestidos que vuelven con falla", cac: "Pauta para conseguir cada venta nueva",
  mesesStock: "Stock listo para no quedarse sin talles", descRev: "Descuento a revendedoras", pautaMay: "Pauta y atención para revendedoras, por mes",
  fotos: "Fotos, videos y catálogo, por temporada", cap: "Capacidad mensual supuesta, en prendas",
  cpc: "Costo de cada visita que trae la pauta", conv: "Visitas que terminan en compra", recompra: "Clientas nuevas que vuelven a comprar en el año", prueba: "Pauta para la prueba de un mes",
};
const OCULTOS = ["umbral", "meses", "mult", "log", "tasa", "plazo"];
const cacDe = (vmes: number) => P.cac * (vmes > 30 ? 1.3 : 1);

function Ico({ k }: { k: string }) {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={ICON[k]} /></svg>;
}
function Iconos({ n, k }: { n: number; k: string }) {
  const max = 20;
  return <div className="my-tiendas" aria-label={String(n)}>{Array.from({ length: Math.min(n, max) }, (_, i) => <svg key={i} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={ICON[k]} /></svg>)}{n > max && <span>+{n - max}</span>}</div>;
}

/**
 * Canal mayorista: primera opción vender a todo el país desde la tienda online (?m= vacío), segunda opción multimarcas (?m=multi).
 * Cada una se ve de un vistazo (?v= vacío) o como tesis para leer de corrido (?v=tesis).
 */
export function Mayorista({ vista, opcion }: { vista: "ver" | "tesis"; opcion: "online" | "multi" }) {
  const url = (v: string, m: string) => "/pruebas-4" + (v || m ? "?" + [v && `v=${v}`, m && `m=${m}`].filter(Boolean).join("&") : "");
  const v = vista === "tesis" ? "tesis" : "", m = opcion === "multi" ? "multi" : "";
  return (
    <div className="glass my">
      <nav className="seg my-tabs my-op" aria-label="Opción">
        <Link href={url(v, "")} className={opcion === "online" ? "on" : ""} scroll={false}>Online a todo el país</Link>
        <Link href={url(v, "multi")} className={opcion === "multi" ? "on" : ""} scroll={false}>Multimarcas · 2.ª opción</Link>
      </nav>
      <nav className="seg my-tabs" aria-label="Cómo verlo">
        <Link href={url("", m)} className={vista === "ver" ? "on" : ""} scroll={false}>De un vistazo</Link>
        <Link href={url("tesis", m)} className={vista === "tesis" ? "on" : ""} scroll={false}>Tesis para leer</Link>
      </nav>
      {opcion === "multi"
        ? vista === "tesis" ? <TesisVista caps={tesisMulti(MULTI)} ey="Segunda opción · multimarcas" titulo="Vender la marca demo en multimarcas" planilla="Canal mayorista · multimarcas" generado={MULTI.generado} /> : <VistazoMulti />
        : vista === "tesis" ? <TesisVista caps={tesis(DATOS)} ey="Canal mayorista · modelo de negocio" titulo="Vender la marca demo a todo el país" planilla="Canal mayorista" generado={DATOS.generado} /> : <Vistazo />}
    </div>
  );
}

/** Venta masiva al interior: el camino principal, de la hoja «Interior» de la planilla. */
function Interior() {
  const it = DATOS.interior, e = it.embudo, ms = it.meses, an = it.anio;
  const maxV = Math.max(...ms.ventas), maxPct = Math.max(...it.ciudades.map((c) => c.pct));
  const SEM: Record<string, string> = { verde: "Verde", amarillo: "Amarillo", rojo: "Rojo" };
  return (
    <section>
      <div className="sec-h"><h2>Venta masiva al interior</h2></div>
      <p className="sec-sub">El camino principal: clientas de otras ciudades que compran por la tienda online, con envío gratis y cambio sin costo.</p>

      <div className="gl my-emb">
        <span className="my-ey">La prueba de un mes</span>
        <ol>
          <li><b>{fmt.M(e.prueba)}</b><span>de pauta en Instagram</span></li>
          <li><b>{fmt.n(Math.round(e.visitas))}</b><span>visitas a la tienda online ({fmt.M(P.cpc)} cada una)</span></li>
          <li><b>{fmt.n(Math.round(e.ventas))}</b><span>ventas nuevas (compra el {fmt.p(P.conv, 1)})</span></li>
          <li className="fin"><b>{fmt.M(e.cpv)}</b><span>cuesta cada venta</span></li>
        </ol>
        <p>Si sale así, el mes deja <b>{fmt.M(e.res)}</b> después de pagar la pauta. Lo que hay que medir es el último número: <b>cuánto cuesta de verdad cada venta nueva</b>.</p>
      </div>

      <div className="my-sem">
        {it.semaforo.map((x, i) => (
          <div key={x.color} className={`gl ${x.color}`}>
            <i /><b>{SEM[x.color]}</b>
            <small>{i === 2 ? "más de" : "hasta"} {fmt.M(x.hasta)} por venta</small>
            <span>{x.accion}</span>
          </div>
        ))}
      </div>

      <h3 className="my-h3">Dónde poner la pauta</h3>
      <div className="gl my-ci">
        {it.ciudades.map((c) => (
          <div key={c.ciudad} className="my-cr">
            <span className="n"><b>{c.ciudad}</b><small>{c.region} · envío {fmt.ars(c.env)}</small></span>
            <span className="b"><i style={{ width: `${(c.pct / maxPct) * 100}%` }} /></span>
            <span className="v">{fmt.p(c.pct)}<small>~{fmt.n(Math.round(c.ventas))} {Math.round(c.ventas) === 1 ? "venta" : "ventas"}</small></span>
          </div>
        ))}
      </div>
      <p className="note">Envío promedio pesado por la pauta: {fmt.ars(P.envOn)} por venta. La distribución por ciudades es un supuesto ficticio de este modelo.</p>

      <h3 className="my-h3">El primer año, mes a mes</h3>
      <div className="gl my-anio">
        <div className="my-barras" role="img" aria-label={`Ventas por mes: de ${ms.ventas[0]} a ${Math.round(ms.ventas[11])}`}>
          {ms.ventas.map((v, i) => (
            <div key={i} className="col" title={`Mes ${i + 1}: ${ms.nuevas[i]} nuevas + ${ms.recompras[i].toLocaleString("es-AR", { maximumFractionDigits: 1 })} recompras · ${fmt.M(ms.res[i])}`}>
              <span className="pila" style={{ height: `${(v / maxV) * 100}%` }}>
                <i className="rc" style={{ flexGrow: ms.recompras[i] }} /><i className="nv" style={{ flexGrow: ms.nuevas[i] }} />
              </span>
              <small>{i + 1}</small>
            </div>
          ))}
        </div>
        <div className="my-rep-ley"><span><i className="nv" />Clientas nuevas (con pauta)</span><span><i className="rc" />Vuelven a comprar (sin pauta)</span></div>
        <div className="my-anio-n">
          <div><b>{fmt.n(an.nuevas)}</b><span>clientas nuevas</span></div>
          <div><b>{fmt.M(an.pauta)}</b><span>de pauta en el año</span></div>
          <div className="ok"><b>+{fmt.M(an.res)}</b><span>deja el año</span></div>
        </div>
      </div>
      <p className="note">Arranca con la prueba (6 por mes), sube a 12 y desde el mes 5 va a 24 ventas nuevas por mes. Cada clienta nueva deja {fmt.M(it.ltv)} en el año contando que una de cada {Math.round(1 / P.recompra)} vuelve a comprar. Por eso, aun pagando hasta {fmt.M(it.cacMax)} de pauta por venta, deja más que vender a una revendedora.</p>
    </section>
  );
}

function Vistazo() {
  const a = DATOS.prom, c = DATOS.comp;
  const [camino, setCamino] = useState<"dir" | "rev">("dir");
  const [preset, setPreset] = useState(1);
  const [dir, setDir] = useState<DirectoT>({ vmes: DATOS.directo[1].vmes, cac: DATOS.directo[1].cacE });
  const [rev, setRev] = useState<RevenT>({ nrev: DATOS.reven[1].nrev, xr: DATOS.reven[1].xr });
  const [desc, setDesc] = useState(P.descRev);
  const base = useMemo(() => porModelo(BASE, P), []);
  const pr = useMemo(() => promedio(porModelo(BASE, { ...P, descRev: desc })), [desc]);
  const r = camino === "dir" ? directo(dir, pr, P) : reven(rev, pr, P);
  const filas = camino === "dir" ? DATOS.directo : DATOS.reven;
  const maxRes = Math.max(...DATOS.directo.map((e) => e.resMes), ...DATOS.reven.map((e) => e.resMes));
  const van = base.filter((m) => m.va).sort((p, q) => q.dejaOn - p.dejaOn), noVan = base.filter((m) => !m.va).sort((p, q) => q.dejaOn - p.dejaOn);
  const maxDeja = Math.max(...base.map((m) => Math.max(m.dejaOn, m.dejaRev)));
  const elegir = (i: number) => {
    setPreset(i);
    if (camino === "dir") setDir({ vmes: DATOS.directo[i].vmes, cac: DATOS.directo[i].cacE });
    else { setRev({ nrev: DATOS.reven[i].nrev, xr: DATOS.reven[i].xr }); setDesc(P.descRev); }
  };
  const cambiarCamino = (k: "dir" | "rev") => { setCamino(k); setPreset(1); setDir({ vmes: DATOS.directo[1].vmes, cac: DATOS.directo[1].cacE }); setRev({ nrev: DATOS.reven[1].nrev, xr: DATOS.reven[1].xr }); setDesc(P.descRev); };

  return (
    <>
      <section className="gl my-hero">
        <span className="my-ey">La idea</span>
        <h2 className="my-h2">Vender a todo el país desde la tienda online, sin multimarcas</h2>
        <Reparto t="Hoy, en el showroom o en la tienda online" partes={[["fab", "Fábrica", a.fab], ["otr", "Cobro y envío", a.pvp - a.fab - a.dejaMin], ["gana", "Marca demo", a.dejaMin]]} total={a.pvp} />
        <Reparto t="Directo a una clienta de otra ciudad" partes={[["fab", "Fábrica", a.fab], ["otr", "Envío, cambios y cobro", a.onCom + a.onEnv + a.onFal], ["tie", "Pauta", a.onCac], ["gana", "Marca demo", a.dejaOn]]} total={a.pvp} />
        <Reparto t="Con una revendedora" partes={[["tie", "La revendedora", a.pvp - a.rev], ["fab", "Fábrica", a.fab], ["otr", "Cobro", a.revCob], ["gana", "Marca demo", a.dejaRev]]} total={a.pvp} />
        <p className="my-lead">De un vestido de {fmt.M(a.pvp)}, a la marca demo le quedan <b>{fmt.M(a.dejaOn)}</b> vendiéndolo directo a otra ciudad (pagando envío gratis y pauta) o <b>{fmt.M(a.dejaRev)}</b> con una revendedora. Una multimarca (segunda opción) dejaría {fmt.M(a.dejaMay)}.</p>
      </section>

      <div className="my-tres">
        <div className="gl my-num q3"><b>{fmt.M(a.dejaOn)}</b><span>deja un vestido directo a otra ciudad</span></div>
        <div className="gl my-num q2"><b>{fmt.M(a.dejaRev)}</b><span>deja con una revendedora</span></div>
        <div className="gl my-num q1"><b>{van.length} de {base.length}</b><span>modelos van a todo el país</span></div>
      </div>

      <Interior />


      <section>
        <div className="sec-h"><h2>¿Y las multimarcas?</h2></div>
        <p className="sec-sub">En este escenario ficticio quedan como segunda opción: la marca busca cuidar el precio, la experiencia y la relación con sus clientas. <Link href="/pruebas-4?m=multi">Ver la segunda opción →</Link></p>
        <div className="my-reglas">
          {NO_MULTI.map(([k, t, d]) => <div key={t} className="gl my-regla no"><i><Ico k={k} /></i><b>{t}</b><span>{d}</span></div>)}
        </div>
      </section>

      <section>
        <div className="sec-h"><h2>Dos caminos</h2></div>
        <p className="sec-sub">Por mes, en una temporada de 6 meses. Se pueden hacer juntos.</p>
        <div className="my-modo">
          <button type="button" className={camino === "dir" ? "on" : ""} onClick={() => cambiarCamino("dir")}>Directo a la clienta</button>
          <button type="button" className={camino === "rev" ? "on" : ""} onClick={() => cambiarCamino("rev")}>Revendedoras online</button>
        </div>
        <p className="note">{camino === "dir"
          ? "Clientas de cualquier ciudad compran por la tienda online, con envío gratis y cambio sin costo. Cada venta nueva cuesta pauta."
          : `Estilistas y showrooms en casa, por invitación, compran con ${fmt.p(P.descRev)} de descuento, pagan al pedir y venden al mismo precio que la marca demo.`}</p>
        <div className="my-caminos">
          {filas.map((e, i) => {
            const n = "vmes" in e ? e.vmes : e.nrev;
            return (
              <button key={e.nombre} type="button" className={`gl my-cam${preset === i ? " on" : ""}`} onClick={() => elegir(i)}>
                <small>{CAMINOS[i]}</small>
                <Iconos n={n} k={camino === "dir" ? "caja" : "clienta"} />
                <span className="t">{"vmes" in e ? `${e.vmes} ventas nuevas por mes · ${fmt.M(e.pautaMes)} de pauta` : `${e.nrev} revendedoras · ${e.xr} prendas cada una por temporada`}</span>
                <b>+{fmt.M(e.resMes)}</b>
                <span className="bar"><i style={{ width: `${(e.resMes / maxRes) * 100}%` }} /></span>
                <span className="f">+{Math.round(e.prodMes)} prendas por mes · {fmt.M(e.capital)} en stock</span>
              </button>
            );
          })}
        </div>
        <details className="gl my-ajuste">
          <summary>Probar con otros números</summary>
          <div className="my-ctl">
            {camino === "dir" ? <>
              <Rango l="Ventas nuevas por mes" v={dir.vmes} min={2} max={80} step={1} f={String} on={(v) => { setDir({ vmes: v, cac: dir.cac === cacDe(dir.vmes) ? cacDe(v) : dir.cac }); setPreset(-1); }} />
              <Rango l="Pauta por cada venta nueva" v={dir.cac} min={10000} max={200000} step={5000} f={fmt.M} on={(v) => { setDir({ ...dir, cac: v }); setPreset(-1); }} />
            </> : <>
              <Rango l="Revendedoras" v={rev.nrev} min={1} max={30} step={1} f={String} on={(v) => { setRev({ ...rev, nrev: v }); setPreset(-1); }} />
              <Rango l="Prendas por revendedora en la temporada" v={rev.xr} min={3} max={30} step={1} f={String} on={(v) => { setRev({ ...rev, xr: v }); setPreset(-1); }} />
              <Rango l="Descuento a revendedoras" v={desc} min={0.2} max={0.5} step={0.05} f={(v) => fmt.p(v)} on={(v) => { setDesc(v); setPreset(-1); }} />
            </>}
            <div className={`my-big${r.res < 0 ? " no" : ""}`}><small>Queda por mes</small><strong>{sM(r.resMes)}</strong>
              <span>{fmt.M(r.deja)} por vestido · {fmt.n(r.q)} vestidos en la temporada · +{fmt.n(r.prodMes)} prendas por mes · {fmt.M(r.capital)} en stock{camino === "rev" && desc !== P.descRev ? ` · ${pr.n} modelos van` : ""}</span></div>
          </div>
        </details>
      </section>

      <section>
        <div className="sec-h"><h2>¿Directo o revendedoras?</h2></div>
        <p className="sec-sub">Con las mismas {c.q[0]} prendas por temporada ({Math.round(c.q[0] / P.meses)} por mes).</p>
        <div className="my-on">
          {c.nombres.map((n, i) => (
            <div key={n} className={`gl my-onc${i === 0 ? " top" : ""}${i === 2 ? " fuera" : ""}`}>
              <small>{n}</small>
              <b>+{fmt.M(c.resMes[i])}</b><span>por mes</span>
              <span className="bar"><i style={{ width: `${(c.resMes[i] / Math.max(...c.resMes)) * 100}%` }} /></span>
              <em>{fmt.M(c.deja[i])} por vestido · {c.dias[i] ? `cobra a ${c.dias[i]} días` : "cobra al vender"}</em>
              <span className="d">{[`Gana mientras cada venta nueva cueste menos de ${fmt.M(c.cacEmpate)} en pauta. La clienta queda en la marca demo.`, "Sin pauta por venta ni envío. La clienta es de la revendedora.", "Segunda opción: la tienda pone el precio y la experiencia."][i]}</span>
            </div>
          ))}
        </div>
        <p className="note">Este caso ficticio compara el canal directo y las revendedoras. Cambiá los supuestos de volumen y adquisición para observar cómo varía el resultado de cada alternativa.</p>
      </section>

      <section>
        <div className="sec-h"><h2>Las reglas del lujo online</h2></div>
        <p className="sec-sub">Para que una clienta de otra ciudad compre sin probarse y vuelva.</p>
        <div className="my-reglas">
          {REGLAS.map(([k, t, d]) => <div key={k} className="gl my-regla"><i><Ico k={k} /></i><b>{t}</b><span>{d}</span></div>)}
        </div>
      </section>

      <section>
        <div className="sec-h"><h2>Qué vestidos llevar</h2></div>
        <p className="sec-sub">Lo que le queda a la marca demo por cada vestido, directo a otra ciudad y con revendedora. Van los que a la revendedora le dejan al menos el {fmt.p(P.umbral)}.</p>
        <div className="gl my-rank dos">
          <div className="my-rk cab"><span /><span /><span className="v">Directo</span><span className="v">Revend.</span></div>
          {[...van, ...noVan].map((m, i) => (
            <Fragment key={m.modelo}>
              {i === van.length && <div className="my-corte"><span>no van</span></div>}
              <div className={`my-rk${m.va ? "" : " fuera"}`}>
                <span className="n">{m.modelo}</span>
                <span className="b"><i style={{ width: `${Math.max(1, (Math.max(0, m.dejaOn) / maxDeja) * 100)}%` }} /><i className="rv" style={{ width: `${Math.max(1, (Math.max(0, m.dejaRev) / maxDeja) * 100)}%` }} /></span>
                <span className="v">{m.dejaOn < 0 ? "pierde" : fmt.M(m.dejaOn)}</span>
                <span className="v rv">{m.dejaRev < 0 ? "pierde" : fmt.M(m.dejaRev)}</span>
              </div>
            </Fragment>
          ))}
        </div>
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
          {DATOS.supuestos.filter((s) => !OCULTOS.includes(s.k)).map((s) => (
            <li key={s.k} className={ESTADO[s.estado]}><i /><span>{LLANO[s.k] || s.t}</span><b>{s.k === "cpc" ? fmt.ars(s.v) : s.v < 1 ? fmt.p(s.v, s.v * 100 % 1 ? 1 : 0) : s.v >= 1000 ? fmt.M(s.v) : `${s.v}${s.k === "mesesStock" ? " meses" : ""}`}</b></li>
          ))}
        </ul>
        <p className="my-xls"><a href="/mayorista/canal-mayorista.xlsx" download="Canal mayorista.xlsx">Bajar la planilla «Canal mayorista» ↓</a><span>Con todas las cuentas, vestido por vestido.</span></p>
      </section>
    </>
  );
}
