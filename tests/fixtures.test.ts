import test from "node:test";
import assert from "node:assert/strict";
import { DEMO_AS_OF, DEMO_MODELS, demoData, demoWorkbook, demoWorkbooks } from "../lib/demo";
import { demoLibro } from "../lib/plan-demo";
import mayorista from "../data/mayorista/modelo.json";
import multi from "../data/mayorista/multimarcas.json";

test("all 17 independent demo books have logical IDs, unique sheets and no production references",()=>{
 const books=demoWorkbooks();assert.equal(books.length,17);assert.equal(new Set(books.map(b=>b.id)).size,17);
 for(const b of books){assert.match(b.id,/^demo-/);assert.match(b.title,/DEMO/);assert.ok(Object.keys(b.sheets).length);}
 const serialized=JSON.stringify(books);assert.doesNotMatch(serialized,/IMPORTRANGE|docs\.google\.com|drive\.google\.com|BENVE/);
 assert.doesNotMatch(serialized,/@(?!example\.com)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
});
test("raw sales preserve parser positions and start empty for explicitly requested future population",()=>{
 const si=demoWorkbook("demo-ventas-si")!.sheets.VENTAS;
 assert.equal(si[3][1],"FECHA");assert.equal(si[3][10],"MODELO");assert.equal(si.length,4);
 const online=demoWorkbook("demo-ventas-online")!.sheets.VENTAS;assert.equal(online[3][11],"MODELO");
 const d=demoData();assert.equal(d.ventas.length,0);assert.ok(d.ventas.every(v=>v.f<DEMO_AS_OF));
 assert.ok(d.ventas.every(v=>DEMO_MODELS.includes(v.modelo)));assert.ok(d.ventas.every(v=>v.monto>0&&v.prendas>0));
});
test("raw expense, stock and diary matrices use the expected rows and coherent numeric fields",()=>{
 const g=demoWorkbook("demo-gastos")!.sheets.Gastos;assert.equal(g[3][1],"Fecha");assert.equal(g[3][16],"Importe ARS");
 for(const r of g.slice(4))assert.equal(r[9],r[16]);
 const m=demoWorkbook("demo-maestro")!.sheets;assert.equal(m.Días[6][0],"Fecha");assert.equal(m.Alertas[6][5],"Alerta");
 const stock=demoWorkbook("demo-stock")!.sheets;assert.equal(stock.Movimientos[0].length,15);assert.equal(stock.Movimientos.length,1);

 assert.ok(demoData().stock.every(s=>s.stock>=0&&DEMO_MODELS.includes(s.modelo)));
});
test("book reads return isolated snapshots and planning tables come from the same registry",()=>{
 const a=demoWorkbook("demo-ventas")!;a.sheets.Todos[0][4]="Mutated";
 assert.notEqual(demoWorkbook("demo-ventas")!.sheets.Todos[0][4],"Mutated");
 assert.equal(demoLibro("demo-plan-indice").tablas[0].head[0],"Lanzamiento");
 assert.ok(demoLibro("demo-plan-lanzamiento-27").tablas.some(t=>t.tab==="Hitos"));
});
test("wholesale fixtures reconcile from invented inputs rather than copied amounts",()=>{
 for(const d of [mayorista,multi]){assert.equal(d.modelos.length,8);assert.ok(d.modelos.every(m=>DEMO_MODELS.includes(m.modelo)));assert.ok(d.supuestos.every(s=>s.estado==="Ejemplo"));}
 for(const m of mayorista.modelos){assert.ok(Math.abs(m.dejaOn-(m.pvp-m.fab-m.onCom-m.onEnv-m.onFal-m.onCac))<.001);assert.ok(Math.abs(m.dejaRev-(m.rev-m.fab-m.revCob))<.001);}
 for(const m of multi.modelos){assert.ok(Math.abs(m.deja-(m.may-m.costo))<.001);assert.ok(Math.abs(m.dejaFijo-(m.deja-m.fijo))<.001);}
 for(const e of multi.escenarios){assert.equal(e.ent,e.vend+e.dev);assert.ok(Math.abs(e.res-(e.contrib-e.fijos))<.001);assert.ok(Math.abs(e.resMes-e.res/multi.params.meses)<.001);}
});
