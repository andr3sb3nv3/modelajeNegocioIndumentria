import { agrupar, OFF_CONTADO, type Grupo, type VentaPL } from "@/lib/precioLleno";
import { colorCanal, fmt, grupoCanal } from "@/lib/fmt";
import { Section } from "./ui";

const pct = (a: number, b: number) => (b ? a / b : 0);
const prom = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

function Barra({ g }: { g: Grupo }) {
  return (
    <div className="pl-bar" role="img" aria-label={`${fmt.p(pct(g.qLleno, g.q))} de las prendas a precio lleno`}>
      <i className="ok" style={{ flexGrow: g.qLleno }} />
      <i className="no" style={{ flexGrow: g.q - g.qLleno }} />
    </div>
  );
}

/** Venta a precio lleno: qué parte de cada temporada se vendió sin descuento (sacando el 15% de contado, que es política). */
export function PrecioLleno({ ventas, temps, actual, canal }: {
  ventas: VentaPL[]; temps: { nombre: string }[]; actual: string; canal: string | null;
}) {
  const porTemp = temps.map((t) => ({ t: t.nombre, g: agrupar(ventas.filter((v) => v.temp === t.nombre)) })).filter((x) => x.g.q > 0);
  if (!porTemp.length) return null;
  const va = ventas.filter((v) => v.temp === actual);
  const canales = [...new Set(va.map((v) => grupoCanal(v.canal)))].map((c) => ({ c, g: agrupar(va.filter((v) => grupoCanal(v.canal) === c)) })).sort((a, b) => b.g.q - a.g.q);
  const modelos = [...new Set(va.map((v) => v.modelo))].map((m) => {
    const vs = va.filter((v) => v.modelo === m);
    return { m, g: agrupar(vs), lista: Math.max(...vs.map((v) => v.lista)) };
  }).sort((a, b) => b.g.q - a.g.q);
  const conDesc = modelos.filter((x) => x.g.q > x.g.qLleno).sort((a, b) => b.g.resigna - a.g.resigna).slice(0, 8);

  return (
    <Section title="Venta a precio lleno" sub={`Qué parte de cada temporada se vendió sin descuento${canal ? `, sólo ${canal}` : ""}. El ${fmt.p(OFF_CONTADO)} de efectivo y transferencia no cuenta como descuento: es el precio de contado.`}>
      <div className="pl-t">
        {porTemp.map(({ t, g }) => (
          <div key={t} className="pl-r">
            <div className="pl-h"><b>{t}{t === actual ? " (en curso)" : ""}</b><span><strong>{fmt.p(pct(g.qLleno, g.q))}</strong> de las prendas a precio lleno</span></div>
            <Barra g={g} />
            <div className="pl-s">
              <span>{fmt.n(g.qLleno)} de {fmt.n(g.q)} prendas · {fmt.p(pct(g.mLleno, g.m))} de la plata</span>
              {g.off.length > 0 && <span>las otras, con {fmt.p(prom(g.off))} off en promedio · se dejaron de cobrar <b>{fmt.M(g.resigna)}</b></span>}
            </div>
          </div>
        ))}
        <div className="legend"><span><i style={{ background: "var(--good)" }} />Precio lleno</span><span><i style={{ background: "var(--warn)" }} />Con descuento o sale</span></div>
      </div>

      {!canal && canales.length > 1 && (
        <>
          <h3 className="vm-h">{actual} por canal</h3>
          <div className="pl-c">
            {canales.map(({ c, g }) => (
              <div key={c} className="pl-cr">
                <span className="n"><i style={{ background: colorCanal(c) }} />{c}<small>{fmt.n(g.q)} prendas</small></span>
                <Barra g={g} />
                <b>{fmt.p(pct(g.qLleno, g.q))}</b>
              </div>
            ))}
          </div>
        </>
      )}

      {conDesc.length > 0 && (
        <>
          <h3 className="vm-h">Dónde se fue el descuento en {actual}</h3>
          <p className="vm-s">Los modelos que más plata dejaron de cobrar por venderse por debajo de su precio de lista.</p>
          <div className="pl-m">
            {conDesc.map(({ m, g, lista }) => (
              <div key={m} className="pl-mr">
                <span className="n"><b>{m}</b><small>lista {fmt.ars(lista)} · {g.q - g.qLleno} de {g.q} con descuento ({fmt.p(prom(g.off))} off)</small></span>
                <b className="neg">−{fmt.M(g.resigna)}</b>
              </div>
            ))}
          </div>
        </>
      )}

      <details className="cu-como">
        <summary>¿Cómo sé cuál es el precio lleno?</summary>
        <ul>
          <li><b>No hay precio de lista cargado</b> en ninguna planilla, así que lo saco de las ventas: el precio con tarjeta más alto que se repitió al menos dos veces para ese modelo, en esa temporada o antes.</li>
          <li><b>Contado</b>: lo cobrado en efectivo, transferencia o dólares se divide por 0,85 antes de comparar, porque el 15% off es el precio de contado y no un descuento.</li>
          <li><b>Precio lleno</b> = hasta 7% por debajo de la lista. Más que eso es descuento o sale.</li>
          <li><b>Se dejaron de cobrar</b> = (precio de lista, menos el 15% si fue de contado) − lo cobrado, sumado venta por venta.</li>
          <li>No entra «Otros canales» (ferias y mayorista), que se carga como total del mes.</li>
        </ul>
      </details>
    </Section>
  );
}
