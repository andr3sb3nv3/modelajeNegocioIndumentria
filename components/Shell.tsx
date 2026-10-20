"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { INFORMES, PLANIFICACION } from "@/lib/config";
import { Logo } from "./Logo";

const SECCIONES = [
  { href: "/", t: "Inicio", d: "Cómo va el día, la semana y el mes", i: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/ventas", t: "Análisis de ventas", d: "Canales, modelos, pagos y temporadas", i: "M4 20V10m6 10V4m6 16v-7m4 7H2" },
  { href: "/gastos", t: "Gastos", d: "Fijos, variables y pendientes", i: "M3 7h18v12H3zM3 11h18M7 15h3" },
  { href: "/stock", t: "Stock por modelo", d: "Consultar modelos, colores, talles y movimientos", i: "M12 3 3 7.5v9L12 21l9-4.5v-9zM3 7.5 12 12l9-4.5M12 12v9" },
  { href: "/costos", t: "Costo unitario", d: "Cuánto cuesta y cuánto deja cada vestido", i: "M7 3h10l3 5-8 13L4 8zM4 8h16M9.5 3 12 8l2.5-5M12 8v13" },
  { href: "/ia", t: "Asistente IA", d: "Lo que charlamos, día por día", i: "M4 5h16v11H9l-5 4zM8 9h8M8 12h5" },
  { href: "/revisar", t: "Para revisar", d: "Datos dudosos y pendientes, y quién los resuelve", i: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18h2" },
];
const PRUEBAS = { href: "/pruebas", t: "Pruebas", d: "Línea del tiempo del negocio", i: "M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3M7 15h10" };
const PRUEBAS_2 = { href: "/pruebas-2", t: "Prueba estética 2", d: "Línea del día con datos simulados", i: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2" };
const PRUEBAS_3 = { href: "/pruebas-3", t: "Prueba estética 3", d: "Pulso: anillos, ritmo y reposición", i: "M3 12h4l3-8 4 16 3-8h4" };
const PRUEBAS_4 = { href: "/pruebas-4", t: "Canal mayorista", d: "Vender a todo el país desde la tienda online", i: "M3 9l1.5-5h15L21 9M3 9h18M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M5 12v8h14v-8M10 20v-5h4v5" };
const INFO_ICON = "M5 3h10l4 4v14H5zM14 3v5h5M9 13h6M9 17h4";

const activo = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));

/** Encabezado fijo con menú lateral (☰) */
export function AppBar({ leido }: { leido?: string }) {
  const path = usePathname();
  const home = "/";
  const secciones = SECCIONES;
  const informes = INFORMES;
  const plan = PLANIFICACION;
  const [open, setOpen] = useState(false);

  const [hidden, setHidden] = useState(false);
  // En la compu el menú queda fijo a la izquierda (no se abre ni se cierra)
  const compu = useCompu();
  const [noche, setNoche] = useState(false);
  useEffect(() => { setNoche(document.documentElement.dataset.tema === "noche"); }, []);
  const cambiarTema = () => {
    const n = !noche;
    setNoche(n);
    if (n) document.documentElement.dataset.tema = "noche"; else delete document.documentElement.dataset.tema;
    try { localStorage.setItem("modelaje-tema", n ? "noche" : "dia"); } catch {}
  };

  useEffect(() => { setOpen(false); setHidden(false); }, [path]);
  // Queda arriba hasta bajar un buen tramo (220 px) y seguir bajando otros 60; vuelve apenas se sube un poco
  useEffect(() => {
    let last = window.scrollY, bajado = 0;
    const onScroll = () => {
      const y = window.scrollY, dy = y - last;
      last = y;
      if (y < 220) { bajado = 0; setHidden(false); return; }
      if (dy > 0) { bajado += dy; if (bajado > 60) setHidden(true); }
      else if (dy < -8) { bajado = 0; setHidden(false); }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <div className="demo-ribbon" role="note">Datos ficticios</div>
      <header className={`appbar${hidden && !open ? " hide" : ""}`}>
        <button className="burger" onClick={() => setOpen(true)} aria-label="Abrir menú" aria-expanded={open} aria-controls="menu">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
        <Link href={home} className="brand" aria-label="Ir al inicio">
          <Logo size={34} />
          <span><span className="bn">MODELAJE</span><span className="bs">Modelo de negocio</span></span>
        </Link>
        <div className="sp" />
        {leido && !compu && <Refresher leido={leido} />}
      </header>

      <div className={`scrim${open ? " on" : ""}`} onClick={() => setOpen(false)} aria-hidden />
      <nav id="menu" className={`drawer${open ? " on" : ""}`} aria-label="Menú" aria-hidden={!open && !compu} inert={!open && !compu}>
        <div className="dr-h">
          <Link href={home} className="brand"><Logo size={40} /><span><span className="bn">MODELAJE</span><span className="bs">Modelo de negocio</span></span></Link>
          <button className="burger" onClick={() => setOpen(false)} aria-label="Cerrar menú">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        {leido && compu && <div className="dr-sync"><Refresher leido={leido} /></div>}
        <div className="dr-body">
          <button className="tema" onClick={cambiarTema} role="switch" aria-checked={noche} aria-label="Modo noche">
            <span className={!noche ? "on" : ""}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>Día
            </span>
            <span className={noche ? "on" : ""}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg>Noche
            </span>
          </button>
          <div className="dr-t">Secciones</div>
          {secciones.map((x) => (
            <MenuItem key={x.href} href={x.href} t={x.t} d={x.d} i={x.i} on={activo(path, x.href)} />
          ))}
          {informes.length > 0 && <div className="dr-t">Informes</div>}
          {informes.map((x) => (
            <MenuItem key={x.href} href={x.href} t={x.t} d={x.d} i={INFO_ICON} on={activo(path, x.href)} />
          ))}
          {plan.length > 0 && <div className="dr-t">Planificación</div>}
          {plan.map((x) => (
            <MenuItem key={x.href} href={x.href} t={x.t} d={x.d} i={x.i} on={activo(path, x.href)} />
          ))}
          <>
              <div className="dr-t">Pruebas</div>
              <MenuItem href={PRUEBAS.href} t={PRUEBAS.t} d={PRUEBAS.d} i={PRUEBAS.i} on={activo(path, PRUEBAS.href)} />
              <MenuItem href={PRUEBAS_2.href} t={PRUEBAS_2.t} d={PRUEBAS_2.d} i={PRUEBAS_2.i} on={activo(path, PRUEBAS_2.href)} />
              <MenuItem href={PRUEBAS_3.href} t={PRUEBAS_3.t} d={PRUEBAS_3.d} i={PRUEBAS_3.i} on={activo(path, PRUEBAS_3.href)} />
              <MenuItem href={PRUEBAS_4.href} t={PRUEBAS_4.t} d={PRUEBAS_4.d} i={PRUEBAS_4.i} on={activo(path, PRUEBAS_4.href)} />
          </>
        </div>
        <div className="dr-demo"><p>Datos de las planillas de demostración</p><p>Vista de consulta · Datos ficticios</p></div>
        <div className="dr-f"><span>Modelaje · Modelo de negocio</span></div>
      </nav>
    </>
  );
}

/** true en pantallas de compu (desde 1024 px), donde el menú queda fijo al costado. */
export function useCompu() {
  const [compu, setCompu] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const ver = () => setCompu(mq.matches);
    ver();
    mq.addEventListener("change", ver);
    return () => mq.removeEventListener("change", ver);
  }, []);
  return compu;
}

function MenuItem({ href, t, d, i, on }: { href: string; t: string; d: string; i: string; on: boolean }) {
  return (
    <Link href={href} className={`mi${on ? " on" : ""}`} aria-current={on ? "page" : undefined}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={i} /></svg>
      <span><span className="mt">{t}</span><span className="md">{d}</span></span>
    </Link>
  );
}

/** Refresca los datos solo: cada 60 s con la app abierta y al volver a la app. */
export function Refresher({ leido }: { leido: string }) {
  const router = useRouter();
  const [ago, setAgo] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const tick = () => {
      const s = Math.max(0, Math.round((Date.now() - new Date(leido).getTime()) / 1000));
      setAgo(s < 60 ? "recién" : s < 3600 ? `hace ${Math.round(s / 60)} min` : `hace ${Math.round(s / 3600)} h`);
    };
    tick();
    const t1 = setInterval(tick, 15000);
    const t2 = setInterval(() => document.visibilityState === "visible" && router.refresh(), 60000);
    const vis = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", vis);
    setBusy(false);
    return () => { clearInterval(t1); clearInterval(t2); document.removeEventListener("visibilitychange", vis); };
  }, [leido, router]);
  return (
    <button className="sync" onClick={() => { setBusy(true); router.refresh(); }} aria-label="Actualizar datos">
      <span className={`dot${busy ? " busy" : ""}`} />Datos {ago}
    </button>
  );
}
