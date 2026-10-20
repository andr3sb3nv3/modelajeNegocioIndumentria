"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Punto } from "@/lib/ia";

/** La vista la escribe una IA: se le sacan scripts, eventos y enlaces activos antes de mostrarla. */
function limpiar(html: string) {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  tpl.content.querySelectorAll("script,iframe,object,embed,link,meta,base,form,input,button,textarea,select").forEach((n) => n.remove());
  tpl.content.querySelectorAll("*").forEach((el) => {
    for (const a of [...el.attributes]) {
      const v = a.value.trim().toLowerCase();
      if (a.name.startsWith("on") || (/^(href|src|xlink:href|action|formaction)$/.test(a.name) && !v.startsWith("#"))) el.removeAttribute(a.name);
    }
  });
  return tpl.innerHTML;
}

const BASE = `
:host { all: initial; display: block; font-family: Manrope, system-ui, sans-serif; font-size: 15px; line-height: 1.45; color: #2b2629;
  --bg:#fff; --ink:#2b2629; --ink2:#564d52; --muted:#8a8085; --line:#ece6e8; --grid:#f1ecee; --accent:#b04f74; --accent-soft:#fbeef3;
  --s1:#b04f74; --s2:#3f7fb5; --s3:#2f9488; --s4:#8a63c4; --s0:#cfc7cb; --t1:#fbeef3; --t2:#eaf2fa; --t3:#e4f3ef; --t4:#f2edfa;
  --good:#2e8b62; --good-soft:#e6f4ec; --warn:#b06e12; --warn-soft:#fcf1df; --bad:#c2413a; --bad-soft:#fbe8e6;
  --display: Montserrat, "Helvetica Neue", Arial, sans-serif; --body: Manrope, system-ui, sans-serif; }
* { box-sizing: border-box; }
h1,h2,h3,h4 { font-family: var(--display); margin: 0; letter-spacing: -.01em; }
p { margin: 0; }
svg { max-width: 100%; height: auto; }
table { border-collapse: collapse; width: 100%; }
@container (min-width: 900px) { :host { font-size: 16px; } }
.ia-foco { animation: iaFoco 1.8s ease-out; border-radius: 14px; }
@keyframes iaFoco { 0%, 35% { box-shadow: 0 0 0 3px var(--accent), 0 0 0 9px var(--accent-soft); } 100% { box-shadow: 0 0 0 0 transparent; } }
`;

/** Lleva la vista a una parte (selector CSS dentro de la vista) y la marca un momento */
function irA(raiz: ShadowRoot | null, ancla: string) {
  let el: Element | null = null;
  try { el = raiz?.querySelector(ancla) ?? null; } catch { return; }
  if (!el) return;
  // En compu se mueve sólo la columna de la vista; en el celu, la página
  const caja = (raiz?.host as HTMLElement | undefined)?.closest(".ia-der") as HTMLElement | null;
  if (caja && caja.scrollHeight > caja.clientHeight + 4) {
    const barra = caja.querySelector(".ia-stage-h")?.getBoundingClientRect().height || 0;
    caja.scrollTo({ top: caja.scrollTop + el.getBoundingClientRect().top - caja.getBoundingClientRect().top - barra - 16, behavior: "smooth" });
  } else el.scrollIntoView({ behavior: "smooth", block: "start" });
  el.classList.remove("ia-foco");
  void (el as HTMLElement).offsetWidth;
  el.classList.add("ia-foco");
}

/** Muestra una vista de un asistente IA (HTML guardado en el repo) aislada en un shadow DOM, con los estilos de la app. */
export function VistaHTML({ html, foco }: { html: string; foco?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const raiz = useRef<ShadowRoot | null>(null);
  useEffect(() => {
    if (!host.current) return;
    raiz.current ??= host.current.attachShadow({ mode: "open" });
    raiz.current.innerHTML = `<style>${BASE}</style>` + limpiar(html);
    if (foco) { const r = raiz.current; setTimeout(() => irA(r, foco), 250); }
  }, [html, foco]);
  useEffect(() => {
    const ir = (e: Event) => irA(raiz.current, (e as CustomEvent<string>).detail);
    window.addEventListener("ia-ir", ir);
    return () => window.removeEventListener("ia-ir", ir);
  }, []);
  return <div className="ia-canvas" ref={host} />;
}

/** Los temas de una vista en frases cortas: tocar una lleva a esa parte de la vista (si no está en pantalla, la abre ahí) */
export function IAPuntos({ puntos, on, href }: { puntos: Punto[]; on: boolean; href: string }) {
  return (
    <ol className="ia-puntos">
      {puntos.map((p, k) => (
        <li key={k}>
          {on && p.ancla
            ? <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("ia-ir", { detail: p.ancla }))}>{p.texto}</button>
            : <Link href={p.ancla ? `${href}&p=${k}` : href} scroll={false}>{p.texto}</Link>}
        </li>
      ))}
    </ol>
  );
}
