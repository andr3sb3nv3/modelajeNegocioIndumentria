import Link from "next/link";
import { Page } from "@/components/Page";
import { Logo } from "@/components/Logo";
import { IAPuntos, VistaHTML } from "@/components/IAVista";
import { IADias, type DiaIA } from "@/components/IADias";
import { CANALES, colorCanal, fmt, hoyBA } from "@/lib/fmt";
import { numerosEnVivo, sumarDias, type Numeros } from "@/lib/semana";
import { itemsIA, type ItemIA, type Mensaje } from "@/lib/ia";

export const dynamic = "force-dynamic";

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const DIAS_LARGOS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const dosD = (n: number) => String(n).padStart(2, "0");
/** Fecha en hora de Buenos Aires (UTC−3, sin horario de verano) */
const enBA = (iso: string) => { const d = new Date(iso); return isNaN(+d) ? null : new Date(d.getTime() - 3 * 3600e3); };
const diaDeISO = (iso: string) => { const ba = enBA(iso); return ba ? ba.toISOString().slice(0, 10) : ""; };
function hora(iso: string) { const ba = enBA(iso); return ba ? `${dosD(ba.getUTCHours())}:${dosD(ba.getUTCMinutes())}` : ""; }
const fechaDia = (dia: string) => new Date(dia + "T12:00:00Z");
function rotuloDia(dia: string) { const d = fechaDia(dia); return `${DIAS_LARGOS[d.getUTCDay()]} ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`; }
const href = (x: ItemIA, q?: string) => `/ia?d=${diaDeISO(x.fecha)}&v=${encodeURIComponent(x.id)}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
const esIA = (q: string) => /^(asistente(?: ia| demo)?|marca demo)$/i.test(q.trim());

/** Para buscar sin importar mayúsculas ni tildes */
const plano = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const textoDe = (x: ItemIA) => plano([x.titulo, x.pedido, ...(x.tipo === "vista"
  ? [x.resumen, ...x.charla.map((m) => m.texto), x.html.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")]
  : [])].join(" "));

/** Lo que se dijo en un pedido: la charla guardada o, si no hay, el pedido; y al final lo que salió, en limpio */
function mensajesDe(x: ItemIA): Mensaje[] {
  const quien = x.tipo === "vista" && x.origen === "rutina" ? "Rutina de la mañana" : (x.tipo === "vista" && x.quien) || "Vos";
  const charla = x.tipo === "vista" && x.charla.length > 0 ? x.charla : [{ quien, texto: x.pedido || x.titulo }];
  return [...charla, { quien: "Marca demo", texto: x.tipo === "vista" ? x.resumen || x.titulo : `Acá está: «${x.titulo}».` }];
}

/** Avatar de quien responde: el sello de Marca demo */
function Avatar() {
  return <span className="ia-av" aria-hidden><Logo size={30} /></span>;
}

function Burbuja({ m, nombre, fuerte }: { m: Mensaje; nombre: boolean; fuerte?: boolean }) {
  return esIA(m.quien)
    ? <div className={`ia-m ia${fuerte ? " fuerte" : ""}`}>{nombre ? <Avatar /> : <span className="ia-av vacio" />}<div>{nombre && <span className="ia-quien">{m.quien}</span>}<p>{m.texto}</p></div></div>
    : <div className="ia-m yo"><div>{nombre && <span className="ia-quien">{m.quien || "Vos"}</span>}<p>{m.texto}</p></div></div>;
}

/** Un tema del día: la hora y el título, lo que muestra en frases cortas (cada una lleva a su parte de la vista) y la charla plegada */
function Tema({ x, on }: { x: ItemIA; on: boolean }) {
  const ms = mensajesDe(x);
  return (
    <div className={`ia-tema${on ? " on" : ""}`}>
      <Link href={href(x)} scroll={false} className="ia-tema-h">
        <span className="h">{hora(x.fecha)}</span>
        <b>{x.titulo}</b>
        <span className="ver">{on ? "En pantalla" : "Ver"}</span>
      </Link>
      {x.tipo === "vista" ? <IAPuntos puntos={x.puntos} on={on} href={href(x)} /> : (
        <Link href={href(x)} scroll={false} className="ia-m-img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={x.src} alt={x.titulo} loading="lazy" />
        </Link>
      )}
      <details className="ia-charla">
        <summary>La charla</summary>
        {ms.map((m, k) => <Burbuja key={k} m={m} nombre={k === 0 || ms[k - 1].quien !== m.quien} fuerte={k === ms.length - 1} />)}
      </details>
    </div>
  );
}

/** Lo que pasó en el negocio ese día: ventas, prendas y gastos en vivo (las mismas cuentas que Inicio) */
function ElDia({ dia, x, antes, error }: { dia: string; x?: Numeros; antes?: Numeros; error: boolean }) {
  const v = x?.ventas || 0, g = x?.gastos || 0;
  const vs = antes?.ventas ? fmt.var(v, antes.ventas) : "";
  return (
    <section className="ia-negocio" aria-label="El día en Marca demo">
      <div className="ia-negocio-h"><b>{rotuloDia(dia)} en Marca demo</b>{error && <span>No pude leer todas las planillas</span>}</div>
      <div className="ia-kpis">
        <div><span>Ventas</span><b>{fmt.M(v)}</b>{vs && <em>{vs} vs {DIAS[fechaDia(dia).getUTCDay()]} anterior</em>}</div>
        <div><span>Prendas</span><b>{fmt.n(x?.prendas || 0)}</b></div>
        <div><span>Gastos variables</span><b>{fmt.M(g)}</b><em>{x?.gastosN || 0} {x?.gastosN === 1 ? "pago" : "pagos"}{x?.fijos ? ` · ${fmt.M(x.fijos)} fijos` : ""}</em></div>
      </div>
      {v > 0 && (
        <div className="ia-canales" aria-label="Ventas por canal">
          {CANALES.filter((c) => x?.canales[c]).map((c) => (
            <span key={c} style={{ flex: x!.canales[c], background: colorCanal(c) }} title={`${c}: ${fmt.M(x!.canales[c])}`} />
          ))}
        </div>
      )}
      {(x?.ventasL.length || x?.gastosL.length) ? (
        <details className="ia-detalle">
          <summary>Ver el detalle del día</summary>
          <div className="ia-listas">
            {!!x?.ventasL.length && <ul>{x.ventasL.slice(0, 12).map((y, k) => <li key={k}><span>{y.modelo || "Venta"} <em>{y.canal}</em></span><b>{fmt.ars(y.monto)}</b></li>)}</ul>}
            {!!x?.gastosL.length && <ul>{x.gastosL.slice(0, 12).map((y, k) => <li key={k}><span>{y.prov || "Gasto"} <em>{y.cat}</em></span><b>{fmt.ars(y.imp)}</b></li>)}</ul>}
          </div>
        </details>
      ) : <p className="ia-nada">Sin ventas ni gastos cargados ese día.</p>}
    </section>
  );
}

/**
 * Interacción con Asistente IA: lo que se charla con ellos queda como archivo en el repo (data/ia/vistas,
 * public/ia/imagenes) y acá se ve día por día, junto con lo que pasó en el negocio ese día. El calendario va a
 * cualquier fecha (?d=AAAA-MM-DD); ?v= elige una vista y ?q= busca en todas las charlas.
 */
export default async function Interaccion({ searchParams }: { searchParams: Promise<{ d?: string; v?: string; q?: string; p?: string }> }) {
  const { d, v, q: qCrudo, p } = await searchParams;
  const q = (qCrudo || "").trim();
  const hoy = hoyBA();
  const items = await itemsIA(); // del más nuevo al más viejo

  const porDia = new Map<string, ItemIA[]>();
  for (const x of items) { const k = diaDeISO(x.fecha); if (k) porDia.set(k, [...(porDia.get(k) || []), x]); }
  const pedido = items.find((x) => x.id === v);
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(d || "") ? d! : pedido ? diaDeISO(pedido.fecha) : hoy;
  const delDia = [...(porDia.get(dia) || [])].reverse(); // en orden de la charla

  // Tira de tres semanas alrededor del día elegido; las flechas la corren de a dos semanas
  const dias: DiaIA[] = Array.from({ length: 21 }, (_, k) => {
    const f = sumarDias(dia, k - 17), t = fechaDia(f);
    return { dia: f, dow: DIAS[t.getUTCDay()], num: t.getUTCDate(), mes: MESES[t.getUTCMonth()], temas: [...(porDia.get(f) || [])].reverse().map((x) => x.titulo), on: !q && f === dia, hoy: f === hoy };
  });

  // Lo que pasó en el negocio ese día (y el mismo día de la semana anterior, para comparar)
  const errores: string[] = [];
  const nums = await numerosEnVivo(sumarDias(dia, -7), dia, errores).catch(() => { errores.push("x"); return new Map<string, Numeros>(); });

  // Búsqueda: en títulos, pedidos, charlas y en el texto de las vistas
  const encontrados = q ? items.filter((x) => plano(q).split(/\s+/).every((p) => textoDe(x).includes(p))) : [];

  const lista = q ? encontrados : delDia;
  const sel = lista.find((x) => x.id === v) || (q ? lista[0] : delDia[delDia.length - 1]);
  const i = sel ? lista.indexOf(sel) : -1;
  const foco = sel?.tipo === "vista" ? sel.puntos[Number(p)]?.ancla : undefined;
  const antes = i > 0 ? lista[i - 1] : undefined, despues = i >= 0 ? lista[i + 1] : undefined;

  return (
    <Page ancho leido={new Date().toISOString()} eyebrow="Marca demo" title={<>Interacción con <em>Asistente IA</em></>} lede="Conversaciones ficticias de ejemplo, día por día, al lado de los datos de demostración del negocio.">
      <div className="ia">
        <section className="ia-top" aria-label="Días">
          <IADias dias={dias} dia={dia} hoy={hoy} antes={sumarDias(dia, -14)} despues={sumarDias(dia, 14)} />
          <form className="ia-buscar" action="/ia" role="search">
            <svg viewBox="0 0 24 24" aria-hidden><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
            <input name="q" defaultValue={q} placeholder="¿Qué día hablamos de…?" aria-label="Buscar en las charlas" />
            {q && <Link href={`/ia?d=${dia}`} className="ia-buscar-x" aria-label="Limpiar búsqueda">×</Link>}
          </form>
        </section>

        <section className="ia-chat" aria-label={q ? "Resultados" : "Temas del día"}>
          {!q && <ElDia dia={dia} x={nums.get(dia)} antes={nums.get(sumarDias(dia, -7))} error={errores.length > 0} />}
          {q ? (
            <>
              <div className="ia-chat-h"><b>{encontrados.length ? `${encontrados.length} ${encontrados.length === 1 ? "charla habla" : "charlas hablan"} de «${q}»` : `No encontré «${q}»`}</b></div>
              {encontrados.map((x) => (
                <Link key={x.id} href={href(x, q)} scroll={false} className={`ia-res${x.id === sel?.id ? " on" : ""}`}>
                  <span className="f">{rotuloDia(diaDeISO(x.fecha))} · {hora(x.fecha)}</span>
                  <b>{x.titulo}</b>
                  {x.tipo === "vista" && x.resumen && <span className="r">{x.resumen}</span>}
                </Link>
              ))}
            </>
          ) : delDia.length ? (
            <>
              <div className="ia-chat-h"><b>Lo que hablamos</b><span>{delDia.length} {delDia.length === 1 ? "tema" : "temas"}</span></div>
              {delDia.map((x) => <Tema key={x.id} x={x} on={x.id === sel?.id} />)}
            </>
          ) : (
            <>
              <div className="ia-chat-h"><b>Lo que hablamos</b><span>sin charlas</span></div>
              <Burbuja m={{ quien: "Marca demo", texto: dia > hoy ? "Este día todavía no llegó." : "Ese día no charlamos. Arriba está lo que pasó en el negocio." }} nombre />
            </>
          )}
        </section>

        <div className="ia-der">
        {sel && (
          <section className="ia-stage">
            <div className="ia-stage-h">
              <span className="ia-luces" aria-hidden><i /><i /><i /></span>
              <b>{sel.titulo}</b>
              {lista.length > 1 && (
                <nav className="ia-nav" aria-label="Otras vistas">
                  {antes ? <Link href={href(antes, q)} scroll={false} aria-label="Anterior">‹</Link> : <span>‹</span>}
                  <em>{i + 1}/{lista.length}</em>
                  {despues ? <Link href={href(despues, q)} scroll={false} aria-label="Siguiente">›</Link> : <span>›</span>}
                </nav>
              )}
            </div>
            {sel.tipo === "vista" ? <VistaHTML html={sel.html} foco={foco} /> : (
              <figure className="ia-img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sel.src} alt={sel.pedido || sel.titulo} />
                <figcaption>
                  <span>{rotuloDia(diaDeISO(sel.fecha))} · {hora(sel.fecha)}</span>
                  <a href={sel.src} download>Descargar</a>
                </figcaption>
              </figure>
            )}
            {sel.tipo === "vista" && sel.fuentes.length > 0 && (
              <div className="ia-fuentes">
                <span>Fuentes</span>
                {sel.fuentes.map((f, k) => f.url
                  ? <a key={k} href={f.url} target="_blank" rel="noreferrer">{f.titulo}</a>
                  : <em key={k}>{f.titulo}</em>)}
              </div>
            )}
          </section>
        )}
        </div>
      </div>
    </Page>
  );
}
