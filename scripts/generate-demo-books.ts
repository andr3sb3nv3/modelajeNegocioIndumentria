import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEMO_AS_OF, demoWorkbooks } from "../lib/demo";

async function main(){
const destination=path.resolve(process.argv[2]||"artifacts/demo-workbooks.json");
await mkdir(path.dirname(destination),{recursive:true});
const books=demoWorkbooks();
const snapshot=JSON.stringify({schemaVersion:2,demo:true,asOf:DEMO_AS_OF,books})+"\n";
if(Buffer.byteLength(snapshot,"utf8")>2_000_000)throw new Error("El snapshot supera el límite de lectura de la demo.");
await writeFile(destination,snapshot);
console.log(`Generated ${books.length} fictitious workbooks: ${destination}`);

}
main().catch(error=>{console.error(error);process.exitCode=1;});
