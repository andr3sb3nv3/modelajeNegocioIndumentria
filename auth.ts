import { redirect } from "next/navigation";
export { normEmail } from "./lib/email";
export const isAllowed = () => true;
export async function auth() { return { user: { name: "Visitante demo", email: "demo@example.com" } }; }
export async function signIn(..._args: unknown[]) { redirect("/"); }
export async function signOut(..._args: unknown[]) { redirect("/"); }
const disabled = () => Response.json({ error: "La demo no requiere iniciar sesión." }, {status:404});
export const handlers = { GET: disabled, POST: disabled };
