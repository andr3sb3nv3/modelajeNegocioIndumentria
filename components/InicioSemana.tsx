import { Aviso, ErrorBox, Page } from "@/components/Page";
import { DiasSemana, SemanaChart } from "@/components/Semana";
import { Kpi, Kpis, Legend, Panel, PeriodoNav, Section, VistaNav } from "@/components/ui";
import { SHEETS, sheetUrl } from "@/lib/config";
import { fechaCorta, fmt } from "@/lib/fmt";
import { getSemana, type Dia } from "@/lib/semana";

/** Inicio › Semana: los últimos 7 días contra los 7 anteriores. `atras` = semanas para atrás (?s=N). */
export async function InicioSemana({ atras }: { atras: number }) {
  let s;
  try { s = await getSemana(atras); } catch (e) { return <ErrorBox e={e} />; }
  const { dias, prev, hoy, real } = s;
  const sum = (xs: Dia[], k: "ventas" | "gastos" | "prendas") => xs.reduce((a, d) => a + d[k], 0);
  const v = sum(dias, "ventas"), vp = sum(prev, "ventas"), g = sum(dias, "gastos"), gp = sum(prev, "gastos");
  const p = sum(dias, "prendas"), pp = sum(prev, "prendas");
  const res = v - g, resp = vp - gp;
  const revisar = dias.reduce((a, d) => a + d.alertas.length, 0);
  const sinCarga = dias.filter((d) => !d.cargado).length, faltan = dias.filter((d) => d.falta).length;
  const src: [string, string][] = [["02 · Ventas maestro", sheetUrl(SHEETS.ventas)], ["01 · Gastos maestro", sheetUrl(SHEETS.gastos)], ["Producción y stock › Movimientos", sheetUrl(SHEETS.stock)]];
  const vs = (a: number, b: number) => `${fmt.var(a, b)} vs semana anterior`;

  const estado = [
    revisar ? `${revisar} ${revisar === 1 ? "cosa" : "cosas"} para revisar` : "nada para revisar",
    faltan ? `${faltan} ${faltan === 1 ? "día" : "días"} sin archivo` : "",
    sinCarga ? `${sinCarga} sin cargas` : "",
  ].filter(Boolean).join(" · ");

  return (
    <Page leido={s.leido} eyebrow={atras ? `Semana del ${fechaCorta(dias[0].f)}` : `Hoy · ${fechaCorta(real)}`}
      title={atras ? <>Cómo fue <em>{atras === 1 ? "la semana pasada" : `hace ${atras} semanas`}</em></> : <>Cómo va <em>la semana</em></>}
      lede={`Del ${fechaCorta(dias[0].f)} al ${fechaCorta(hoy)}: ${estado}.`}>
      <VistaNav v="semana" />
      <PeriodoNav label={atras ? `${fechaCorta(dias[0].f)} – ${fechaCorta(hoy)}` : "Esta semana"}
        prev={{ href: `/?v=semana&s=${atras + 1}`, t: "Semana anterior" }} next={atras ? { href: atras === 1 ? "/?v=semana" : `/?v=semana&s=${atras - 1}`, t: "Semana siguiente" } : null} />
      {s.errores.length > 0 && <Aviso t={s.maestroError && s.errores.length === 1 ? "No pude leer las notas del 17 · Carga de datos maestro. Los números de la semana están al día igual." : "Algunos datos no se pudieron leer y pueden faltar números. Probá de nuevo en un rato."} detalle={s.errores.join("\n")} />}

      <div className="glass">
        <Kpis>
          <Kpi q={1} n={fmt.M(v)} l="Ventas de la semana" s={vs(v, vp)} tone={v >= vp ? "good" : "bad"}
            back={{ q: "Ventas $ de los últimos 7 días, en vivo: planilla de Ventas y movimientos registrados.", a: `La semana anterior fueron ${fmt.M(vp)}. Si un día y canal ya está en la planilla de Ventas, manda la planilla; si no, cuentan las ventas registradas en Movimientos. Así nada se cuenta dos veces.`, src }} />
          <Kpi q={2} n={fmt.n(p)} l="Prendas vendidas" s={vs(p, pp)} tone={p >= pp ? "good" : "bad"}
            back={{ q: "Prendas vendidas en los últimos 7 días.", a: "Las unidades no tienen inflación: es el volumen real.", src }} />
          <Kpi q={3} n={fmt.M(g)} l="Gastos variables" s={vs(g, gp)} tone={g <= gp ? "good" : "bad"}
            back={{ q: "Gastos variables cargados en los últimos 7 días: telas, talleres, envíos, packaging, pauta…", a: `La semana anterior fueron ${fmt.M(gp)}. Los fijos (sueldos, alquileres, servicios) no entran acá: se pagan una vez por mes y se miran en Mes, igual que en el P&L.`, src }} />
          <Kpi q={4} n={fmt.M(res)} l="Ventas − variables" s={`Semana anterior ${fmt.M(resp)}`} tone={res >= 0 ? "good" : "bad"}
            back={{ q: "Ventas menos gastos variables de los últimos 7 días: lo que deja la semana para pagar los fijos.", a: "Los fijos no se restan acá; el resultado con fijos está en Mes y en el P&L.", src }} />
        </Kpis>

        <Section title="Día por día" sub="Tocá un día o deslizá las tarjetas.">
          <DiasSemana key={hoy} dias={dias} hoy={real} />
        </Section>

        <Section title="Ventas y gastos variables por día" sub="Tocá una columna para ver los montos.">
          <Panel>
            <SemanaChart dias={dias} hoy={real} />
            <Legend items={[{ name: "Ventas", color: "var(--s1)" }, { name: "Gastos variables", color: "var(--s2)" }]} />
          </Panel>
        </Section>

      </div>

    </Page>
  );
}
