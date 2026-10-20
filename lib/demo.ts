import type { Data } from "./data";
import { DEMO_AS_OF } from "./config";
import { demoSalesMovements } from "./demo-sales-movements";
export { DEMO_AS_OF };

/** Reproducible, entirely invented books. No production IDs or source rows are used. */
export const DEMO_MODELS = ["Aurora", "Bruma", "Duna", "Luma", "Cedro", "Oliva", "Prisma", "Senda"];
export type DemoCell = string | number | boolean | null;
export type DemoWorkbook = { id: string; title: string; sheets: Record<string, DemoCell[][]> };
const date = (offset: number) => new Date(Date.parse(`${DEMO_AS_OF}T12:00:00Z`) + offset * 86400000).toISOString().slice(0, 10);
const serial = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86400000 + 25569;
const dateAR = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const season = (iso: string) => `T${Number(iso.slice(2, 4)) + (Number(iso.slice(5, 7)) >= 8 ? 1 : 0)}`;
const titleRows = (title: string, head: string[], first: number, rows: DemoCell[][]): DemoCell[][] => {
  const top: DemoCell[][] = Array.from({ length: first - 1 }, () => []);
  if (first > 2) { top[0] = [title]; top[1] = ["DEMOSTRACIÓN · todos los nombres, importes y movimientos son ficticios."]; }
  top[first - 2] = head;
  return [...top, ...rows];
};
const book = (id: string, title: string, sheets: DemoWorkbook["sheets"]): DemoWorkbook => ({ id, title: `${title} · DEMO`, sheets });
const planRows = (title: string, head: string[], rows: DemoCell[][], meta: DemoCell[][] = []): DemoCell[][] => [[title], ["Ejemplo ficticio para explorar la planificación. No representa una empresa real."], ...meta, head, ...rows];

function createBooks(): DemoWorkbook[] {
  let seed = 613;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pick = <T,>(items: T[]): T => items[Math.floor(rnd() * items.length)];
  const colors = ["Azul niebla", "Coral suave", "Crudo", "Verde salvia"];
  const prices = [187000, 213000, 169000, 246000, 158000, 224000, 198000, 271000];
  const methods = ["Tarjeta 3 cuotas", "Transferencia", "Efectivo", "Mercado Pago"];
  const ventas: DemoCell[][] = [];
  const si: DemoCell[][] = [], online: DemoCell[][] = [];
  const customerTotals = new Map<string, { prendas: number; ultima: string; temps: Record<string, number> }>();
  // Historical example populated at the owner's request; the cutoff never advances by itself.
  for (let day = -800; day <= 0; day++) {
    const f = date(day), index = day + 800;
    for (const channel of ["San Isidro", "Online", "Honduras", ...(index % 4 === 0 ? ["Otros canales"] : [])]) {
      const modelIndex = (index + (channel === "Online" ? 3 : channel === "Honduras" ? 5 : 0)) % DEMO_MODELS.length;
      const modelo = DEMO_MODELS[modelIndex];
      const prendas = channel === "Otros canales" ? 3 + index % 3 : 1 + (index % 9 === 0 ? 1 : 0);
      const medio = methods[index % methods.length];
      const lista = Math.round(prices[modelIndex] * (f < "2026-01-01" ? 0.82 : 1));
      const factor = /Transferencia|Efectivo/.test(medio) ? 0.85 : 1;
      const monto = Math.round(lista * factor * prendas * (index % 17 === 0 ? 0.78 : 1));
      const clienta = `Clienta Demo ${String(1 + (index * 3 + modelIndex) % 96).padStart(3, "0")}`;
      const origin = channel === "San Isidro" || channel === "Online" ? `Registro ${channel}` : "Carga de ventas demo";
      ventas.push([serial(f), f.slice(0, 7), channel, clienta, modelo, prendas, monto, medio, origin, "Ficticio"]);
      const live: DemoCell[] = [serial(f), clienta, "DEMO-SIN-DNI", prendas, monto, 0, "No", medio, channel];
      if (channel === "Online") live.push("Provincia Demo");
      live.push(modelo, "Ficticio");
      (channel === "San Isidro" ? si : channel === "Online" ? online : []).push(live);
      const customer = customerTotals.get(clienta) || { prendas: 0, ultima: f, temps: {} };
      customer.prendas += prendas; customer.ultima = f;
      customer.temps[season(f)] = (customer.temps[season(f)] || 0) + prendas;
      customerTotals.set(clienta, customer);
    }
  }
  const gastos: DemoCell[][] = [];
  const pushExpense = (f: string, tipo: string, cat: string, description: string, proveedor: string, amount: number, pending = false, review = false) => {
    const id = `G-DEMO-${String(gastos.length + 1).padStart(4, "0")}`;
    const row: DemoCell[] = [id, serial(f), f.slice(0, 7), tipo, cat, cat === "Otros" ? "Moldería / Desarrollo" : "", description, proveedor, "Transferencia", amount, "ARS", pending ? "Pendiente" : "Pagado", pending ? date(4) : "", review ? "" : "Comprobante ficticio", "Movimiento ficticio", 1, amount, review ? "A revisar" : "OK", "DEMO"];
    gastos.push(row);
  };
  // Keep the existing expense fixture unchanged when extending only sales history.
  const months = [...new Set(ventas.filter(r => Number(r[0]) >= serial(date(-400))).map(r => String(r[1])))];
  for (const ym of months) {
    pushExpense(`${ym}-03`, "Fijo", "Sueldos", "Equipo de la marca demo", "Equipo Demo", 1436000);
    pushExpense(`${ym}-05`, "Fijo", "Alquileres", "Espacio de atención demo", "Espacio Demo Centro", 527000);
    pushExpense(`${ym}-08`, "Fijo", "Servicios", "Servicios del showroom demo", "Servicios Demo", 146000);
  }
  const categories = ["Telas", "Talleres", "Publicidad", "Logística / Envíos", "Packaging", "Otros", "Comisiones"];
  for (let day = -399; day <= 0; day += 3) {
    const cat = categories[Math.abs(day) % categories.length];
    const supplier = cat === "Telas" ? "Textil Demo A" : cat === "Talleres" ? "Taller Demo Norte" : "Proveedor Demo B";
    const amount = Math.round((42000 + rnd() * 280000) / 1000) * 1000;
    pushExpense(date(day), "Variable", cat, `${cat} para la colección ficticia`, supplier, amount, day > -12 && day % 2 === 0, day === -9);
  }
  // Explicit open items make review and due-date screens meaningful.
  pushExpense(date(-2), "Variable", "Talleres", "Saldo de confección demo", "Taller Demo Sur", 318000, true, true);
  gastos.sort((a,b) => Number(a[1]) - Number(b[1]));

  const stock: DemoCell[][] = [];
  const countDate = DEMO_AS_OF;
  for (const local of ["San Isidro", "Depósito", "Honduras"]) for (let m = 0; m < DEMO_MODELS.length; m++) for (let c = 0; c < colors.length; c++) for (let size = 1; size <= 4; size++) {
    const quantity = 4 + ((m * 7 + c * 3 + size + local.length) % 9);
    stock.push([serial(countDate), local, DEMO_MODELS[m], colors[c], String(size), quantity, quantity, "Conteo ficticio", "T27", "DEMO"]);
  }
  const physical: DemoCell[][] = [[`STOCK AL ${dateAR(DEMO_AS_OF).slice(0,6)}${DEMO_AS_OF.slice(2,4)}`], ["Conteo físico de demostración · sin datos reales"], ["SECCIÓN", "NOMBRE", "COLOR", "COLOR ESPECÍFICO", "STOCK TOTAL", "1", "2", "3", "4", "STOCK ACTUAL"]];
  for (let m = 0; m < DEMO_MODELS.length; m++) for (let c = 0; c < colors.length; c++) {
    const sizes = [1, 2, 3, 4].map(size => 4 + (m * 7 + c * 3 + size + "San Isidro".length) % 9);
    physical.push(["COLECCIÓN SS227", `Vestido ${DEMO_MODELS[m]}`, colors[c], colors[c], sizes.reduce((a,b)=>a+b,0), ...sizes, sizes.reduce((a,b)=>a+b,0)]);
  }
  const production: DemoCell[][] = [], payments: DemoCell[][] = [], fabrics: DemoCell[][] = [];
  for (const temp of ["T26", "T27"]) for (let i = 0; i < DEMO_MODELS.length; i++) {
    const maker = i % 2 ? "Taller Demo Sur" : "Taller Demo Norte";
    const made = 48 + i * 4;
    for (let size = 1; size <= 4; size++) production.push([temp, DEMO_MODELS[i], colors[i % 4], String(size), Math.round(made * [0.18,0.32,0.32,0.18][size-1]), maker, temp === "T26" ? "entregado" : ["entregado", "en taller", "cortado", "pendiente"][i % 4], serial(date(temp === "T26" ? -190 : i % 2 ? 7 : -15)), "Lino demo", "Orden ficticia", 23500 + i * 1100, "DEMO"]);
    payments.push([serial(date(temp === "T26" ? -190 + i : -35 + i * 3)), temp, maker, i % 2 ? "Saldo" : "Seña", DEMO_MODELS[i], made * (23500 + i * 1100), "ARS", "Transferencia", "Comprobante ficticio", "DEMO"]);
    fabrics.push([temp, serial(date(temp === "T26" ? -215 + i : -55 + i)), i % 2 ? "Textil Demo B" : "Textil Demo A", ["Lino demo", "Sarga demo", "Crepé demo"][i % 3], colors[i % 4], made * 2.2, 6700 + i * 300, "ARS", made * 2.2 * (6700 + i * 300), DEMO_MODELS[i], "Compra ficticia", "DEMO"]);
  }
  const clientRows = [...customerTotals].sort(([a],[b])=>a.localeCompare(b)).map(([name,c], i): DemoCell[] => [name, c.prendas >= 15 ? "VIP" : c.prendas >= 6 ? "Frecuente" : "Nueva", c.prendas, 0, 0, 0, c.temps.T25 || 0, c.temps.T26 || 0, c.temps.T27 || 0, c.ultima, `clienta.demo${String(i+1).padStart(3,"0")}@example.com`]);
  const canjes = Array.from({length:15},(_,i): DemoCell[]=>[date(-60+i*4),["Canje", "Préstamo", "Contenido"][i%3],`Cuenta Demo ${String(i+1).padStart(2,"0")}`,`${DEMO_MODELS[i%8]}, ${DEMO_MODELS[(i+2)%8]}`,i%3===1?"Devuelto":"Sin devolución",i%3===1?date(-52+i*3):date(3+i),"Acción ficticia","Sin contacto real","DEMO"]);
  const movHead = ["ID","Fecha y hora","Fecha","Local","Tipo","Modelo","Color","Talle","Cantidad","Monto","Medio de pago","Clienta","Nota","Ref","Usuario"];
  const movements: DemoCell[][] = [
    ["demo-venta-001",`${DEMO_AS_OF} 09:12:00`,DEMO_AS_OF,"San Isidro","Venta","Aurora",colors[0],"2",-1,187000,"Tarjeta","Clienta Demo 021","Venta de demostración","","equipo.demo@example.com"],
    ["demo-prestamo-001",`${DEMO_AS_OF} 10:30:00`,DEMO_AS_OF,"San Isidro","Préstamo","Bruma",colors[1],"3",-1,0,"","Cuenta Demo 02","Préstamo para fotos ficticias","","equipo.demo@example.com"],
    ["demo-contenido-001",`${DEMO_AS_OF} 11:45:00`,DEMO_AS_OF,"San Isidro","Contenido","Duna",colors[2],"1",-1,0,"","Cuenta Demo 03","Producción de contenido de ejemplo","","equipo.demo@example.com"],
    ["demo-prestamo-002",`${date(-1)} 14:20:00`,date(-1),"San Isidro","Préstamo","Luma",colors[3],"2",-1,0,"","Cuenta Demo 04","Préstamo devuelto de ejemplo","","equipo.demo@example.com"],
    ["demo-vuelve-002",`${DEMO_AS_OF} 12:40:00`,DEMO_AS_OF,"San Isidro","Volvió","Luma",colors[3],"2",1,0,"","Cuenta Demo 04","Devolución del préstamo ficticio","demo-prestamo-002","equipo.demo@example.com"],
    ["demo-venta-anulada",`${date(-1)} 15:10:00`,date(-1),"San Isidro","Venta","Cedro",colors[0],"1",-1,158000,"Transferencia","Clienta Demo 030","Ejemplo de venta anulada","","equipo.demo@example.com"],
    ["demo-anulacion",`${date(-1)} 15:15:00`,date(-1),"San Isidro","Anulación","Cedro",colors[0],"1",0,0,"","","Anulada en una prueba ficticia","demo-venta-anulada","equipo.demo@example.com"],
  ];
  const days: DemoCell[][] = [];
  for(let i=-13;i<=0;i++) { const f=date(i); const vs=ventas.filter(r=>Number(r[0])===serial(f)); const gs=gastos.filter(r=>Number(r[1])===serial(f)); days.push([serial(f),["domingo","lunes","martes","miércoles","jueves","viernes","sábado"][new Date(`${f}T12:00:00Z`).getUTCDay()],"Ventas y comprobantes ficticios",gs.length,gs.reduce((a,r)=>a+Number(r[9]),0),vs.reduce((a,r)=>a+Number(r[5]),0),vs.reduce((a,r)=>a+Number(r[6]),0),i===-2?"Entrega de muestras demo":"",i===-2?"Revisar un comprobante ficticio":"","OK","","Todos los datos de este día son de ejemplo."]); }
  const timeline: DemoCell[][] = [["Fecha","Hora","Qué pasó","Detalle","Local","Monto","Quién","ID"],[DEMO_AS_OF,"08:45","Abrió el showroom demo","Se preparó la colección ficticia","San Isidro",0,"Equipo Demo","demo-nota-001"],[DEMO_AS_OF,"13:00","Llegaron muestras de Aurora","Entrega de Taller Demo Norte","Taller",0,"Equipo Demo","demo-nota-002"]];
  const expenseHead = ["ID","Fecha","Mes","Tipo","Categoría","Subcat.","Descripción","Proveedor","Medio","Importe","Moneda","Estado","Venc.","Comprobante","Notas","TC","Importe ARS","Revisión","Origen"];
  const costHead = ["Temporada","Modelo","Tela","Avíos","Confección","Estampado","Etiquetas y packaging","Merma","Costo de fábrica","Precio de venta","Comisión y envío","Datos de ejemplo"];
  const costs = DEMO_MODELS.map((m,i): DemoCell[]=>{const tela=14800+i*720,avios=1700+i*60,conf=23500+i*1100,est=900+i*80,pack=1250,merma=Math.round((tela+conf)*0.06);return["T27",m,tela,avios,conf,est,pack,merma,tela+avios+conf+est+pack+merma,prices[i],Math.round(prices[i]*0.065),1];});
  const output:DemoWorkbook[]=[
    book("demo-ventas","02 · Ventas maestro",{Todos:titleRows("Ventas",["Fecha","Mes","Canal","Clienta","Modelo","Prendas","Monto","Medio de pago","Origen","Notas"],2,ventas),"Vivo San Isidro":[["FECHA", "CLIENTE", "DNI", "UN", "$", "SEÑA", "Ruedo", "METODO DE PAGO", "LUGAR", "MODELO", "NOTAS"],...si],"Vivo Online":[["FECHA", "CLIENTE", "DNI", "UN", "$", "SEÑA", "Ruedo", "METODO DE PAGO", "LUGAR", "PROVINCIA", "MODELO", "NOTAS"],...online]}),
    book("demo-ventas-si","Ventas showroom",{VENTAS:titleRows("Ventas showroom",["Referencia","FECHA","CLIENTE","DNI","UN","$","SEÑA","Ruedo","METODO DE PAGO","LUGAR","MODELO","NOTAS"],5,si.map(r=>["DEMO",...r]))}),
    book("demo-ventas-online","Ventas online",{VENTAS:titleRows("Ventas online",["Referencia","FECHA","CLIENTE","DNI","UN","$","SEÑA","Ruedo","METODO DE PAGO","LUGAR","PROVINCIA","MODELO","NOTAS"],5,online.map(r=>["DEMO",...r]))}),
    book("demo-gastos","01 · Gastos maestro",{Gastos:titleRows("Gastos",expenseHead,5,gastos),Listas:[["Tipo","Categoría","Medio de pago"],["Fijo","Sueldos","Transferencia"],["Variable","Telas","Efectivo"],["","Talleres","Mercado Pago"],["","Publicidad","Tarjeta"]]}),
    book("demo-stock","05 · Producción y stock maestro",{Stock:titleRows("Stock",["Fecha conteo","Local","Modelo","Color","Talle","Stock inicial","Stock actual","Fuente","Temporada","Notas"],2,stock),Producción:titleRows("Producción",["Temporada","Modelo","Color","Talle","Cantidad","Taller","Estado","Entrega","Tela","Notas","Precio confeccion unit","Origen"],2,production),"Pagos a producción":titleRows("Pagos",["Fecha","Temporada","Taller","Concepto","Modelo","Monto","Moneda","Medio","Comprobante","Notas"],2,payments),"Compras de telas":titleRows("Telas",["Temporada","Fecha","Proveedor","Tela","Color","Metros","Precio por metro","Moneda","Total","Modelo destino","Notas","Origen"],2,fabrics),Movimientos:[movHead,...movements],"Stock en vivo":[["Local","Modelo","Color","Talle","Temporada","Último conteo","Contadas","Movimientos desde el conteo","Stock en vivo","Actualizado"]]}),
    book("demo-conteo","Conteo de vestidos",{"STOCK SAN ISIDRO":physical}),
    book("demo-clientas","07 · Clientas maestro",{Clientas:titleRows("Clientas",["Clienta","Segmento","Prendas","T22","T23","T24","T25","T26","T27","Última compra","Email"],2,clientRows)}),
    book("demo-canjes","08 · Canjes y préstamos",{"Canjes y préstamos":titleRows("Canjes",["Fecha","Tipo","Nombre / cuenta","Vestidos / prendas","Estado","Devolución","Notas","Contacto","Origen"],2,canjes)}),
    book("demo-maestro","17 · Carga de datos maestro",{"Días":titleRows("Días",["Fecha","Día","Qué entró","Gastos cant","Gastos $","Prendas","Ventas $","Otros","Alertas","Estado","Archivo","Aclaraciones"],8,days),Alertas:titleRows("Alertas",["Fecha","Origen","Fila/canal","Detalle","Importe","Alerta","Qué hacer","Clave"],8,[[serial(date(-2)),"Gastos","G-DEMO","Comprobante ficticio pendiente",318000,"Sin comprobante","Adjuntar un comprobante de ejemplo","demo-alerta-1"]]),"Bitácora IA":titleRows("Bitácora IA",["Fecha","Origen","Qué se revisó","Estado","Notas","Archivo"],4,[[serial(DEMO_AS_OF),"Asistente Demo","Ventas y gastos de ejemplo","OK","Análisis ficticio",""]]),"Línea del tiempo":timeline,"Instrucciones · Línea del tiempo":[["Ejemplo de registro de movimientos"],["Todos los registros de este libro son ficticios. Agregar filas de prueba con fecha, hora, descripción e ID."]]}),
    book("demo-costos","Costo unitario de cada producto",{"Costo unitario":titleRows("Costo unitario",costHead,3,costs)}),
  ];
  const launchHead=["Lanzamiento","Temp.","Tipo","Cuándo","Día L","Estado","Detalle / fuente"];
  output.push(book("demo-plan-indice","00 · Lanzamientos · índice",{Lanzamientos:planRows("Lanzamientos de la marca demo",launchHead,[["Colección Horizonte 27","T27","Colección de temporada","Agosto 2026","20/08/2026","Hecho","Archivo propio: Colección Horizonte 27"],["Cápsula Luz de tarde","T27","Cápsula","Octubre 2026","28/10/2026","En curso","Prueba ficticia de cápsula"],["Colección Horizonte 26","T26","Colección de temporada","Agosto 2025","21/08/2025","Hecho","Archivo propio: Colección Horizonte 26"],["Semana de beneficios demo","T27","Promoción","Noviembre 2026","09/11/2026","Pendiente","Plan comercial ficticio"]])}));
  const milestones=["Área","Hito","Días desde L","Fecha","Día","Responsable","Estado","De dónde sale el plazo","Notas"];
  const launchSheets=(year:number):Record<string,DemoCell[][]>=>({Hitos:planRows(`Colección Horizonte ${year}`,milestones,[["Diseño","Definir la paleta ficticia",-120,`22/04/20${year-1}`,"mié","Equipo Demo","Hecho","Plan de ejemplo",""],["Producción","Entregar las muestras",-60,`21/06/20${year-1}`,"dom","Taller Demo Norte","Hecho","Plan de ejemplo",""],["Contenido","Fotografiar la colección",-14,`06/08/20${year-1}`,"jue","Estudio Demo","Hecho","Plan de ejemplo",""],["Web","Publicar catálogo ficticio",0,`20/08/20${year-1}`,"jue","Equipo Demo","Hecho","Plan de ejemplo",""]],[["Día L (estimado)",`20/08/20${year-1}`]]),"Producción":planRows("Prendas de ejemplo",["Modelo","Moldería","Largo","Tela","Proveedor","Color","Unidades","Estado"],DEMO_MODELS.slice(0,4).map((m,i)=>[m,"Moldes demo","midi","Lino demo","Textil Demo A",colors[i],48+i*4,"Entregado"])),"Calendario de contenido":planRows("Contenido ficticio",["Fecha","Día","L","Reel","Post","Historia","TikTok","Acciones"],[["06/08","jue",-14,"Proceso de confección demo","Paleta de colores","Detrás de escena","","Sesión de fotos ficticia"],["20/08","jue",0,"Presentación demo","Colección completa","Lanzamiento","","Abrir catálogo de ejemplo"]])});
  output.push(book("demo-plan-lanzamiento-27","Colección Horizonte 27",launchSheets(27)),book("demo-plan-lanzamiento-26","Colección Horizonte 26",launchSheets(26)),book("demo-plan-modelo","Modelo · Nuevo lanzamiento",{Hitos:planRows("Modelo para un lanzamiento ficticio",milestones,[["Diseño","Definir la cápsula",-90,"","","Equipo Demo","Pendiente","Ejemplo",""]],[["Día L (estimado)","18/12/2026"]])}));
  output.push(book("demo-plan-ideas","Banco de ideas de contenido",{Ideas:planRows("Ideas de la marca demo",["Categoría","Idea","Fuente","Estado","Usada en"],[["Producto","Mostrar tres formas de usar Aurora","Propuesta ficticia","Pendiente",""],["Taller","Recorrido por una confección de ejemplo","Propuesta ficticia","Hecho","Colección Horizonte 27"],["Comunidad","Encuesta de colores para la próxima cápsula","Propuesta ficticia","Pendiente",""]]),Recursos:planRows("Recursos ficticios",["Recurso","Detalle"],[["Locación demo","Estudio sin dirección real"],["Contacto demo","equipo.demo@example.com"]])}));
  output.push(book("demo-plan-calendario","Calendario comercial y temporadas",{"Año comercial":planRows("Año comercial de ejemplo",["Mes","Lanzamientos y drops","Liquidación y promos","Fechas comerciales","Producción y diseño","Marketing"],["Agosto","Septiembre","Octubre","Noviembre","Diciembre","Enero"].map((month,i)=>[month,i===0?"Colección Horizonte":i===2?"Cápsula Luz de tarde":"Continuidad de colección",i===3?"Semana de beneficios demo":"","Calendario ficticio","Muestras y reposiciones demo","Contenido de ejemplo"])),"Ciclo de producción":planRows("Ciclo de producción de ejemplo",["Cuándo","Qué","Relativo al día L","Fuente y regla"],[["Cuatro meses antes","Diseñar una colección ficticia","L − 120","Supuesto de demostración"],["Dos meses antes","Completar las muestras","L − 60","Supuesto de demostración"],["Dos semanas antes","Preparar el contenido","L − 14","Supuesto de demostración"]]),"Checklist Cyber":planRows("Checklist de promoción demo",["Día","Paso","Área","Fecha","Día","Responsable","Estado"],[[-21,"Elegir productos demo","Producto","19/10/2026","lun","Equipo Demo","Hecho"],[-7,"Verificar el inventario ficticio","Stock","02/11/2026","lun","Equipo Demo","Pendiente"],[0,"Publicar la promoción de ejemplo","Web","09/11/2026","lun","Equipo Demo","Pendiente"]],[["Arranque online (lunes)","09/11/2026"]]),Criterios:planRows("Criterios de ejemplo",["Criterio","Detalle"],[["Coherencia","Todos los datos son ficticios"],["Reposición","Comparar ventas y stock antes de simular compras"]])}));
  const monthsHead=["Área","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const objectiveRows:DemoCell[][]=[["Producción","Diseño ficticio","Diseño ficticio","Muestras","Muestras","Telas demo","Confección demo","Control de calidad","Entrega","Reposición","Cápsula demo","Reposición","Evaluación"],["Contenido","Ideas demo","Paleta","Taller","Texturas","Proceso","Comunidad","Previa","Colección Horizonte","Estilos","Cápsula","Promoción demo","Balance"],["Ventas","Revisar métricas","Revisar métricas","Revisar métricas","Revisar métricas","Revisar métricas","Revisar métricas","Revisar métricas","Lanzamiento","Seguimiento","Seguimiento","Promoción demo","Cierre"]];
  output.push(book("demo-plan-objetivos","Objetivos · plan por área",{"Plan 2026":planRows("Objetivos ficticios 2026",monthsHead,objectiveRows),"Plan 2025":planRows("Objetivos ficticios 2025",monthsHead,objectiveRows),"Tareas de la dueña":planRows("Tareas de ejemplo",["Tarea","Descripción","Frecuencia","Área","Archivo en Codex / dónde se hace","Última vez"],[["Revisar ventas","Validar movimientos de ejemplo","Semanal","Ventas","Ventas maestro",DEMO_AS_OF],["Contar prendas","Verificar inventario ficticio","Mensual","Stock","Producción y stock",DEMO_AS_OF]]),"Tareas de vendedoras":planRows("Tareas del equipo demo",["Local","Tarea"],[["San Isidro","Atender consultas de ejemplo"],["Depósito","Revisar talles ficticios"]]),Mayoristas:planRows("Canal mayorista de ejemplo",["Objetivo","Descripción"],[["Probar un canal","Comparar escenarios ficticios sin tomar compromisos comerciales"]])}));
  // Mirror the same historical sales for the read-only history; the cutoff count already includes them.
  output.find(b => b.id === "demo-stock")!.sheets.Movimientos = [movHead, ...demoSalesMovements(ventas, DEMO_AS_OF)];
  return output;
}

const BOOKS=createBooks();
export function demoWorkbooks():DemoWorkbook[]{ return structuredClone(BOOKS); }
export function demoWorkbook(id:string):DemoWorkbook|undefined { const found=BOOKS.find(b=>b.id===id); return found?structuredClone(found):undefined; }
/** Compatibility for existing callers; normal application reads use the raw-book parsers. */
export function demoData():Data {
  const rows=BOOKS.find(b=>b.id==="demo-ventas")!.sheets.Todos.slice(1);
  const gs=BOOKS.find(b=>b.id==="demo-gastos")!.sheets.Gastos.slice(4);
  const ss=BOOKS.find(b=>b.id==="demo-stock")!.sheets.Stock.slice(1);
  const iso=(v:DemoCell)=>new Date((Number(v)-25569)*86400000).toISOString().slice(0,10);
  return {ventas:rows.map(r=>({f:iso(r[0]),canal:String(r[2]),modelo:String(r[4]),prendas:Number(r[5]),monto:Number(r[6]),medio:String(r[7]),cli:String(r[3])})),gastos:gs.map(r=>({f:iso(r[1]),cat:String(r[4]),sub:String(r[5]),tipo:String(r[3]),desc:String(r[6]),prov:String(r[7]),medio:String(r[8]),imp:Number(r[9]),est:String(r[11]),venc:typeof r[12]==="number"?iso(r[12]):String(r[12]),comp:!!r[13],rev:/revisar/i.test(String(r[17]))})),stock:ss.map(r=>({fecha:iso(r[0]),local:String(r[1]),modelo:String(r[2]),color:String(r[3]),talle:String(r[4]),stock:Number(r[6]),temporada:String(r[8])})),leido:`${DEMO_AS_OF}T15:00:00Z`};
}
