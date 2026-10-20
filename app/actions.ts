"use server";
import { signOut } from "@/auth";

export async function salir() {
  await signOut({ redirectTo: "/login" });
}
