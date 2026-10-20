/** Numeric display in our es_AR Sheets; identifiers and dates remain text. */
export function demoNumber(value: string): number | null {
  const text = value.trim().replace(/^(?:ARS|\$)\s*/i, "").replace(/[\u00a0\u202f]/g, "");
  if (!/^-?(?:0|[1-9]\d*|[1-9]\d{0,2}(?:\.\d{3})+)(?:,\d*)?$/.test(text) && !/^-?(?:0|[1-9]\d*)\.(?:\d{0,2}|\d{4,})$/.test(text)) return null;
  const normalized = text.includes(",") || /^-?[1-9]\d{0,2}(?:\.\d{3})+$/.test(text) ? text.replace(/\./g, "").replace(",", ".") : text;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

/** Google Sheets CSV export preserves the visible grid, including empty leading rows. */
export function parseDemoCsv(csv: string): (string | number)[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  const input = csv.replace(/^\uFEFF/, "");
  const finishCell = () => { row.push(cell); cell = ""; };
  const finishRow = () => { finishCell(); rows.push(row); row = []; };
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i++; }
      else if (quoted || !cell) quoted = !quoted;
      else cell += c;
    } else if (!quoted && c === ",") finishCell();
    else if (!quoted && (c === "\n" || c === "\r")) {
      if (c === "\r" && input[i + 1] === "\n") i++;
      finishRow();
    } else cell += c;
    if (cell.length > 3000 || row.length > 40 || rows.length > 6000) throw new Error("La hoja de demostración excede los límites.");
  }
  if (quoted) throw new Error("CSV de demostración incompleto.");
  if (cell || row.length || input && !/[\r\n]$/.test(input)) finishRow();
  if (rows.length > 6000 || rows.some(r => r.length > 40)) throw new Error("La hoja de demostración excede los límites.");
  return rows.map(r => r.map(value => demoNumber(value) ?? value));
}
