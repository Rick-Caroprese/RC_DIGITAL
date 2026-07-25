// Marca Qubika Studio: anillo "Q" con cubo isométrico como cola.
export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Qubika Studio"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="qk-ring" x1="30" y1="14" x2="60" y2="74" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#88a294" />
          <stop offset="0.55" stopColor="#5c7367" />
          <stop offset="1" stopColor="#43554b" />
        </linearGradient>
        <linearGradient id="qk-top" x1="42" y1="40" x2="74" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e3eee7" />
          <stop offset="1" stopColor="#c3d6ca" />
        </linearGradient>
      </defs>

      {/* Anillo (Q) */}
      <circle cx="44" cy="42" r="26" fill="none" stroke="url(#qk-ring)" strokeWidth="15" />

      {/* Cubo isométrico (cola de la Q) */}
      {/* cara superior */}
      <path d="M58 40 L74 48 L58 56 L42 48 Z" fill="url(#qk-top)" />
      {/* cara izquierda */}
      <path d="M42 48 L58 56 L58 74 L42 66 Z" fill="#93ab9e" />
      {/* cara derecha */}
      <path d="M74 48 L58 56 L58 74 L74 66 Z" fill="#728d80" />
    </svg>
  );
}

export default function Logo({ size = 34 }: { size?: number; stacked?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="leading-none">
        <span className="text-[15px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
          Qubika <span style={{ color: "var(--primary)" }}>Studio</span>
        </span>
      </span>
    </span>
  );
}
