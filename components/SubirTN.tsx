import Link from "next/link";
/** La web muestra las planillas de demostración y no importa ni registra ventas. */
export function SubirTN({ ultima }: { ultima?: string }) {
  return <section className="vd-s"><h2 className="vd-h">Ventas online · Consulta</h2><p>Las ventas ficticias se consultan desde las planillas de demostración. La carga e importación desde esta web no están habilitadas.</p><p className="demo-input-note"><Link href="/ventas">Ver análisis de ventas</Link> · <Link href="/stock">Ver stock por modelo</Link></p></section>;
}
