"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAssignmentJustified, updateAssignmentTime } from "../../actions";

export default function RowActions({
  assignmentId,
  defaultDate,
  defaultTime,
  justified,
}: {
  assignmentId: string;
  defaultDate: string; // YYYY-MM-DD (Bogotá)
  defaultTime: string; // HH:mm (Bogotá)
  justified: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const [notes, setNotes] = useState("");

  function saveTime() {
    start(async () => {
      await updateAssignmentTime(assignmentId, date, time);
      setOpen(false);
      router.refresh();
    });
  }
  function toggleJustify() {
    start(async () => {
      await setAssignmentJustified(assignmentId, !justified, notes);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn btn-outline !min-h-0 !px-2.5 !py-1 text-xs"
      >
        Editar
      </button>
      {open && (
        <div
          className="absolute right-0 z-10 mt-1 w-64 rounded-xl border p-3 shadow-lg"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          <p className="mb-1 text-xs font-semibold">Horario asignado</p>
          <div className="mb-2 flex gap-2">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input !min-h-0 !py-1.5 text-xs" />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input !min-h-0 !py-1.5 text-xs" />
          </div>
          <button onClick={saveTime} disabled={pending} className="btn btn-primary mb-3 w-full !min-h-0 !py-1.5 text-xs">
            Guardar horario
          </button>

          <p className="mb-1 text-xs font-semibold">Justificación</p>
          <input
            placeholder="Nota (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input mb-2 !min-h-0 !py-1.5 text-xs"
          />
          <button onClick={toggleJustify} disabled={pending} className="btn btn-secondary w-full !min-h-0 !py-1.5 text-xs">
            {justified ? "Quitar justificación" : "Marcar como justificada"}
          </button>
        </div>
      )}
    </div>
  );
}
