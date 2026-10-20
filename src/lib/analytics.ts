import type { Dataset, Expense, Filters, Product, Sale } from "./types";

const monthNames = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];
const fullMonthNames = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const iso = (date: Date) => date.toISOString().slice(0, 10);
const monthStart = (year: number, month: number) =>
  iso(new Date(Date.UTC(year, month, 1)));
const monthEnd = (year: number, month: number) =>
  iso(new Date(Date.UTC(year, month + 1, 0)));
const sum = <T>(rows: T[], value: (row: T) => number) =>
  rows.reduce((total, row) => total + value(row), 0);
const round = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;
const ratio = (numerator: number, denominator: number) =>
  denominator === 0 ? 0 : numerator / denominator;
const change = (current: number, previous: number) =>
  previous === 0 ? 0 : (current - previous) / Math.abs(previous);
const inRange = (date: string, start: string, end: string) =>
  date >= start && date <= end;

/** Revenue after the per-line fractional discount; costs never include operating expenses. */
export const saleRevenue = (sale: Sale) =>
  round(sale.units * sale.unitPrice * (1 - sale.discount));
export const saleCost = (sale: Sale) => round(sale.units * sale.unitCost);

export function formatMoney(value: number, compact = false): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
    ...(compact
      ? { notation: "compact" as const, maximumFractionDigits: 1 }
      : {}),
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(
    value,
  );
}

/** Periods follow the fixture's month, so the demo stays coherent after publication. */
export function getDateRange(dataset: Dataset, period: Filters["period"]) {
  const anchor = new Date(dataset.updatedAt);
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  const length = period === "month" ? 1 : period === "quarter" ? 3 : month + 1;
  const firstMonth = period === "year" ? 0 : month - length + 1;
  const start = monthStart(year, firstMonth);
  const end = monthEnd(year, month);
  const previousStart =
    period === "year"
      ? monthStart(year - 1, 0)
      : monthStart(year, firstMonth - length);
  const previousEnd =
    period === "year"
      ? monthEnd(year - 1, month)
      : monthEnd(year, firstMonth - 1);
  const label =
    period === "month"
      ? `${fullMonthNames[month]} ${year}`
      : period === "quarter"
        ? `${fullMonthNames[(firstMonth + 12) % 12]} – ${fullMonthNames[month].toLowerCase()} ${year}`
        : `Enero – ${fullMonthNames[month].toLowerCase()} ${year}`;
  return { start, end, previousStart, previousEnd, label };
}

function filterSales(
  dataset: Dataset,
  filters: Filters,
  start: string,
  end: string,
): Sale[] {
  return dataset.sales.filter(
    (sale) =>
      inRange(sale.date, start, end) &&
      (filters.channel === "Todos los canales" ||
        sale.channel === filters.channel),
  );
}

export function getFilteredSales(dataset: Dataset, filters: Filters): Sale[] {
  const { start, end } = getDateRange(dataset, filters.period);
  return filterSales(dataset, filters, start, end);
}

function allocatedExpenses(
  dataset: Dataset,
  filters: Filters,
  start: string,
  end: string,
): Expense[] {
  const totalRevenue = sum(
    filterSales(
      dataset,
      { ...filters, channel: "Todos los canales" },
      start,
      end,
    ),
    saleRevenue,
  );
  const channelRevenue = sum(
    filterSales(dataset, filters, start, end),
    saleRevenue,
  );
  const share =
    filters.channel === "Todos los canales"
      ? 1
      : ratio(channelRevenue, totalRevenue);
  return dataset.expenses
    .filter((expense) => inRange(expense.date, start, end))
    .map((expense) => ({ ...expense, amount: round(expense.amount * share) }));
}

export function getFilteredExpenses(
  dataset: Dataset,
  filters: Filters,
): Expense[] {
  const { start, end } = getDateRange(dataset, filters.period);
  return allocatedExpenses(dataset, filters, start, end);
}

function aggregateBy<T>(
  rows: T[],
  key: (row: T) => string,
  value: (row: T) => number,
) {
  const result = new Map<string, number>();
  for (const row of rows)
    result.set(key(row), (result.get(key(row)) ?? 0) + value(row));
  return [...result]
    .map(([name, amount]) => ({ name, value: round(amount) }))
    .sort((a, b) => b.value - a.value);
}

export function getSummary(dataset: Dataset, filters: Filters) {
  const range = getDateRange(dataset, filters.period);
  const sales = filterSales(dataset, filters, range.start, range.end);
  const previousSales = filterSales(
    dataset,
    filters,
    range.previousStart,
    range.previousEnd,
  );
  const expenseRows = allocatedExpenses(
    dataset,
    filters,
    range.start,
    range.end,
  );
  const revenue = round(sum(sales, saleRevenue));
  const previousRevenue = round(sum(previousSales, saleRevenue));
  const units = sum(sales, (sale) => sale.units);
  const previousUnits = sum(previousSales, (sale) => sale.units);
  const cogs = round(sum(sales, saleCost));
  const grossProfit = round(revenue - cogs);
  const expenses = round(sum(expenseRows, (expense) => expense.amount));
  const operatingProfit = round(grossProfit - expenses);
  // Records are monthly product/channel batches, not individual orders.
  // Keep the agreed field name but expose a meaningful price per garment.
  const averageTicket = round(ratio(revenue, units));
  const previousTicket = ratio(previousRevenue, previousUnits);
  const productById = new Map(
    dataset.products.map((product) => [product.id, product]),
  );
  const topProducts = dataset.products
    .map((product) => {
      const rows = sales.filter((sale) => sale.productId === product.id);
      const productRevenue = sum(rows, saleRevenue);
      return {
        ...product,
        units: sum(rows, (sale) => sale.units),
        revenue: round(productRevenue),
        margin: ratio(productRevenue - sum(rows, saleCost), productRevenue),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
  const monthly: {
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }[] = [];
  const first = new Date(`${range.start}T00:00:00Z`);
  const last = new Date(`${range.end}T00:00:00Z`);
  for (
    let cursor = new Date(first);
    cursor <= last;
    cursor = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1),
    )
  ) {
    const prefix = iso(cursor).slice(0, 7);
    const monthSales = sales.filter((sale) => sale.date.startsWith(prefix));
    const monthRevenue = round(sum(monthSales, saleRevenue));
    const monthExpenses = round(
      sum(
        expenseRows.filter((expense) => expense.date.startsWith(prefix)),
        (expense) => expense.amount,
      ),
    );
    monthly.push({
      month: monthNames[cursor.getUTCMonth()],
      revenue: monthRevenue,
      expenses: monthExpenses,
      profit: round(monthRevenue - sum(monthSales, saleCost) - monthExpenses),
    });
  }
  const channels = aggregateBy(sales, (sale) => sale.channel, saleRevenue).map(
    (channel) => ({
      ...channel,
      units: sum(
        sales.filter((sale) => sale.channel === channel.name),
        (sale) => sale.units,
      ),
    }),
  );
  return {
    revenue,
    previousRevenue,
    revenueChange: change(revenue, previousRevenue),
    units,
    previousUnits,
    unitsChange: change(units, previousUnits),
    grossProfit,
    grossMargin: ratio(grossProfit, revenue),
    expenses,
    operatingProfit,
    operatingMargin: ratio(operatingProfit, revenue),
    averageTicket,
    ticketChange: change(averageTicket, previousTicket),
    monthly,
    channels,
    categories: aggregateBy(
      sales,
      (sale) => productById.get(sale.productId)?.category ?? "Sin categoría",
      saleRevenue,
    ),
    topProducts,
    expenseCategories: aggregateBy(
      expenseRows,
      (expense) => expense.category,
      (expense) => expense.amount,
    ),
    lowStock: dataset.products.filter(
      (product) => product.stock <= product.minStock,
    ),
  };
}

/** Semicolon-separated, UTF-8 BOM CSV is readable in Argentine Excel installations. */
export function exportCSV(dataset: Dataset, filters: Filters): string {
  const productById = new Map<string, Product>(
    dataset.products.map((product) => [product.id, product]),
  );
  const safeCell = (value: string | number) => {
    let text = String(value);
    // Imported demo strings must not become spreadsheet formulas when downloaded.
    if (typeof value === "string" && /^[=+@\-\t\r]/.test(text))
      text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const header = [
    "ID",
    "Fecha",
    "Producto",
    "SKU",
    "Canal",
    "Unidades",
    "Precio unitario (ARS)",
    "Descuento (%)",
    "Venta neta (ARS)",
    "Costo (ARS)",
  ];
  const rows: (string | number)[][] = getFilteredSales(dataset, filters).map(
    (sale) => {
      const product = productById.get(sale.productId);
      return [
        sale.id,
        sale.date,
        product?.name ?? sale.productId,
        product?.sku ?? "",
        sale.channel,
        sale.units,
        sale.unitPrice,
        round(sale.discount * 100),
        saleRevenue(sale),
        saleCost(sale),
      ];
    },
  );
  return (
    "\uFEFF" +
    [header, ...rows].map((row) => row.map(safeCell).join(";")).join("\r\n") +
    "\r\n"
  );
}
