import Link from "next/link";
export type ModeloV = { modelo: string; precio: number; vendidas: number; stock: { local: string; color: string; talle: string; q: number }[] };
/** Ruta conservada como consulta, sin carga ni simulación de ventas. */
export function Vender(_: { modelos?: ModeloV[]; locales?: string[]; local?: string; medioHabitual?: string }) {
  return <section className="vd-s"><p>Esta aplicación consulta datos ficticios de las planillas de demostración. No registra ni simula ventas.</p><p className="demo-input-note"><Link href="/stock">Consultar stock por modelo</Link></p></section>;
}
