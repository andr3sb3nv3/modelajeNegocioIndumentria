import { redirect } from "next/navigation";

/** La demo es pública y no solicita una cuenta. */
export default function Login() { redirect("/"); }
