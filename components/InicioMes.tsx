import { ErrorBox, Page } from "@/components/Page";
import { Columns, Kpi, Kpis, Legend, Panel, PeriodoNav, Pill, Section, VistaNav } from "@/components/ui";
import { SHEETS, sheetUrl } from "@/lib/config";
import { Sheet } from "@/components/Sheet";
import { getData, type Gasto, type Venta } from "@/lib/data";
import { CANALES, addMonths, colorCanal, fechaCorta, grupoCanal, fmt, hoyBA, mesLabel, mesLargo, normMedio, ym } from "@/lib/fmt";
import { inR, mesesHasta, rangoMes } from "@/lib/periodo";
import Link from "next/link";
import { Utilidad } from "@/components/Utilidad";
import { resultadoDiario, resultadoMes } from "@/lib/resultado";

/** Inicio › Mes: el mes contra los mismos días del anterior. `pedido` = «aaaa-mm» (?m=), un mes anterior. */
export async function InicioMes({ pedido }: { pedido?: string }) {
  let d;
  try { d = await getData(); } catch (e) { return <ErrorBox e={e} />; }
  // ?m=aaaa-mm: un mes anterior (al futuro no se puede ir)
  const hoy = hoyBA(), actual = ym(hoy);
  const mes = pedido && /^\d{4}-\d{2}$/.test(pedido) && pedido < actual ? pedido : actual;
  const esActual = mes === actual, r = rangoMes(mes), corte = esActual ? hoy : r.hasta;
  const nombre = mesLargo(mes).split(" ")[0], anio = mes.slice(0, 4) === actual.slice(0, 4) ? "" : ` ${mes.slice(0, 4)}`;
  const vm = d.ventas.filter((v) => inR(v.f, r)), vc = d.ventas.filter((v) => inR(v.f, r.cmp));
  const monto = vm.reduce((a, v) => a + v.monto, 0), montoC = vc.reduce((a, v) => a + v.monto, 0);
  const prendas = vm.reduce((a, v) => a + v.prendas, 0), prendasC = vc.reduce((a, v) => a + v.prendas, 0);
  const gm = d.gastos.filter((g) => inR(g.f, r));
  // La fila del P&L de este mes, tal cual (lib/resultado.ts): ventas − fijos − variables del mes entero
  const R = resultadoMes(d, mes);
  // Si el mes todavía no tiene fijos cargados, la referencia es el último mes que sí tiene (también del P&L)
  let ref = { m: "", fijos: 0 };
  for (let k = 1; k <= 3 && !ref.fijos; k++) { const m = addMonths(mes, -k), f = resultadoMes(d, m).fijos; if (f) ref = { m, fijos: f }; }
  const sinFijos = !R.fijos;
  const gastos = R.fijos + R.variables, res = R.resultado;
  const ultima = d.ventas.reduce((m, v) => (v.f > m ? v.f : m), "");

  // Utilidad del mes día por día (ventas − variables) contra los fijos del mes (los del P&L).
  // Mes en curso sin fijos cargados todavía: la línea usa los fijos del último mes del P&L que los tiene, y lo dice.
  const totalDias = new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0)).getUTCDate();
  const diasU = resultadoDiario(d, r.desde, corte);
  const fijosM = sinFijos && esActual ? ref.fijos : R.fijos;

  const meses = mesesHasta(12, mes);
  const canales = CANALES.filter((c) => d.ventas.some((v) => grupoCanal(v.canal) === c && v.f >= meses[0]));
  const series = canales.map((c) => ({
    name: c, color: colorCanal(c),
    values: meses.map((m) => d.ventas.filter((v) => ym(v.f) === m && grupoCanal(v.canal) === c).reduce((a, v) => a + v.monto, 0)),
  }));
  const desc = <T extends { f: string }>(xs: T[]) => [...xs].sort((a, b) => (a.f < b.f ? 1 : -1));
  const recientes = desc(esActual ? d.ventas : vm).slice(0, 8);
  const ventasMes = desc(vm);
  const ultGastos = desc(d.gastos.filter((g) => g.f && g.f <= corte && (esActual || g.f >= r.desde))).slice(0, 15);
  const gastosMes = desc(gm);
  const src: [string, string][] = [["02 · Ventas maestro", sheetUrl(SHEETS.ventas)]];

  return (
    <Page leido={d.leido} eyebrow={esActual ? `Hoy · ${fechaCorta(hoy)}` : "Mes cerrado"} title={<>{esActual ? "Así va" : "Así fue"} <em>{nombre}{anio}</em></>}
      lede={esActual ? `Ventas y resultado del mes al ${fechaCorta(hoy)}. Última venta cargada: ${fechaCorta(ultima) || "—"}.` : `Ventas y resultado de ${mesLargo(mes)}.`}>
      <VistaNav v="mes" />
      <PeriodoNav label={mesLargo(mes)} prev={{ href: `/?v=mes&m=${addMonths(mes, -1)}`, t: "Mes anterior" }}
        next={esActual ? null : { href: addMonths(mes, 1) === actual ? "/?v=mes" : `/?v=mes&m=${addMonths(mes, 1)}`, t: "Mes siguiente" }} />
      <div className="glass">
        <Kpis>
          <Kpi q={1} n={fmt.M(monto)} l="Ventas del mes" s={`${fmt.var(monto, montoC)} vs mes anterior`} tone={monto >= montoC ? "good" : "bad"}
            back={{ q: `Todo lo cobrado entre el 1 y el ${fechaCorta(corte)}, sumando todos los canales.`, a: `Se compara con los mismos días del mes anterior (${fmt.M(montoC)}).`, src }} />
          <Kpi q={2} n={fmt.n(prendas)} l="Prendas vendidas" s={`${fmt.var(prendas, prendasC)} vs mes anterior`} tone={prendas >= prendasC ? "good" : "bad"}
            back={{ q: "Unidades vendidas en el mes.", a: "A diferencia de los pesos, las unidades no tienen inflación: es el crecimiento real de volumen.", src }} />
          <Kpi q={3} n={prendas ? fmt.M(monto / prendas) : "—"} l="Ticket por prenda" s={`${vm.length} ventas`}
            back={{ q: "Lo cobrado dividido las prendas vendidas.", a: "Baja cuando hay más pagos con descuento (efectivo o transferencia) o liquidaciones.", src }} />
          <Kpi q={4} n={fmt.M(res)} l={esActual ? "Resultado hasta hoy" : "Resultado del mes"} s={sinFijos ? "Fijos del mes sin cargar todavía" : `Igual al P&L de ${nombre}`} tone={res >= 0 ? "good" : "bad"}
            back={{ q: "Es la fila de este mes en el P&L: ventas menos gastos fijos menos gastos variables, todo cargado con fecha de este mes.", a: sinFijos ? "Los fijos (sueldos, dirección, alquiler) se cargan a fin de mes. Hasta que se carguen, el resultado se ve más alto de lo que va a terminar." : "Es caja, no contable.", src: [["01 · Gastos maestro", sheetUrl(SHEETS.gastos)]] }} />
        </Kpis>

        <div className="gl plc">
          <div className="plc-h"><b>La cuenta del P&amp;L</b><Link href="/informes/resultado">Ver el P&amp;L ›</Link></div>
          <div className="plc-c">
            <span><small>Ventas</small><b>{fmt.M(R.ventas)}</b></span><i>−</i>
            <span className={sinFijos ? "plc-falta" : ""}><small>Fijos</small><b>{sinFijos ? "sin cargar" : fmt.M(R.fijos)}</b></span><i>−</i>
            <span><small>Variables</small><b>{fmt.M(R.variables)}</b></span><i>=</i>
            <span className={res >= 0 ? "good" : "bad"}><small>{esActual ? "Hasta hoy" : "Resultado"}</small><b>{fmt.M(res)}</b></span>
          </div>
          {sinFijos && ref.fijos > 0 && <p>Todavía no se cargaron los fijos de {nombre}. En {mesLargo(ref.m)} fueron {fmt.M(ref.fijos)}: con unos fijos parecidos, el mes quedaría en <b>{fmt.M(res - ref.fijos)}</b>.</p>}
        </div>

        <Section title="Ventas mes a mes" sub="Últimos 12 meses, por canal. El detalle está en «Análisis de ventas», en el menú ☰.">
          <Panel>
            <Columns labels={meses.map(mesLabel)} series={series} highlight={11} />
            <Legend items={series.map((s) => ({ name: s.name, color: s.color }))} />
          </Panel>
        </Section>

        <Section title="Utilidad contra costos fijos" sub="Lo vendido menos los gastos variables va pagando los fijos del mes; cuando los cubre, lo que sigue es ganancia. Misma cuenta que el P&L.">
          <Utilidad dias={diasU} fijos={fijosM} fijosCargados={R.fijos} total={totalDias} actual={esActual}
            fijosTxt={sinFijos && esActual ? `los de ${mesLargo(ref.m)} en el P&L (${fmt.M(ref.fijos)}), porque los de ${nombre} todavía no están cargados` : "los cargados con fecha de este mes, igual que en el P&L"} />
        </Section>

        <div className="duo">
        <Section title="Últimas ventas">
          <div className="list">{recientes.map((v, i) => <FilaVenta key={i} v={v} />)}</div>
          <Sheet label={`Ver las ${vm.length} ventas del mes`} title={`Ventas de ${mesLargo(mes)}`} sub={`${vm.length} ventas · ${fmt.ars(monto)}`}>
            {ventasMes.length ? <div className="list">{ventasMes.map((v, i) => <FilaVenta key={i} v={v} />)}</div> : <p className="empty">Todavía no hay ventas este mes.</p>}
          </Sheet>
        </Section>

        <Section title="Últimos gastos">
          {ultGastos.length ? <div className="list">{ultGastos.map((g, i) => <FilaGasto key={i} g={g} />)}</div> : <p className="empty">No hay gastos cargados.</p>}
          <Sheet label={`Ver los ${gastosMes.length} gastos del mes`} title={`Gastos de ${mesLargo(mes)}`} sub={`${gastosMes.length} gastos · ${fmt.ars(gastos)}`}>
            {gastosMes.length ? <div className="list">{gastosMes.map((g, i) => <FilaGasto key={i} g={g} />)}</div> : <p className="empty">Todavía no hay gastos este mes.</p>}
          </Sheet>
        </Section>
        </div>

        </div>
      </Page>
    );
  }

  function FilaVenta({ v }: { v: Venta }) {
    return (
      <div className="li">
        <div>
          <div className="t">{v.modelo || "Sin modelo"}{v.prendas > 1 ? ` ×${v.prendas}` : ""}</div>
          <div className="m"><span className="cdot" style={{ background: colorCanal(v.canal) }} />{v.canal} · {normMedio(v.medio)}</div>
        </div>
        <div className="v">{fmt.ars(v.monto)}<small>{fechaCorta(v.f)}</small></div>
      </div>
    );
  }

  function FilaGasto({ g }: { g: Gasto }) {
    return (
      <div className="li">
        <div>
          <div className="t">{g.prov || g.cat || "Sin detalle"}</div>
          <div className="m">{[g.prov ? g.cat : "", g.medio].filter(Boolean).join(" · ")}{/pendiente|programado/i.test(g.est) && <Pill tone="warn">{g.est}</Pill>}</div>
      </div>
      <div className="v">{fmt.ars(g.imp)}<small>{fechaCorta(g.f)}</small></div>
    </div>
  );
}
