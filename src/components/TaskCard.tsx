"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AssignmentStatus, Platform } from "@/lib/types";
import { formatCountdown, formatTimeBogota, msUntil } from "@/lib/datetime";
import { toDeepLink, PLATFORM_LABEL } from "@/lib/links";
import { confirmTask, registerLinkOpen } from "@/app/app/actions";
import { AssignmentBadge } from "./StatusBadge";

export interface TaskCardData {
  assignmentId: string;
  title: string;
  description: string | null;
  requestedActions: string[];
  accountLabel: string | null;
  accountInstagram: string | null;
  accountTiktok: string | null;
  assignedIso: string;
  deadlineIso: string;
  effectiveStatus: AssignmentStatus;
  isAvailable: boolean;
  platforms: {
    instagram: { required: boolean; url: string | null; completedAt: string | null; onTime: boolean | null; linkOpenedAt: string | null };
    tiktok: { required: boolean; url: string | null; completedAt: string | null; onTime: boolean | null; linkOpenedAt: string | null };
  };
}

const CONFIRM_TEXT =
  "Confirmo que realicé manualmente las actividades indicadas para esta publicación.";

export default function TaskCard({ data }: { data: TaskCardData }) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [pending, start] = useTransition();
  const [modal, setModal] = useState<Platform | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const assignedMs = new Date(data.assignedIso).getTime();
  const available = now >= assignedMs && now <= new Date(data.deadlineIso).getTime();
  const beforeStart = now < assignedMs;

  function countdownLabel() {
    if (beforeStart) return `Disponible en ${formatCountdown(msUntil(data.assignedIso, new Date(now)))}`;
    if (available) return `Tiempo restante ${formatCountdown(msUntil(data.deadlineIso, new Date(now)))}`;
    return null;
  }

  async function openPlatform(platform: Platform, url: string) {
    await registerLinkOpen(data.assignmentId, platform);
    const deep = toDeepLink(platform, url);
    if (deep) {
      // Intenta la app nativa; si no está, cae al enlace https.
      const fallback = window.setTimeout(() => {
        window.location.href = url;
      }, 1200);
      window.location.href = deep;
      window.addEventListener(
        "pagehide",
        () => window.clearTimeout(fallback),
        { once: true },
      );
    } else {
      window.open(url, "_blank", "noopener");
    }
    router.refresh();
  }

  function doConfirm(platform: Platform) {
    setError(null);
    start(async () => {
      const res = await confirmTask(data.assignmentId, platform);
      if (!res.ok) setError(res.error || "Error");
      else {
        setModal(null);
        router.refresh();
      }
    });
  }

  const cd = countdownLabel();

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          {data.accountLabel && (
            <span
              className="badge mb-1"
              style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
            >
              {data.accountLabel}
            </span>
          )}
          <h3 className="font-semibold leading-tight">{data.title}</h3>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Tu horario: <b>{formatTimeBogota(data.assignedIso)}</b> · Límite:{" "}
            {formatTimeBogota(data.deadlineIso)}
          </p>
        </div>
        <AssignmentBadge status={available && data.effectiveStatus === "scheduled" ? "available" : data.effectiveStatus} />
      </div>

      {cd && (
        <p className="mt-2 text-sm font-medium" style={{ color: "var(--primary)" }}>
          {cd}
        </p>
      )}

      {data.description && (
        <p className="mt-3 text-sm">{data.description}</p>
      )}

      {data.requestedActions.length > 0 && (
        <ul className="mt-2 list-inside list-disc text-sm" style={{ color: "var(--text-muted)" }}>
          {data.requestedActions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}

      <div className="mt-4 space-y-3">
        {(["instagram", "tiktok"] as Platform[]).map((platform) => {
          const ps = data.platforms[platform];
          if (!ps.required || !ps.url) return null;
          const done = !!ps.completedAt;
          return (
            <div key={platform} className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">
                  {PLATFORM_LABEL[platform]}
                  {(platform === "instagram" ? data.accountInstagram : data.accountTiktok) && (
                    <span className="ml-1.5 text-sm font-normal" style={{ color: "var(--text-muted)" }}>
                      @{platform === "instagram" ? data.accountInstagram : data.accountTiktok}
                    </span>
                  )}
                </span>
                {done ? (
                  <span className="text-sm" style={{ color: ps.onTime === false ? "var(--status-late)" : "var(--status-done)" }}>
                    {ps.onTime === false ? "Confirmado (tarde)" : "Confirmado ✓"}
                  </span>
                ) : (
                  <span className="text-sm" style={{ color: "var(--status-pending)" }}>Pendiente</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => openPlatform(platform, ps.url!)}
                  className="btn btn-secondary text-sm"
                >
                  Abrir {PLATFORM_LABEL[platform]}
                </button>
                <button
                  onClick={() => setModal(platform)}
                  disabled={done || beforeStart}
                  className="btn btn-primary text-sm"
                >
                  {done ? "Confirmado" : `Confirmar ${PLATFORM_LABEL[platform]}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!available && !beforeStart && data.effectiveStatus === "missed" && (
        <p className="mt-3 text-sm" style={{ color: "var(--danger)" }}>
          El tiempo límite venció. Igual puedes confirmar, pero quedará registrada como fuera de tiempo.
        </p>
      )}

      {/* Modal de confirmación */}
      {modal && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="card w-full max-w-sm p-5">
            <h4 className="mb-2 font-semibold">Confirmar {PLATFORM_LABEL[modal]}</h4>
            <p className="mb-4 text-sm">{CONFIRM_TEXT}</p>
            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setModal(null)} className="btn btn-outline">
                Cancelar
              </button>
              <button onClick={() => doConfirm(modal)} disabled={pending} className="btn btn-primary">
                {pending ? "..." : "Confirmar tarea"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
