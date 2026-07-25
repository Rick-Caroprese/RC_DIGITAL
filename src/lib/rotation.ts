// Lógica pura de asignación y rotación de horarios.
// Sin dependencias de Supabase para poder probarla de forma aislada.

export interface ScheduleSlot {
  userId: string;
  rotationPosition: number; // 0-based dentro de esta publicación
  assignedDatetime: Date;
  deadlineDatetime: Date;
}

export interface GenerateScheduleParams {
  /** IDs de integrantes activos, en un orden estable (p. ej. por created_at). */
  activeUserIds: string[];
  /** Momento de publicación. */
  publicationDatetime: Date;
  /** Minutos entre cada integrante. */
  intervalMinutes: number;
  /** Minutos que tiene cada integrante para completar tras su horario. */
  completionWindowMinutes: number;
  /**
   * Índice global de rotación acumulado. Determina quién empieza.
   * offset = rotationIndex % N. Post 1 (index 0) empieza en la persona 0,
   * Post 2 (index 1) en la persona 1, etc. — nadie es siempre el primero.
   */
  rotationIndex: number;
}

/**
 * Rota una lista `offset` posiciones a la izquierda.
 * rotateLeft([A,B,C], 1) => [B,C,A]
 */
export function rotateLeft<T>(list: T[], offset: number): T[] {
  const n = list.length;
  if (n === 0) return [];
  const k = ((offset % n) + n) % n;
  return [...list.slice(k), ...list.slice(0, k)];
}

/**
 * Genera los horarios de una publicación.
 *
 * Regla de tiempo (confirmada): el primer turno = publicación + intervalo.
 *   posición i (0-based) -> assigned = publicación + intervalo * (i + 1)
 *   deadline = assigned + ventana de finalización
 *
 * Garantías:
 *  - Nunca asigna dos personas al mismo horario (los intervalos son distintos).
 *  - El orden rota según rotationIndex para repartir de forma justa los
 *    primeros y últimos turnos.
 */
export function generateSchedule(params: GenerateScheduleParams): ScheduleSlot[] {
  const {
    activeUserIds,
    publicationDatetime,
    intervalMinutes,
    completionWindowMinutes,
    rotationIndex,
  } = params;

  if (activeUserIds.length === 0) return [];
  if (intervalMinutes <= 0) {
    throw new Error("intervalMinutes debe ser mayor que 0");
  }
  if (completionWindowMinutes <= 0) {
    throw new Error("completionWindowMinutes debe ser mayor que 0");
  }

  const ordered = rotateLeft(activeUserIds, rotationIndex);
  const baseMs = publicationDatetime.getTime();
  const intervalMs = intervalMinutes * 60_000;
  const windowMs = completionWindowMinutes * 60_000;

  return ordered.map((userId, i) => {
    const assignedMs = baseMs + intervalMs * (i + 1);
    return {
      userId,
      rotationPosition: i,
      assignedDatetime: new Date(assignedMs),
      deadlineDatetime: new Date(assignedMs + windowMs),
    };
  });
}
