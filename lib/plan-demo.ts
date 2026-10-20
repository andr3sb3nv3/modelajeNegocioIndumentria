import { demoWorkbook } from "./demo";
import type { Libro, Tabla } from "./plan";

/** Planning reads the same invented raw books as the rest of the application. */
export function demoLibro(id:string):Libro {
  const b=demoWorkbook(id);
  if(!b) throw new Error("404 planilla de demostración no encontrada");
  const tablas:Tabla[]=Object.entries(b.sheets).map(([tab,values])=>{
    const rows=values.map(r=>r.map(v=>String(v??"")));
    let header=-1,best=1;
    for(let i=2;i<Math.min(rows.length,9);i++){const count=rows[i].filter(Boolean).length;if(count>best){header=i;best=count;}}
    const meta:[string,string][]=[];
    for(let i=2;i<(header<0?2:header);i++){const cells=rows[i].filter(Boolean);if(cells.length>=2)meta.push([cells[0],cells[1]]);}
    return{tab,titulo:rows[0]?.find(Boolean)||tab,nota:rows[1]?.find(Boolean)||"",meta,head:header<0?[]:rows[header],rows:rows.slice(header<0?2:header+1).filter(r=>r.some(Boolean)),pies:[]};
  });
  return{id,nombre:b.title,tablas,leido:"2026-10-20T15:00:00Z"};
}
