import { Page } from "@/components/Page";
import { Ahora } from "@/components/Ahora";
import { ReporteManana } from "@/components/Reporte";
import { PeriodoNav, Section, VistaNav } from "@/components/ui";
import { MESES_L, fechaCorta, hoyBA } from "@/lib/fmt";
import { armarLinea } from "@/lib/linea-vista";
import { ultimoReporte } from "@/lib/reporte";
import { sumarDias } from "@/lib/semana";

const fecha = (f: string) => `${Number(f.slice(8, 10))} de ${MESES_L[Number(f.slice(5, 7)) - 1]}`;

/** Inicio › Día: la línea del tiempo del día hora a hora (la de /pruebas), contra el mismo día de la semana anterior. `d` = aaaa-mm-dd (?d=), un día anterior. */
export async function InicioDia({ d }: { d?: string }) {
  const hoy = hoyBA();
  const f = /^\d{4}-\d{2}-\d{2}$/.test(d || "") && d! < hoy ? d! : hoy;
  const [l, rep] = await Promise.all([armarLinea(f, 1), f === hoy ? ultimoReporte(hoy) : null]);
  const sig = sumarDias(f, 1), ayer = sumarDias(hoy, -1);
  return (
    <Page leido={l.leido} eyebrow={f === hoy ? `Hoy · ${fechaCorta(hoy)}` : fecha(f)}
      title={f === hoy ? <>Cómo va <em>el día</em></> : <>Cómo fue <em>{f === ayer ? "ayer" : "ese día"}</em></>}
      lede="Lo que va pasando en el negocio, hora a hora, parado en el ahora. Abajo, lo que viene.">
      <VistaNav v="dia" />
      <PeriodoNav
        label={f === hoy ? "Hoy" : f === ayer ? "Ayer" : fecha(f)}
        prev={{ href: `/?d=${sumarDias(f, -1)}`, t: "Día anterior" }}
        next={f < hoy ? { href: sig >= hoy ? "/" : `/?d=${sig}`, t: "Día siguiente" } : null}
      />
      <Ahora eventos={l.eventos} proximos={l.proximos} dias={l.dias} cmp={l.cmp} avisos={l.avisos} horaAHora />
      {f === hoy && <div className="glass">
        <Section title="Reporte de la mañana" sub="Tocá un área para ver qué recomienda hoy y una recomendación para la aclaración.">
          {rep ? <ReporteManana r={rep} /> : (
            <div className="ia-card off gl">
              <b>Todavía no hay reporte.</b>
              <p>Los reportes ficticios se muestran cuando se agregan a las planillas de demostración.</p>
            </div>
          )}
        </Section>
      </div>}
    </Page>
  );
}
