export default function Logo({ size = 34, stacked = false }: { size?: number; stacked?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        aria-hidden
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.32,
          display: "inline-grid",
          placeItems: "center",
          background: "linear-gradient(140deg, var(--primary), var(--primary-hover))",
          color: "var(--primary-contrast)",
          fontWeight: 800,
          fontSize: size * 0.42,
          letterSpacing: "-0.03em",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        Q
      </span>
      <span className={stacked ? "flex flex-col leading-tight" : "leading-none"}>
        <span className="text-[15px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
          QUBICA <span style={{ color: "var(--primary)" }}>Marketing</span>
        </span>
      </span>
    </span>
  );
}
