import { redirect } from "next/navigation";

/** El mes ahora vive en Inicio (botón «Mes»). */
export default async function Mes({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const m = (await searchParams).m;
  redirect(m && /^\d{4}-\d{2}$/.test(m) ? `/?v=mes&m=${m}` : "/?v=mes");
}
