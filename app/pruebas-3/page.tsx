import { Equilibrio } from "@/components/Equilibrio";
import { ErrorBox, Page } from "@/components/Page";
import { getData } from "@/lib/data";
import { equilibrio } from "@/lib/equilibrio";
import { getExtra } from "@/lib/extra";
import { CANALES, colorCanal, fechaCorta, fmt, grupoCanal, hoyBA, mesLargo, ym } from "@/lib/fmt";
import { sumarDias } from "@/lib/semana";
import { claveModelo, stockEnVivo } from "@/lib/stock";

export const dynamic = "force-dynamic";

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const dow = (iso: string) => new Date(iso + "T12:00:00Z").getUTCDay();
const unAnioAntes = (iso: string) => `${Number(iso.slice(0, 4)) - 1}${iso.slice(4)}`;

/** Prueba estética 3: «Pulso Marca demo». Datos ficticios; estética de vidrio + Apple + neumorfismo. Sólo la dueña. */
export default async function Prueba3() {
  let d;
  try { d = await getData(); } catch (e) { return <ErrorBox e={e} />; }
  const hoy = hoyBA(), mes = ym(hoy), desde = mes + "-01";
  const en = (a: string, b: string) => d.ventas.filter((v) => v.f >= a && v.f <= b);

  // Anillos: este mes contra los mismos días del año pasado, y si las ventas cubren los gastos
  const vm = en(desde, hoy), va = en(unAnioAntes(desde), unAnioAntes(hoy));
  const monto = vm.reduce((s, v) => s + v.monto, 0), montoA = va.reduce((s, v) => s + v.monto, 0);
  const prendas = vm.reduce((s, v) => s + v.prendas, 0), prendasA = va.reduce((s, v) => s + v.prendas, 0);
  const gastos = d.gastos.filter((g) => g.f >= desde && g.f <= hoy).reduce((s, g) => s + g.imp, 0);
  const anillos = [
    { k: "r1", n: "Facturación", v: montoA ? monto / montoA : 0, l: fmt.M(monto), s: montoA ? `${fmt.p(monto / montoA)} del año pasado (${fmt.M(montoA)})` : "Sin datos del año pasado" },
    { k: "r2", n: "Prendas", v: prendasA ? prendas / prendasA : 0, l: fmt.n(prendas), s: prendasA ? `${fmt.p(prendas / prendasA)} del año pasado (${fmt.n(prendasA)})` : "Sin datos del año pasado" },
    { k: "r3", n: "Cubre gastos", v: gastos ? monto / gastos : monto ? 1 : 0, l: gastos ? fmt.p(monto / gastos) : "—", s: `Gastos del mes ${fmt.M(gastos)}` },
  ];

  // Ritmo: 12 semanas × 7 días
  const lunes = sumarDias(hoy, -((dow(hoy) + 6) % 7));
  const inicio = sumarDias(lunes, -77);
  const porDia = new Map<string, number>();
  for (const v of en(inicio, hoy)) porDia.set(v.f, (porDia.get(v.f) || 0) + v.monto);
  const maxDia = Math.max(1, ...porDia.values());
  const semanas = Array.from({ length: 12 }, (_, w) => Array.from({ length: 7 }, (_, i) => sumarDias(inicio, w * 7 + i)));
  const promDow = [1, 2, 3, 4, 5, 6, 0].map((k) => {
    const dias = semanas.flat().filter((f) => f <= hoy && dow(f) === k);
    return { k, prom: dias.reduce((s, f) => s + (porDia.get(f) || 0), 0) / Math.max(1, dias.length) };
  });
  const mejor = [...promDow].sort((a, b) => b.prom - a.prom)[0];

  // Mix de canales del mes
  const mix = CANALES.map((c) => ({ c, v: vm.filter((v) => grupoCanal(v.canal) === c).reduce((s, v) => s + v.monto, 0) })).filter((x) => x.v > 0);

  // Podio del mes y hora de reponer (últimos 30 días contra stock)
  const porModelo = (vs: typeof vm) => {
    const m = new Map<string, number>();
    for (const v of vs) if (v.modelo) m.set(v.modelo, (m.get(v.modelo) || 0) + v.prendas);
    return [...m].sort((a, b) => b[1] - a[1]);
  };
  const podio = porModelo(vm).slice(0, 3);
  let stockModelo = new Map<string, number>();
  try {
    const s = await stockEnVivo(d.stock, d.ventas);
    for (const it of s.items) stockModelo.set(claveModelo(it.modelo), (stockModelo.get(claveModelo(it.modelo)) || 0) + Math.max(0, it.q));
    // Lo vendido después del conteo que sólo está en la hoja Ventas (sin talle) también se descuenta
    for (const x of s.sinTalle) stockModelo.set(x.k, Math.max(0, (stockModelo.get(x.k) || 0) - x.q));
  } catch { stockModelo = new Map(); }
  const reponer = porModelo(en(sumarDias(hoy, -29), hoy))
    .filter(([m]) => stockModelo.has(claveModelo(m)))  // los nombres de modelos se normalizan entre Ventas y el conteo
    .map(([m, p]) => { const sem = p / (30 / 7), q = stockModelo.get(claveModelo(m))!; return { m, sem, q, alcanza: sem ? q / sem : 99 }; })
    .sort((a, b) => a.alcanza - b.alcanza).slice(0, 4);

  // Punto de equilibrio: costo de cada vestido (Producción y stock) y fijos (Gastos)
  const x = await getExtra().catch(() => null);
  const eq = equilibrio(d, x, hoy);

  return (
    <Page leido={d.leido} eyebrow="Laboratorio · datos ficticios" title={<>Pulso <em>de la marca</em></>} lede="Cómo late el negocio este mes: contra el año pasado, día por día, modelo por modelo y cuándo empezás a ganar plata.">
      <div className="neo">
        <section className="neo-hero">
          <div className="neo-blob a" aria-hidden /><div className="neo-blob b" aria-hidden />
          <div className="neo-glass">
            <div className="neo-cap">{mesLargo(mes)} · al {fechaCorta(hoy)}</div>
            <div className="neo-rings">
              <svg viewBox="0 0 120 120" className="rings" role="img" aria-label="Anillos del mes">
                {anillos.map((a, i) => {
                  const r = 50 - i * 14, c = 2 * Math.PI * r, p = Math.min(a.v, 1);
                  return (
                    <g key={a.k} className={a.k}>
                      <circle cx="60" cy="60" r={r} className="trk" />
                      <circle cx="60" cy="60" r={r} className="arc" strokeDasharray={c} style={{ ["--off" as string]: c * (1 - p), ["--c" as string]: c, animationDelay: `${i * 120}ms` }} transform="rotate(-90 60 60)" />
                      {a.v > 1 && <circle cx="60" cy="60" r={r} className="arc extra" strokeDasharray={c} style={{ ["--off" as string]: c * (1 - Math.min(a.v - 1, 1)), ["--c" as string]: c, animationDelay: `${600 + i * 120}ms` }} transform="rotate(-90 60 60)" />}
                    </g>
                  );
                })}
              </svg>
              <ul className="neo-leg">
                {anillos.map((a) => (
                  <li key={a.k} className={a.k}><span className="nl-n">{a.n}</span><b>{a.l}</b><span className="nl-s">{a.s}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="neo-card">
          <div className="neo-h"><h2>Ritmo</h2><span>12 semanas</span></div>
          <div className="heat">
            <div className="heat-d">{["L", "M", "M", "J", "V", "S", "D"].map((x, i) => <span key={i}>{x}</span>)}</div>
            <div className="heat-g">
              {semanas.map((w, wi) => (
                <div key={wi} className="heat-w">
                  {w.map((f) => {
                    const v = porDia.get(f) || 0, fut = f > hoy;
                    return <i key={f} className={fut ? "fut" : f === hoy ? "hoy" : ""} style={{ ["--a" as string]: fut ? 0 : Math.sqrt(v / maxDia) }} title={`${fechaCorta(f)} · ${fmt.M(v)}`} />;
                  })}
                </div>
              ))}
            </div>
          </div>
          <p className="neo-note">{porDia.size ? <>El mejor día es el <b>{["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][mejor.k]}</b>: en promedio {fmt.M(mejor.prom)}.</> : "Todavía no hay ventas registradas para comparar los días."}</p>
          <div className="dow">
            {promDow.map((x) => (
              <div key={x.k} className={x.k === mejor.k ? "on" : ""}>
                <span className="dow-b"><i style={{ height: `${Math.round((x.prom / Math.max(1, mejor.prom)) * 100)}%` }} /></span>
                <span>{DIAS[x.k]}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="neo-two">
          <section className="neo-card">
            <div className="neo-h"><h2>Podio</h2><span>prendas del mes</span></div>
            {podio.length ? (
              <div className="podio">
                {[1, 0, 2].map((i) => podio[i] && (
                  <div key={podio[i][0]} className={`pd p${i + 1}`}>
                    <span className="pd-n">{podio[i][0]}</span>
                    <span className="pd-b"><b>{i + 1}</b><span>{podio[i][1]}</span></span>
                  </div>
                ))}
              </div>
            ) : <p className="empty">Todavía no hay ventas este mes.</p>}
          </section>

          <section className="neo-card">
            <div className="neo-h"><h2>Canales</h2><span>{fmt.M(monto)}</span></div>
            <div className="mixbar">{mix.map((x) => <i key={x.c} style={{ flex: x.v, background: colorCanal(x.c) }} />)}</div>
            <ul className="mixleg">
              {mix.map((x) => <li key={x.c}><i style={{ background: colorCanal(x.c) }} />{x.c}<b>{fmt.p(x.v / Math.max(1, monto))}</b></li>)}
            </ul>
          </section>
        </div>

        <section className="neo-card">
          <div className="neo-h"><h2>Hora de reponer</h2><span>al ritmo de los últimos 30 días</span></div>
          {reponer.length ? reponer.map((x) => {
            const tone = x.alcanza < 2 ? "bad" : x.alcanza < 5 ? "warn" : "good";
            return (
              <div key={x.m} className={`rep ${tone}`}>
                <div className="rep-g" style={{ ["--p" as string]: Math.min(1, x.alcanza / 8) }}><b>{x.alcanza >= 20 ? "20+" : x.alcanza < 1 ? "<1" : Math.round(x.alcanza)}</b><span>sem</span></div>
                <div className="rep-t">
                  <b>{x.m}</b>
                  <span>Quedan {fmt.n(x.q)} · se venden {x.sem.toLocaleString("es-AR", { maximumFractionDigits: 1 })} por semana</span>
                </div>
              </div>
            );
          }) : <p className="empty">No pude cruzar ventas con stock.</p>}
        </section>

        <Equilibrio e={eq} hoy={hoy} />
      </div>
    </Page>
  );
}
