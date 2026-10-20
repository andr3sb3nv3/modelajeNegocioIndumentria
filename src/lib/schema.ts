import { z } from "zod";
import type { Dataset } from "./types";

const id = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/);
const name = z.string().trim().min(1).max(100);
const money = z.number().finite().min(0).max(1_000_000_000);
const count = z.number().int().min(0).max(1_000_000);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "La fecha debe existir en el calendario.");

const productSchema = z
  .object({
    id,
    name,
    sku: name,
    category: name,
    price: money,
    cost: money,
    stock: count,
    minStock: count,
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  })
  .strict();

const saleSchema = z
  .object({
    id,
    date,
    productId: id,
    channel: z.enum(["Tienda online", "Showroom", "Mayorista"]),
    units: count.min(1),
    unitPrice: money,
    unitCost: money,
    discount: z.number().finite().min(0).max(1),
  })
  .strict();

const expenseSchema = z
  .object({ id, date, category: name, amount: money })
  .strict();
const productionSchema = z
  .object({
    id,
    productId: id,
    workshop: name,
    units: count.min(1),
    status: z.enum([
      "En corte",
      "En confección",
      "Control de calidad",
      "Listo",
    ]),
    dueDate: date,
  })
  .strict();

/** This public demo accepts only its deliberately narrow, explicitly fictitious data format. */
export const datasetSchema = z
  .object({
    schemaVersion: z.literal(1),
    demo: z.literal(true),
    updatedAt: z.string().datetime({ offset: true }),
    company: name,
    currency: z.literal("ARS"),
    products: z.array(productSchema).min(1).max(2_000),
    sales: z.array(saleSchema).max(5_000),
    expenses: z.array(expenseSchema).max(5_000),
    production: z.array(productionSchema).max(2_000),
  })
  .strict()
  .superRefine((dataset, ctx) => {
    for (const key of [
      "products",
      "sales",
      "expenses",
      "production",
    ] as const) {
      const seen = new Set<string>();
      dataset[key].forEach((row, index) => {
        if (seen.has(row.id))
          ctx.addIssue({
            code: "custom",
            path: [key, index, "id"],
            message: "El identificador está repetido.",
          });
        seen.add(row.id);
      });
    }
    const productIds = new Set(dataset.products.map((product) => product.id));
    for (const key of ["sales", "production"] as const) {
      dataset[key].forEach((row, index) => {
        if (!productIds.has(row.productId))
          ctx.addIssue({
            code: "custom",
            path: [key, index, "productId"],
            message: "El producto no existe.",
          });
      });
    }
    const asOf = dataset.updatedAt.slice(0, 10);
    for (const key of ["sales", "expenses"] as const) {
      dataset[key].forEach((row, index) => {
        if (row.date > asOf)
          ctx.addIssue({
            code: "custom",
            path: [key, index, "date"],
            message: "El movimiento es posterior a la actualización.",
          });
      });
    }
  });

export function parseDataset(input: unknown): Dataset {
  return datasetSchema.parse(input);
}
