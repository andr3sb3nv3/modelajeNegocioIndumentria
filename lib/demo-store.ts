import "server-only";
import { getDemoWorkbook } from "./demo-source";
import { assertDemoSheetId } from "./config";

export const CONSULTA = "Esta aplicación es de consulta. Los datos se actualizan desde las planillas de demostración.";

export function parseDemoRange(a1: string) {
  const match = a1.match(/^(?:'((?:[^']|'')+)'|([^!]+))!(.+)$/);
  if (!match) throw new Error("Rango de demostración inválido.");
  const sheet = (match[1]?.replace(/''/g, "'") ?? match[2]).trim();
  const range = match[3].toUpperCase().match(/^([A-Z]+)?(\d+)?(?::([A-Z]+)?(\d+)?)?$/);
  if (!range || !range[1] && !range[2]) throw new Error("Rango de demostración inválido.");
  const col = (name?: string) => name ? [...name].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1 : 0;
  const r = range[2] ? Number(range[2]) - 1 : 0;
  const c = col(range[1]);
  const colon = match[3].includes(":");
  const endR = colon ? range[4] ? Number(range[4]) : undefined : range[2] ? r + 1 : undefined;
  const endC = colon ? range[3] ? col(range[3]) + 1 : undefined : range[1] ? c + 1 : undefined;
  if (r < 0 || c < 0 || r > 20000 || c > 50 || endR !== undefined && endR < r + 1 || endC !== undefined && endC < c + 1) throw new Error("Rango de demostración fuera de límites.");
  return { sheet, r, c, endR, endC };
}

export async function readDemoMetadata(id: string) {
  assertDemoSheetId(id);
  const book = await getDemoWorkbook(id);
  return { spreadsheetId: id, properties: { title: book.title }, sheets: Object.entries(book.sheets).map(([title, rows], sheetId) => ({ properties: { title, sheetId, gridProperties: { rowCount: Math.max(1000, rows.length + 100), columnCount: Math.max(26, ...rows.map(row => row.length)) } } })) };
}

/** Returns fresh copies of published fictitious cells; never saves browser or server state. */
export async function readDemoRange(id: string, a1: string): Promise<unknown[][]> {
  assertDemoSheetId(id);
  const book = await getDemoWorkbook(id);
  const range = parseDemoRange(a1);
  if (!(range.sheet in book.sheets)) throw new Error(`Unable to parse range: ${a1}`);
  const out = book.sheets[range.sheet].slice(range.r, range.endR).map(row => (row || []).slice(range.c, range.endC).map(cell => cell ?? ""));
  while (out.length && !out[out.length - 1].some(cell => cell !== "")) out.pop();
  return structuredClone(out);
}

/** Compatibility with the original reader. All mutation methods are explicitly disabled. */
export async function demoSheetsCall(url: string, init: RequestInit = {}): Promise<any> {
  if ((init.method || "GET").toUpperCase() !== "GET") throw new Error(CONSULTA);
  const endpoint = new URL(url);
  if (endpoint.origin !== "https://sheets.googleapis.com") throw new Error("Esta aplicación sólo lee sus libros ficticios de demostración.");
  const match = endpoint.pathname.match(/^\/v4\/spreadsheets\/([\w-]+)(.*)$/);
  if (!match) throw new Error("Lectura de demostración inválida.");
  const id = match[1], suffix = match[2];
  assertDemoSheetId(id);
  if (!suffix) return readDemoMetadata(id);
  if (suffix === "/values:batchGet") return { valueRanges: await Promise.all(endpoint.searchParams.getAll("ranges").map(async range => ({ range, values: await readDemoRange(id, range) }))) };
  if (suffix.startsWith("/values/") && !/:(append|clear)$/.test(suffix)) return { values: await readDemoRange(id, decodeURIComponent(suffix.slice(8))) };
  throw new Error("Esta lectura no está habilitada en la aplicación de consulta.");
}
