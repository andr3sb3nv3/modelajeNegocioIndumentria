import type { ReactNode } from "react";
import { AppBar } from "./Shell";

/** ancho: pantallas pensadas para compu o tele (Marca demo IA), que en pantalla grande usan todo el ancho.
 *  compu: pantallas de celular que en la compu se abren a dos columnas (Stock). */
export async function Page({ eyebrow, title, lede, leido, ancho, compu, children }: { eyebrow: string; title: ReactNode; lede?: ReactNode; leido: string; ancho?: boolean; compu?: boolean; children: ReactNode }) {
  return (
    <div className={ancho ? "wrap ancho" : compu ? "wrap compu" : "wrap"}>
      <AppBar leido={leido} />
      <div className="mast">
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
      </div>
      {children}
    </div>
  );
}

export function ErrorBox({ e }: { e: unknown }) {
  return (
    <div className="wrap">
      <AppBar />
      <div style={{ marginTop: 24 }}><Aviso t="No pude leer las planillas. Probá de nuevo en un rato." detalle={String((e as Error)?.message || e).slice(0, 600)} /></div>
    </div>
  );
}

/** Mensaje corto y amable; el error técnico queda escondido detrás de «ver detalle». */
export function Aviso({ t, detalle, suave }: { t: string; detalle?: string; suave?: boolean }) {
  return (
    <div className={suave ? "aviso suave" : "aviso"} role="status">
      <p>{t}</p>
      {detalle && <details className="det"><summary>ver detalle</summary><pre>{detalle}</pre></details>}
    </div>
  );
}
