export type Channel = "Tienda online" | "Showroom" | "Mayorista";
export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  color: string;
};
export type Sale = {
  id: string;
  date: string;
  productId: string;
  channel: Channel;
  units: number;
  unitPrice: number;
  unitCost: number;
  discount: number;
};
export type Expense = {
  id: string;
  date: string;
  category: string;
  amount: number;
};
export type Production = {
  id: string;
  productId: string;
  workshop: string;
  units: number;
  status: "En corte" | "En confección" | "Control de calidad" | "Listo";
  dueDate: string;
};
export type Dataset = {
  schemaVersion: 1;
  demo: true;
  updatedAt: string;
  company: string;
  currency: "ARS";
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  production: Production[];
};
export type DataResponse = {
  dataset: Dataset;
  source: "drive" | "bundled";
  syncedAt: string;
  warning?: string;
};
export type Filters = {
  period: "month" | "quarter" | "year";
  channel: Channel | "Todos los canales";
};
