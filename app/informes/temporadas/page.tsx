import { redirect } from "next/navigation";

/** Ventas Consolidado ahora vive dentro de Ventas. */
export default function Temporadas() {
  redirect("/ventas?p=temp#temporadas");
}
