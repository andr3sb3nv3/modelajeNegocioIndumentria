import { redirect } from "next/navigation";

/** La Prueba 5 pasó a ser la sección real «Interacción con Claude y Codex» */
export default async function Prueba5({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const qs = new URLSearchParams(await searchParams).toString();
  redirect(qs ? `/ia?${qs}` : "/ia");
}
