import { redirect } from "next/navigation";

/** El historial ahora es la vista «Ventas y movimientos» de Stock. */
export default function HistorialPage() {
  redirect("/stock?v=mov");
}
