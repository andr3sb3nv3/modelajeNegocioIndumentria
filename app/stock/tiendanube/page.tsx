import { redirect } from "next/navigation";

/** Acceso a la vista de consulta de ventas online. */
export default function VentasOnlinePage() {
  redirect("/stock?v=tn");
}
