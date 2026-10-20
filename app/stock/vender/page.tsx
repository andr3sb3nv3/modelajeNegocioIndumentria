import Link from "next/link";
import { Page } from "@/components/Page";

export default function ConsultaStock() {
  return <Page leido={new Date().toISOString()} eyebrow="Stock por modelo" title={<>Consulta de <em>stock</em></>} lede="Datos de las planillas de demostración.">
    <section className="vd-s">
      <h2 className="vd-h">Vista de consulta</h2>
      <p>Esta aplicación muestra datos ficticios. El registro y la simulación de ventas no están habilitados.</p>
      <p className="demo-input-note"><Link href="/stock">Ver stock por modelo</Link> · <Link href="/ventas">Ver análisis de ventas</Link></p>
    </section>
  </Page>;
}
