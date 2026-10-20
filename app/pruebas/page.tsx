import { Page } from "@/components/Page";
import { Ahora } from "@/components/Ahora";
import { Pegar } from "@/components/Pegar";
import { PeriodoNav } from "@/components/ui";
import { SHEETS, sheetUrl } from "@/lib/config";
import { MESES_L, hoyBA } from "@/lib/fmt";
import { armarLinea } from "@/lib/linea-vista";
import { sumarDias } from "@/lib/semana";

export const dynamic = "force-dynamic";

const fecha = (f: string) => `${Number(f.slice(8, 10))} de ${MESES_L[Number(f.slice(5, 7)) - 1]}`;

/** Pruebas: la línea del tiempo real del negocio (estética de la Prueba 2). Abre en el día de hoy, hora a hora; ?d=aaaa-mm-dd muestra otro día. Sólo la dueña. */
export default async function Pruebas({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const sp = await searchParams;
  const hoy = hoyBA();
  const f = /^\d{4}-\d{2}-\d{2}$/.test(sp.d || "") && sp.d! < hoy ? sp.d! : hoy;
  const l = await armarLinea(f, 1);
  const sig = sumarDias(f, 1);
  return (
    <Page leido={l.leido} eyebrow="Línea del tiempo" title={<>El día a día <em>de la marca</em></>} lede="Lo que va pasando hoy en el negocio, hora a hora, parado en el ahora. Abajo, lo que viene.">
      <PeriodoNav
        label={f === hoy ? "Hoy" : f === sumarDias(hoy, -1) ? "Ayer" : fecha(f)}
        prev={{ href: `/pruebas?d=${sumarDias(f, -1)}`, t: "Día anterior" }}
        next={f < hoy ? { href: sig >= hoy ? "/pruebas" : `/pruebas?d=${sig}`, t: "Día siguiente" } : null}
      />
      <Ahora eventos={l.eventos} proximos={l.proximos} dias={l.dias} avisos={l.avisos} horaAHora />
      <Pegar f={f} />
      <p className="tl-src">
        Datos de las planillas de demostración: <a href={sheetUrl(SHEETS.maestro)} target="_blank" rel="noreferrer">Carga de datos maestro › Línea del tiempo</a>.
      </p>
    </Page>
  );
}
