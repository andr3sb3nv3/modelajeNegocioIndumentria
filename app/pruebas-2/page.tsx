import { Page } from "@/components/Page";
import { Ahora } from "@/components/Ahora";
import { armarLinea } from "@/lib/linea-vista";

export const dynamic = "force-dynamic";

/** Prueba estética 2: la línea de los últimos 7 días con datos ficticios, parada en el ahora. Sólo la dueña. */
export default async function Prueba2() {
  const l = await armarLinea();
  return (
    <Page leido={l.leido} eyebrow="Laboratorio · datos ficticios" title={<>Prueba estética <em>2</em></>} lede="Lo que fue pasando en los últimos días, siempre parado en el ahora. Abajo, lo que viene.">
      <Ahora eventos={l.eventos} proximos={l.proximos} dias={l.dias} avisos={l.avisos} />
    </Page>
  );
}
