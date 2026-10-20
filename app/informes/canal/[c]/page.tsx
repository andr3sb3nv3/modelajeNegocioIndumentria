import { redirect } from "next/navigation";

/** Showroom San Isidro y Shop Online ahora son un filtro de canal dentro de Ventas. */
export default async function Canal({ params, searchParams }: { params: Promise<{ c: string }>; searchParams: Promise<{ p?: string }> }) {
  const { c } = await params, { p } = await searchParams;
  redirect(`/ventas?c=${encodeURIComponent(c)}${p ? `&p=${encodeURIComponent(p)}` : ""}`);
}
