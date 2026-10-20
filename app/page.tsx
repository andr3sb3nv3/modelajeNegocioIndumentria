import { InicioDia } from "@/components/InicioDia";
import { InicioMes } from "@/components/InicioMes";
import { InicioSemana } from "@/components/InicioSemana";

export const dynamic = "force-dynamic";

/** Inicio con botonera Día / Semana / Mes (?v=). Abre en Día. ?d= día, ?s= semanas para atrás, ?m= mes. */
export default async function Inicio({ searchParams }: { searchParams: Promise<{ v?: string; d?: string; s?: string; m?: string }> }) {
  const sp = await searchParams;
  if (sp.v === "semana") return <InicioSemana atras={Math.max(0, Math.min(104, Math.floor(Number(sp.s) || 0)))} />;
  if (sp.v === "mes") return <InicioMes pedido={sp.m} />;
  return <InicioDia d={sp.d} />;
}
