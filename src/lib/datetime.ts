// Helpers de fecha/hora. Todo se guarda en UTC (timestamptz) y se muestra
// en la zona horaria de Bogotá.

export const APP_TIMEZONE = "America/Bogota";

/** "6:30 p. m." */
export function formatTimeBogota(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: APP_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/** "vie, 25 jul 2026" */
export function formatDateBogota(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: APP_TIMEZONE,
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** "vie, 25 jul, 6:30 p. m." */
export function formatDateTimeBogota(iso: string | Date): string {
  return `${formatDateBogota(iso)}, ${formatTimeBogota(iso)}`;
}

/** Clave YYYY-MM-DD del día en Bogotá (para agrupar "tareas de hoy"). */
export function bogotaDayKey(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  // en-CA da formato ISO YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Devuelve el rango [inicio, fin) de la semana (lunes 00:00 a lunes 00:00)
 * en hora de Bogotá que contiene la fecha dada, como instantes UTC.
 */
export function bogotaWeekRange(ref: Date = new Date()): {
  start: Date;
  end: Date;
} {
  // Día de la semana en Bogotá (0=domingo ... 6=sábado)
  const weekdayStr = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    weekday: "short",
  }).format(ref);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dow = map[weekdayStr] ?? 1;
  const daysFromMonday = (dow + 6) % 7; // lunes = 0

  const dayKey = bogotaDayKey(ref); // YYYY-MM-DD en Bogotá
  // Bogotá es UTC-5 (sin horario de verano) -> medianoche Bogotá = 05:00 UTC
  const midnightBogotaUtc = new Date(`${dayKey}T05:00:00.000Z`);
  const start = new Date(
    midnightBogotaUtc.getTime() - daysFromMonday * 86_400_000,
  );
  const end = new Date(start.getTime() + 7 * 86_400_000);
  return { start, end };
}

/** Valor para <input type="date"> en hora de Bogotá: "YYYY-MM-DD". */
export function bogotaDateInput(iso: string | Date): string {
  return bogotaDayKey(iso);
}

/** Valor para <input type="time"> en hora de Bogotá: "HH:mm" (24h). */
export function bogotaTimeInput(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** Milisegundos restantes hasta `target` (puede ser negativo). */
export function msUntil(target: string | Date, now: Date = new Date()): number {
  const d = typeof target === "string" ? new Date(target) : target;
  return d.getTime() - now.getTime();
}

/** Formatea una cuenta regresiva "1h 05m" / "12m 30s" / "vencido". */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "0m";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}
