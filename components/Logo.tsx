/** Monograma independiente para el tablero de modelaje. */
export function Logo({ size = 44 }: { size?: number }) {
  return <svg role="img" aria-label="Modelaje" width={size} height={size} viewBox="0 0 100 100" fill="none" style={{ flex: "none" }}>
    <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="3" />
    <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="1" opacity=".45" />
    <path d="M28 70V30h8l14 23 14-23h8v40h-9V47L50 67 37 47v23z" fill="currentColor" />
  </svg>;
}
