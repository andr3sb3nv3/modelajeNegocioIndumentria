import "server-only";
import { assertDemoSheetId } from "./config";
import { CONSULTA, demoSheetsCall } from "./demo-store";

/** Compatibility exports retained for reports; this application has no write credentials. */
export class SinPermiso extends Error {}
export async function call(url: string, init: RequestInit = {}, _planilla?: string): Promise<any> {
  if ((init.method || "GET").toUpperCase() !== "GET") throw new SinPermiso(CONSULTA);
  return demoSheetsCall(url, init);
}
export const base = (id: string) => {
  assertDemoSheetId(id);
  return `https://sheets.googleapis.com/v4/spreadsheets/${id}`;
};
export async function asegurarHoja(_id: string, _hoja: string, _head: string[], _planilla?: string): Promise<number | null> { throw new SinPermiso(CONSULTA); }
export async function agregarFilas(_id: string, _hoja: string, _head: string[], _filas: (string | number)[][], _planilla?: string): Promise<void> { throw new SinPermiso(CONSULTA); }
export async function escribirFormula(_id: string, _hoja: string, _formula: string, _planilla?: string): Promise<void> { throw new SinPermiso(CONSULTA); }
