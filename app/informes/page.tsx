import Link from "next/link";
import { ErrorBox, Page } from "@/components/Page";
import { INFORMES } from "@/lib/config";
import { getData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Informes() {
  let d;
  try { d = await getData(); } catch (e) { return <ErrorBox e={e} />; }
  return (
    <Page leido={d.leido} eyebrow="Informes" title={<>Análisis <em>en vivo</em></>} lede="Calculados con los datos actuales de las planillas cada vez que los abrís.">
      <div className="list">
        {INFORMES.map((x) => (
          <Link className="li" key={x.href} href={x.href}>
            <div><div className="t">{x.t}</div><div className="m">{x.d}</div></div>
            <span className="arrow">›</span>
          </Link>
        ))}
      </div>
    </Page>
  );
}
