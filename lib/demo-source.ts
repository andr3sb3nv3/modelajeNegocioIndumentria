import "server-only";
import { demoWorkbook, type DemoWorkbook } from "./demo";
import { assertDemoSheetId, DEMO_DRIVE, logicalSheetId } from "./config";
import { parseDemoCsv } from "./demo-csv";

type Snapshot = { schemaVersion: 2; demo: true; asOf: string; books: DemoWorkbook[] };
type Source = "sheets" | "snapshot" | "bundled";
type CachedBook = { until: number; value: DemoWorkbook; source: Source };
const MAX_BYTES = 2_000_000;
const books = new Map<string, CachedBook>();
const pending = new Map<string, Promise<CachedBook>>();
let cachedSnapshot: { until: number; value: Snapshot | null } | undefined;
let pendingSnapshot: Promise<Snapshot | null> | undefined;

export function validateDemoSnapshot(input: unknown): Snapshot {
  if (!input || typeof input !== "object") throw new Error("Formato de demo inválido.");
  const s = input as Snapshot;
  if (s.schemaVersion !== 2 || s.demo !== true || s.asOf !== DEMO_DRIVE.asOf || !Array.isArray(s.books) || s.books.length !== Object.keys(DEMO_DRIVE.books).length) throw new Error("La fuente no es la biblioteca ficticia esperada.");
  const ids = new Set<string>();
  for (const book of s.books) {
    if (!book || typeof book.id !== "string" || ids.has(book.id) || !Object.hasOwn(DEMO_DRIVE.books, book.id) || typeof book.title !== "string" || book.title.length > 180 || !book.sheets || typeof book.sheets !== "object") throw new Error("Libro de demo inválido.");
    ids.add(book.id);
    for (const [name, rows] of Object.entries(book.sheets)) {
      if (!name || name.length > 100 || !Array.isArray(rows) || rows.length > 6000) throw new Error("Hoja de demo inválida.");
      for (const row of rows) {
        if (!Array.isArray(row) || row.length > 40 || row.some(cell => cell !== null && typeof cell !== "boolean" && !(typeof cell === "number" && Number.isFinite(cell)) && !(typeof cell === "string" && cell.length <= 3000))) throw new Error("Celda de demo inválida.");
      }
    }
  }
  return s;
}

async function readPublicText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: "no-store", credentials: "omit" });
    if (!response.ok || /text\/html/i.test(response.headers.get("content-type") || "")) throw new Error("La planilla de demostración no está disponible.");
    if (Number(response.headers.get("content-length") || 0) > MAX_BYTES || !response.body) throw new Error("Fuente de demostración inválida.");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) throw new Error("La fuente excede el tamaño de la demo.");
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => {}); }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } finally { clearTimeout(timeout); }
}

async function snapshot(): Promise<Snapshot | null> {
  if (cachedSnapshot && cachedSnapshot.until > Date.now()) return cachedSnapshot.value;
  if (!pendingSnapshot) pendingSnapshot = (async () => {
    try {
      const id = DEMO_DRIVE.snapshotFileId;
      if (!/^[\w-]{10,200}$/.test(id)) return null;
      return validateDemoSnapshot(JSON.parse(await readPublicText(`https://drive.google.com/uc?export=download&id=${id}`)));
    } catch { return null; }
  })().then(value => { cachedSnapshot = { value, until: Date.now() + 60_000 }; return value; }).finally(() => { pendingSnapshot = undefined; });
  return pendingSnapshot;
}

async function readNativeBook(logical: string, fallback: DemoWorkbook): Promise<DemoWorkbook> {
  const id = (DEMO_DRIVE.books as Record<string, string>)[logical];
  const tabs = (DEMO_DRIVE as { tabs?: Record<string, Record<string, number>> }).tabs?.[logical];
  if (!/^[\w-]{20,200}$/.test(id) || !tabs || Object.keys(tabs).length !== Object.keys(fallback.sheets).length) throw new Error("Biblioteca de demostración no configurada.");
  const sheets = await Promise.all(Object.entries(tabs).map(async ([name, gid]) => {
    if (!(name in fallback.sheets) || !Number.isSafeInteger(gid) || gid < 0) throw new Error("Pestaña ficticia inválida.");
    const csv = await readPublicText(`https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`);
    return [name, parseDemoCsv(csv)] as const;
  }));
  return { id: logical, title: fallback.title, sheets: Object.fromEntries(sheets) };
}

/** Only the 17 explicitly configured fictitious books can be read. No credentials or Drive discovery. */
export async function getDemoWorkbook(id: string): Promise<DemoWorkbook> {
  assertDemoSheetId(id);
  const logical = logicalSheetId(id);
  const previous = books.get(logical);
  if (previous && previous.until > Date.now()) return structuredClone(previous.value);
  if (!pending.has(logical)) pending.set(logical, (async (): Promise<CachedBook> => {
    const fallback = demoWorkbook(logical);
    if (!fallback) throw new Error("No se encontró la planilla ficticia de prueba.");
    try { return { value: await readNativeBook(logical, fallback), source: "sheets", until: Date.now() + 60_000 }; }
    catch {
      const backup = (await snapshot())?.books.find(book => book.id === logical);
      return { value: backup || fallback, source: backup ? "snapshot" : "bundled", until: Date.now() + 15_000 };
    }
  })().then(value => { books.set(logical, value); return value; }).finally(() => { pending.delete(logical); }));
  return structuredClone((await pending.get(logical)!).value);
}

export function demoSourceStatus() {
  const sources = { sheets: 0, snapshot: 0, bundled: 0 };
  for (const book of books.values()) sources[book.source]++;
  return { sources, demo: true, asOf: DEMO_DRIVE.asOf, books: Object.keys(DEMO_DRIVE.books).length, refreshSeconds: 60 };
}
