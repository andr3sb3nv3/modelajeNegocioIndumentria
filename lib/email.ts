/** Normaliza direcciones de ejemplo: Gmail ignora puntos y el sufijo que empieza con «+». */
export function normEmail(e: string) {
  let [u, d] = e.toLowerCase().trim().split("@");
  if (d === "gmail.com" || d === "googlemail.com") {
    u = u.split("+")[0].replace(/\./g, "");
    d = "gmail.com";
  }
  return `${u}@${d}`;
}
