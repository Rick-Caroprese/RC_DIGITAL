// Lógica pura de asignación y rotación de horarios por CUENTA.
// Sin dependencias de Supabase para poder probarla de forma aislada.

export interface AccountSlot {
  userId: string;
  accountId: string;
  rotationPosition: number; // 0-based (orden global dentro de la publicación)
  assignedDatetime: Date;
  deadlineDatetime: Date;
}

export interface PersonAccounts {
  userId: string;
  accountIds: string[]; // cuentas activas, en orden estable
}

export interface GenerateAccountScheduleParams {
  /** Integrantes activos con sus cuentas activas (solo quienes tengan ≥1). */
  peopleAccounts: PersonAccounts[];
  /** Momento de publicación. */
  publicationDatetime: Date;
  /** Ventana total (minutos) en la que se reparten TODAS las cuentas. */
  totalWindowMinutes: number;
  /** Minutos que tiene cada cuenta para completar tras su horario. */
  completionWindowMinutes: number;
  /** Índice global de rotación acumulado (determina quién empieza). */
  rotationIndex: number;
}

/** Rota una lista `offset` posiciones a la izquierda. */
export function rotateLeft<T>(list: T[], offset: number): T[] {
  const n = list.length;
  if (n === 0) return [];
  const k = ((offset % n) + n) % n;
  return [...list.slice(k), ...list.slice(0, k)];
}

/**
 * Genera los horarios por cuenta de una publicación.
 *
 * Estrategia anti-patrón (evitar que una persona interactúe desde todas sus
 * cuentas a la vez): se intercala por persona ("round-robin"). Se reparte
 * primero la 1ª cuenta de cada persona, luego la 2ª de cada una, etc. Esto hace
 * que las cuentas de una misma persona queden repartidas de forma pareja a lo
 * largo de toda la ventana.
 *
 * Tiempo: las S cuentas se distribuyen uniformemente entre `publicación` y
 * `publicación + ventana total`. Con S cuentas: la 1ª cae en la publicación y la
 * última al final de la ventana.
 *
 * Rotación: `rotationIndex` rota qué persona empieza, para repartir de forma
 * justa los primeros y últimos turnos entre publicaciones.
 */
export function generateAccountSchedule(
  params: GenerateAccountScheduleParams,
): AccountSlot[] {
  const {
    peopleAccounts,
    publicationDatetime,
    totalWindowMinutes,
    completionWindowMinutes,
    rotationIndex,
  } = params;

  if (totalWindowMinutes <= 0) throw new Error("totalWindowMinutes debe ser > 0");
  if (completionWindowMinutes <= 0) throw new Error("completionWindowMinutes debe ser > 0");

  const people = peopleAccounts.filter((p) => p.accountIds.length > 0);
  if (people.length === 0) return [];

  const ordered = rotateLeft(people, rotationIndex);
  const maxK = Math.max(...ordered.map((p) => p.accountIds.length));

  // Intercalado por persona.
  const order: { userId: string; accountId: string }[] = [];
  for (let r = 0; r < maxK; r++) {
    for (const person of ordered) {
      const accountId = person.accountIds[r];
      if (accountId) order.push({ userId: person.userId, accountId });
    }
  }

  const S = order.length;
  const baseMs = publicationDatetime.getTime();
  const windowMs = totalWindowMinutes * 60_000;
  const graceMs = completionWindowMinutes * 60_000;
  // Espaciado uniforme: primera en la publicación, última al final de la ventana.
  const stepMs = S > 1 ? windowMs / (S - 1) : 0;

  return order.map((o, i) => {
    const assignedMs = baseMs + Math.round(stepMs * i);
    return {
      userId: o.userId,
      accountId: o.accountId,
      rotationPosition: i,
      assignedDatetime: new Date(assignedMs),
      deadlineDatetime: new Date(assignedMs + graceMs),
    };
  });
}
