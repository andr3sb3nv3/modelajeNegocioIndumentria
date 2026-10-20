import DEMO_DRIVE from "../config/demo-drive.json";
/** This separate public application is always a fictitious demo, including on Vercel. */
export const demoMode = () => true;
/** Compatibility flag: this independent app only reads its own public demo library. */
export const mockStorage = () => true;
export const DEMO_AS_OF = DEMO_DRIVE.asOf;
export { DEMO_DRIVE };
export const demoSheetId = (logical: string): string => (DEMO_DRIVE.books as Record<string,string>)[logical] || logical;
export function logicalSheetId(id: string): string {
  return Object.entries(DEMO_DRIVE.books).find(([key,value]) => key === id || value === id)?.[0] || id;
}
export function assertDemoSheetId(id: string): void {
  const logical = logicalSheetId(id);
  if (!Object.hasOwn(DEMO_DRIVE.books, logical)) throw new Error("La planilla no pertenece al entorno ficticio de pruebas.");
}
export const SHEETS = {
  ventas: demoSheetId("demo-ventas"), ventasSI: demoSheetId("demo-ventas-si"), ventasOnline: demoSheetId("demo-ventas-online"),
  gastos: demoSheetId("demo-gastos"), stock: demoSheetId("demo-stock"), conteo: demoSheetId("demo-conteo"),
  clientas: demoSheetId("demo-clientas"), canjes: demoSheetId("demo-canjes"), maestro: demoSheetId("demo-maestro"),
  costos: demoSheetId("demo-costos"),
};

export const sheetUrl = (id: string) => `https://docs.google.com/spreadsheets/d/${demoSheetId(id)}/edit`;

/** Informes dentro de la app (se calculan en vivo) */
export const INFORMES = [
  { href: "/informes/resultado", t: "Resultado · P&L", d: "Ventas, gastos fijos y variables mes a mes." },
  { href: "/informes/costos/fijos", t: "Costos fijos", d: "Sueldos, alquileres y servicios contra ventas." },
  { href: "/informes/costos/variables", t: "Costos variables", d: "Talleres, telas, envíos y los gastos más grandes." },
  { href: "/informes/vip", t: "Clientas y VIP", d: "Segmentos, las VIP y las frecuentes a un paso." },
  { href: "/informes/clientas", t: "Clientas", d: "Recompra, nuevas por mes y canal de entrada." },
  { href: "/informes/produccion?t=T27", t: "Producción T27", d: "Plan, estado, talleres, costos y telas." },
  { href: "/informes/produccion?t=T26", t: "Producción T26", d: "Qué se produjo y cuánto costó." },
  { href: "/informes/proveedores", t: "Proveedores", d: "Pedidos, telas, pagos y gastos por proveedor." },
  { href: "/informes/canjes", t: "Préstamos y Canjes", d: "Prendas que salieron para canjes, préstamos y contenido." },
  { href: "/informes/control", t: "Control de carga", d: "Qué falta cargar o revisar en las planillas." },
];

export const folderUrl = (id: string) => `https://drive.google.com/drive/folders/${id}`;

/** Carpetas de planificación de la demo (sólo lectura: las planillas mandan). */
export const PLAN = {
  carpetas: {
    lanzamientos: DEMO_DRIVE.folders.lanzamientos,
    temporadas: DEMO_DRIVE.folders.temporadas,
    objetivos: DEMO_DRIVE.folders.objetivos,
  },
  indice: demoSheetId("demo-plan-indice"),
  modelo: demoSheetId("demo-plan-modelo"),
  ideas: demoSheetId("demo-plan-ideas"),
  calendario: demoSheetId("demo-plan-calendario"),
  objetivos: demoSheetId("demo-plan-objetivos"),
  /** Si no se puede listar la carpeta 11, estos son los lanzamientos con archivo propio */
  lanzamientos: [
    { id: demoSheetId("demo-plan-lanzamiento-27"), name: "Colección Horizonte 27" },
    { id: demoSheetId("demo-plan-lanzamiento-26"), name: "Colección Horizonte 26" },
  ],
};

/** Menú › Planificación (abajo de todo) */
export const PLANIFICACION = [
  { href: "/lanzamientos", t: "Lanzamientos", d: "Timeline, hitos e ideas de contenido", i: "M4 19h16M6 15l4-6 4 3 4-7M18 5h2v2" },
  { href: "/temporadas", t: "Temporadas", d: "Año comercial, ciclo y Cyber", i: "M4 5h16v15H4zM4 9h16M8 3v4M16 3v4M8 13h3M8 16h6" },
  { href: "/objetivos", t: "Objetivos", d: "Plan por área y tareas", i: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01" },
];
