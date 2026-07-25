import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bogotaDayKey, bogotaWeekRange } from "@/lib/datetime";
import { computeWeekly, type WeeklyRow } from "@/lib/weekly";

// Exporta el cumplimiento semanal en CSV. Verifica admin en el servidor.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("No autenticado", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin" || profile.status !== "active") {
    return new NextResponse("No autorizado", { status: 403 });
  }

  const { start, end } = bogotaWeekRange();
  const { data } = await supabase
    .from("assignments")
    .select("*, profiles(full_name, email), posts(instagram_url, tiktok_url), task_completions(platform, link_opened_at, completed_at, completion_status)")
    .gte("assigned_datetime", start.toISOString())
    .lt("assigned_datetime", end.toISOString());

  const stats = computeWeekly((data ?? []) as WeeklyRow[]);

  const headers = [
    "Integrante",
    "Asignadas",
    "IG asignadas",
    "TikTok asignadas",
    "Completadas",
    "A tiempo",
    "Vencidas",
    "Justificadas",
    "Cumplimiento %",
  ];
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(","),
    ...stats.map((s) =>
      [
        esc(s.fullName),
        s.assigned,
        s.igAssigned,
        s.ttAssigned,
        s.completed,
        s.onTime,
        s.overdue,
        s.justified,
        s.compliancePct,
      ].join(","),
    ),
  ];
  // BOM para que Excel lea bien los acentos.
  const csv = "﻿" + lines.join("\r\n");
  const filename = `cumplimiento_${bogotaDayKey(start)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
