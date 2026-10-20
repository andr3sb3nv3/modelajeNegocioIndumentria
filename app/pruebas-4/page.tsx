import { Mayorista } from "@/components/Mayorista";
import { Page } from "@/components/Page";
import { DATOS } from "@/lib/mayorista";

/** Canal mayorista: de un vistazo o la tesis para leer, respaldado por la planilla «Canal mayorista». Sólo la dueña. */
export default async function CanalMayorista({ searchParams }: { searchParams: Promise<{ v?: string; m?: string }> }) {
  const { v, m } = await searchParams;
  return (
    <Page compu leido={DATOS.generado} eyebrow="Canal mayorista" title={m === "multi" ? <>Vender en <em>multimarcas</em></> : <>Vender a <em>todo el país</em></>}
      lede={m === "multi" ? "Segunda opción: vender por mayor a multimarcas sin regalar el margen. Cuánto deja, qué vestidos llevar y por dónde empezar." : "Escenarios ficticios para comparar venta directa, revendedoras y multimarcas. Explorá cuánto deja cada canal y cómo cambian sus resultados al ajustar los supuestos."}>
      <Mayorista vista={v === "tesis" ? "tesis" : "ver"} opcion={m === "multi" ? "multi" : "online"} />
    </Page>
  );
}
