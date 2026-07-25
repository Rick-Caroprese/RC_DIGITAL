"use client";

import { useState, useTransition } from "react";
import { setMemberStatus } from "../actions";

export default function StatusToggle({
  userId,
  active,
}: {
  userId: string;
  active: boolean;
}) {
  const [isActive, setIsActive] = useState(active);
  const [pending, start] = useTransition();

  function toggle() {
    const next = !isActive;
    start(async () => {
      const res = await setMemberStatus(userId, next);
      if (res.ok) setIsActive(next);
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className="btn btn-outline !min-h-0 !px-3 !py-1.5 text-sm"
      style={{ color: isActive ? "var(--status-missed)" : "var(--primary)" }}
    >
      {pending ? "..." : isActive ? "Desactivar" : "Activar"}
    </button>
  );
}
