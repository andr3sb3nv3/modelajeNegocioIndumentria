"use client";
import { useEffect, useRef, useState } from "react";
import { fmt } from "@/lib/fmt";

/**
 * Prueba estética 2: línea del tiempo de los últimos días, siempre parada en el ahora.
 * Arriba lo que fue pasando (datos ficticios: app, charlas, planillas de Ventas y Gastos, Carga de datos maestro),
 * abajo lo que viene (vencimientos de gastos pendientes).
 */
export type TipoAh = "venta" | "online" | "charla" | "stock" | "gasto" | "maestro" | "alerta" | "agenda";
export type EvAh = {
  id: string; f: string; t: number; sinHora?: boolean; tipo: TipoAh; etiqueta?: string;
  titulo: string; detalle?: string; meta?: string; monto?: number; tachado?: boolean;
};
export type DiaAh = { f: string; ventas: number; prendas: number; gastos: number };
type Filtro = "todo" | "ventas" | "charlas" | "stock" | "gastos" | "agenda";

const MIN = 60_000;
const APERTURA = 9, CIERRE = 20;
const TZ = "America/Argentina/Buenos_Aires";
const hhmm = (t: number) => new Intl.DateTimeFormat("es-AR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(t);
const horaDe = (t: number) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(t));
const diaDe = (t: number) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(t);
const mediodia = (f: string) => Date.parse(`${f}T12:00:00-03:00`);
const diaLargo = (f: string) => new Intl.DateTimeFormat("es-AR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(mediodia(f));
const hace = (min: number) => (min < 1 ? "recién" : min < 60 ? `hace ${Math.round(min)} min` : min < 24 * 60 ? `hace ${Math.floor(min / 60)} h` : "");
const enDias = (f: string, hoy: string) => { const d = Math.round((mediodia(f) - mediodia(hoy)) / 864e5); return d <= 0 ? "hoy" : d === 1 ? "mañana" : `en ${d} días`; };
const nombreDia = (f: string, hoy: string) => {
  const d = Math.round((mediodia(hoy) - mediodia(f)) / 864e5);
  return d === 0 ? "Hoy" : d === 1 ? "Ayer" : diaLargo(f);
};

/** «el martes pasado» */
const nombreSemana = (f: string) => `el ${new Intl.DateTimeFormat("es-AR", { timeZone: TZ, weekday: "long" }).format(mediodia(f))} anterior`;
const contra = (a: number, b: number, f: string, que: string) => (b ? `${fmt.var(a, b)} vs ${nombreSemana(f)} (${fmt.M(b)})` : `${nombreSemana(f)[0].toUpperCase()}${nombreSemana(f).slice(1)} no hubo ${que}`);

const FILTROS: [Filtro, string][] = [["todo", "Todo"], ["ventas", "Ventas"], ["charlas", "Charlas y notas"], ["stock", "Stock"], ["gastos", "Gastos"], ["agenda", "Lo que viene"]];
const pasa = (f: Filtro, e: EvAh) =>
  f === "todo" || (f === "ventas" ? e.tipo === "venta" || e.tipo === "online"
    : f === "charlas" ? e.tipo === "charla" || e.tipo === "maestro" || e.tipo === "alerta"
    : f === "stock" ? e.tipo === "stock" : f === "gastos" ? e.tipo === "gasto" : e.tipo === "agenda");
const ETIQUETA: Record<TipoAh, string> = { venta: "Venta", online: "Venta online", charla: "Charla", stock: "Stock", gasto: "Gasto", maestro: "Maestro", alerta: "Alerta", agenda: "Vence" };

/** `horaAHora`: un solo día con todas sus horas (las vacías también), de la apertura hasta el ahora. */
/** `cmp`: el mismo día de la semana anterior, para comparar lo vendido y gastado. */
export function Ahora({ eventos, proximos, dias, avisos, horaAHora = false, cmp }: { eventos: EvAh[]; proximos: EvAh[]; dias: DiaAh[]; avisos: string[]; horaAHora?: boolean; cmp?: DiaAh }) {
  const [now, setNow] = useState<number | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todo");
  const [lejos, setLejos] = useState<"arriba" | "abajo" | null>(null);
  const nowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(id);
  }, []);
  // Al abrir, la línea se para en el ahora
  const listo = now !== null;
  useEffect(() => {
    if (listo) requestAnimationFrame(() => nowRef.current?.scrollIntoView({ block: "center" }));
  }, [listo]);
  useEffect(() => {
    const el = nowRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([x]) => setLejos(x.isIntersecting ? null : x.boundingClientRect.top < 0 ? "arriba" : "abajo"), { rootMargin: "-80px 0px -40px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [listo, filtro]);

  if (now === null) return <div className="ah-sk" aria-busy="true" />;

  const hoy = diaDe(now);
  const evs = eventos.filter((e) => pasa(filtro, e));
  const prox = proximos.filter((e) => pasa(filtro, e));
  const dHoy = horaAHora ? dias[dias.length - 1] : dias.find((d) => d.f === hoy);
  const elDia = !horaAHora || dHoy?.f === hoy ? "hoy" : "ese día";
  const charlasHoy = eventos.filter((e) => e.f === hoy && (e.tipo === "charla" || e.tipo === "maestro")).length;
  const proxima = proximos[0];
  const semana = dias.reduce((s, d) => s + d.ventas, 0);

  return (
    <div className={`glass ah${horaAHora ? " ah-dia1" : ""}`}>
      <div className="ah-top">
        <div className="ah-clock">
          <span className="ah-dot" aria-hidden />
          <b>{hhmm(now)}</b>
          <span>{diaLargo(hoy)}</span>
        </div>
      </div>

      {avisos.map((a) => <p key={a} className="ah-aviso">{a}</p>)}

      <div className="ah-kpis">
        <div className="gl ah-k q1"><b>{fmt.M(dHoy?.ventas || 0)}</b><span>vendido {elDia}{dHoy?.prendas ? ` · ${dHoy.prendas} prendas` : ""}</span>
          {cmp && <span className={`ah-vs ${!cmp.ventas ? "" : (dHoy?.ventas || 0) >= cmp.ventas ? "good" : "bad"}`}>{contra(dHoy?.ventas || 0, cmp.ventas, cmp.f, "ventas")}</span>}</div>
        {cmp && <div className="gl ah-k q3"><b>{fmt.M(dHoy?.gastos || 0)}</b><span>en gastos variables {elDia}</span>
          <span className={`ah-vs ${!cmp.gastos ? "" : (dHoy?.gastos || 0) <= cmp.gastos ? "good" : "bad"}`}>{contra(dHoy?.gastos || 0, cmp.gastos, cmp.f, "gastos variables")}</span></div>}
        <div className={`gl ah-k q2${cmp ? " ah-full" : ""}`}>{horaAHora
          ? <><b>{eventos.length}</b><span>{eventos.length === 1 ? "cosa anotada" : "cosas anotadas"} en el día</span></>
          : <><b>{fmt.M(semana)}</b><span>últimos {dias.length} días · {charlasHoy} {charlasHoy === 1 ? "nota" : "notas"} hoy</span></>}</div>
        {proxima && (
          <div className="gl ah-k ah-next">
            <span className="ah-nl">Lo próximo · {enDias(proxima.f, hoy)}</span>
            <b>{proxima.titulo}</b>
            <span>{[proxima.detalle, proxima.monto ? fmt.ars(proxima.monto) : ""].filter(Boolean).join(" · ")}</span>
          </div>
        )}
      </div>

      {/* Hora a hora (Inicio › Día) se ve todo junto, sin filtros */}
      {!horaAHora && <div className="ah-chips" role="tablist" aria-label="Filtrar">
        {FILTROS.map(([k, t]) => (
          <button key={k} role="tab" aria-selected={filtro === k} className={filtro === k ? "on" : ""} onClick={() => setFiltro(k)}>{t}</button>
        ))}
      </div>}

      {dias.map((d) => {
        const del = evs.filter((e) => e.f === d.f);
        const esHoy = d.f === hoy;
        if (!del.length && !esHoy) return null;
        const enElDia = del.filter((e) => e.sinHora);
        const conHora = del.filter((e) => !e.sinHora).sort((a, b) => a.t - b.t);
        const conEv = [...new Set([...conHora.map((e) => horaDe(e.t)), ...(esHoy ? [horaDe(now)] : [])])].sort((a, b) => a - b);
        // Hora a hora: desde la apertura (o lo primero anotado) hasta el ahora; un día pasado, hasta el cierre
        // Hoy se ven siempre al menos 3 horas antes y 3 después del ahora
        const hAhora = horaDe(now);
        const desde = Math.max(0, Math.min(APERTURA, conEv[0] ?? APERTURA, esHoy ? hAhora - 3 : 24)), hasta = esHoy ? Math.min(23, hAhora + 3) : Math.max(CIERRE, conEv[conEv.length - 1] ?? CIERRE);
        const horas = horaAHora ? [...new Set([...conEv, ...Array.from({ length: Math.max(0, hasta - desde + 1) }, (_, i) => desde + i)])].sort((a, b) => a - b) : conEv;
        return (
          <section key={d.f} className={`ah-day${esHoy ? " hoy" : ""}`}>
            <div className="ah-dh">
              <b>{nombreDia(d.f, hoy)}</b>
              <span>{[d.ventas ? `${fmt.M(d.ventas)} vendido` : "", d.gastos ? `${fmt.M(d.gastos)} en gastos` : ""].filter(Boolean).join(" · ") || "sin números cargados"}</span>
            </div>
            <ol className="ah-tl">
              {enElDia.length > 0 && (
                <li className="ah-h">
                  <div className="ah-hh">{horaAHora ? "en el día" : "día"}</div>
                  {enElDia.map((e) => <Item key={e.id} e={e} now={now} />)}
                </li>
              )}
              {horas.map((h) => {
                const ev = conHora.filter((e) => horaDe(e.t) === h);
                const cur = esHoy && h === hAhora, futura = esHoy && h > hAhora;
                return (
                  <li key={h} className={`ah-h${cur ? " cur" : ""}${!ev.length ? " vac" : ""}${futura ? " fut" : ""}`}>
                    <div className="ah-hh">{String(h).padStart(2, "0")}:00</div>
                    {ev.map((e) => <Item key={e.id} e={e} now={now} />)}
                    {!ev.length && !cur && <div className="ah-nada">{futura ? "Por venir" : "Nada anotado"}</div>}
                    {cur && (
                      <div ref={nowRef} className="ah-now" aria-label={`Ahora, ${hhmm(now)}`}>
                        <span className="ah-nowt">Ahora · {hhmm(now)}</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            {esHoy && !del.length && <p className="ah-vacio">Hoy todavía no se cargó nada{filtro !== "todo" ? " de esto" : ""}.</p>}
          </section>
        );
      })}

      {lejos && (
        <button className="ah-volver" onClick={() => nowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}>
          {lejos === "arriba" ? "↑" : "↓"} Volver al ahora
        </button>
      )}

      {(filtro === "todo" || filtro === "agenda" || filtro === "gastos") && prox.length > 0 && (
        <section className="ah-prox">
          <div className="sec-h"><h2>Lo que viene</h2></div>
          {[...new Set(prox.map((e) => e.f))].map((f) => (
            <div key={f} className="ah-dia">
              <div className="ah-dl">{diaLargo(f)} <span>· {enDias(f, hoy)}</span></div>
              {prox.filter((e) => e.f === f).map((e) => <Item key={e.id} e={e} now={now} />)}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function Item({ e, now }: { e: EvAh; now: number }) {
  const fut = e.tipo === "agenda";
  const cuando = e.sinHora || fut ? "" : hace((now - e.t) / MIN);
  return (
    <div className={`gl ah-e t-${e.tipo}${fut ? " fut" : ""}${e.tachado ? " x" : ""}`}>
      <div className="ah-t">
        <b>{e.sinHora ? "" : fut ? "—" : hhmm(e.t)}</b>
      </div>
      <div className="ah-b">
        <div className="ah-l1">
          <span className="ah-tag">{e.etiqueta || ETIQUETA[e.tipo]}</span>
          {cuando && <span className="ah-when">{cuando}</span>}
          {e.monto ? <span className="ah-m">{e.tipo === "gasto" ? "−" : ""}{fmt.ars(e.monto)}</span> : null}
        </div>
        <div className="ah-ti">{e.titulo}</div>
        {e.detalle && <div className="ah-d">{e.detalle}</div>}
        {e.meta && <div className="ah-q">{e.meta}</div>}
      </div>
    </div>
  );
}
