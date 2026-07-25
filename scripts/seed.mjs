// ============================================================================
// Datos de demostración para NU Digital Team.
//
// Crea: 6 integrantes, 3 publicaciones con horarios rotados, y tareas
// completadas / pendientes / vencidas / justificadas.
//
// El ADMIN no lo crea este script: según lo acordado, tú creas el usuario admin
// en Supabase Auth y aquí solo se promueve su email a rol 'admin'.
//
// Uso:
//   node scripts/seed.mjs --admin tu-correo@dominio.com
//
// Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
// ============================================================================

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// --- cargar .env.local sin dependencias externas ---------------------------
function loadEnv(path = ".env.local") {
  try {
    const txt = readFileSync(path, "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* si no existe, se usan las variables del entorno */
  }
}
loadEnv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE || URL.includes("placeholder")) {
  console.error(
    "Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local",
  );
  process.exit(1);
}

const adminEmailArg = (() => {
  const i = process.argv.indexOf("--admin");
  return i >= 0 ? process.argv[i + 1] : null;
})();

const db = createClient(URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- rotación (misma lógica que src/lib/rotation.ts) -----------------------
function rotateLeft(list, offset) {
  const n = list.length;
  if (n === 0) return [];
  const k = ((offset % n) + n) % n;
  return [...list.slice(k), ...list.slice(0, k)];
}
function generateSchedule(ids, pubDate, intervalMin, windowMin, rotationIndex) {
  const ordered = rotateLeft(ids, rotationIndex);
  const base = pubDate.getTime();
  const iv = intervalMin * 60000;
  const win = windowMin * 60000;
  return ordered.map((userId, i) => {
    const assigned = base + iv * (i + 1);
    return {
      userId,
      rotation_position: i,
      assigned_datetime: new Date(assigned).toISOString(),
      deadline_datetime: new Date(assigned + win).toISOString(),
    };
  });
}

const MEMBERS = [
  { full_name: "Laura Gómez", email: "laura@nudemo.com" },
  { full_name: "Andrés Torres", email: "andres@nudemo.com" },
  { full_name: "Sara Ríos", email: "sara@nudemo.com" },
  { full_name: "Camilo Peña", email: "camilo@nudemo.com" },
  { full_name: "Valentina Cruz", email: "valentina@nudemo.com" },
  { full_name: "Mateo Vargas", email: "mateo@nudemo.com" },
];
const DEMO_PASSWORD = "Demo1234!";

async function findUserByEmail(email) {
  // Busca paginando (suficiente para datasets pequeños).
  let page = 1;
  while (page < 20) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    if (u) return u;
    if (data.users.length < 100) break;
    page++;
  }
  return null;
}

async function ensureMember(m) {
  let user = await findUserByEmail(m.email);
  if (!user) {
    const { data, error } = await db.auth.admin.createUser({
      email: m.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: m.full_name },
    });
    if (error) throw error;
    user = data.user;
    console.log(`  + creado ${m.email}`);
  } else {
    console.log(`  = ya existía ${m.email}`);
  }
  // El trigger creó el profile; aseguramos nombre/estado/rol.
  await db
    .from("profiles")
    .update({ full_name: m.full_name, role: "member", status: "active" })
    .eq("id", user.id);
  return user.id;
}

async function main() {
  console.log("Sembrando datos de demostración...");

  // 1) Integrantes
  const memberIds = [];
  for (const m of MEMBERS) memberIds.push(await ensureMember(m));

  // 2) Promover admin (si se indicó)
  let adminId = null;
  if (adminEmailArg) {
    const admin = await findUserByEmail(adminEmailArg);
    if (!admin) {
      console.warn(
        `! No existe un usuario Auth con email ${adminEmailArg}. ` +
          "Créalo en Supabase (Authentication > Users) y vuelve a ejecutar.",
      );
    } else {
      await db
        .from("profiles")
        .update({ role: "admin", status: "active" })
        .eq("id", admin.id);
      adminId = admin.id;
      console.log(`  ★ ${adminEmailArg} promovido a admin`);
    }
  }
  // created_by debe ser un profile válido; usa admin o el primer integrante.
  const createdBy = adminId ?? memberIds[0];

  // 3) Limpiar publicaciones demo previas
  await db.from("posts").delete().ilike("title", "[DEMO]%");

  const now = Date.now();
  const day = 86400000;
  const posts = [
    {
      key: "past",
      title: "[DEMO] Los errores al iniciar un GLP-1",
      description: "Ver el reel completo, dar me gusta y comentar con criterio.",
      instagram_url: "https://www.instagram.com/reel/CxAbCdEfGhI/",
      tiktok_url: "https://www.tiktok.com/@dranatalia/video/7300000000000000000",
      requested_actions: ["Ver el contenido completo", "Dar me gusta", "Guardar", "Comentar de acuerdo con el contenido"],
      publication_datetime: new Date(now - 3 * day).toISOString(),
      interval_minutes: 20,
      completion_window_minutes: 40,
      status: "finished",
      rotationIndex: 0,
    },
    {
      key: "today",
      title: "[DEMO] Mitos sobre la pérdida de peso",
      description: "Ver el video, guardar y compartir en historias.",
      instagram_url: "https://www.instagram.com/p/CyZzYyXxWwV/",
      tiktok_url: "https://www.tiktok.com/@dranatalia/video/7300000000000000001",
      requested_actions: ["Ver el contenido completo", "Dar me gusta", "Compartir"],
      publication_datetime: new Date(now - 90 * 60000).toISOString(), // hace 90 min
      interval_minutes: 20,
      completion_window_minutes: 40,
      status: "active",
      rotationIndex: 1,
    },
    {
      key: "future",
      title: "[DEMO] Qué comer antes de entrenar",
      description: "Ver el contenido y dejar un comentario auténtico.",
      instagram_url: "https://www.instagram.com/reel/CzAaBbCcDdE/",
      tiktok_url: "https://www.tiktok.com/@dranatalia/video/7300000000000000002",
      requested_actions: ["Ver el contenido completo", "Dar me gusta", "Comentar de acuerdo con el contenido"],
      publication_datetime: new Date(now + day).toISOString(), // mañana
      interval_minutes: 20,
      completion_window_minutes: 40,
      status: "scheduled",
      rotationIndex: 2,
    },
  ];

  for (const p of posts) {
    const { data: post, error } = await db
      .from("posts")
      .insert({
        title: p.title,
        description: p.description,
        instagram_url: p.instagram_url,
        tiktok_url: p.tiktok_url,
        requested_actions: p.requested_actions,
        publication_datetime: p.publication_datetime,
        interval_minutes: p.interval_minutes,
        completion_window_minutes: p.completion_window_minutes,
        status: p.status,
        created_by: createdBy,
      })
      .select()
      .single();
    if (error) throw error;

    const slots = generateSchedule(
      memberIds,
      new Date(p.publication_datetime),
      p.interval_minutes,
      p.completion_window_minutes,
      p.rotationIndex,
    );

    const rows = slots.map((s) => ({
      post_id: post.id,
      user_id: s.userId,
      assigned_datetime: s.assigned_datetime,
      deadline_datetime: s.deadline_datetime,
      rotation_position: s.rotation_position,
      status: "scheduled",
    }));
    const { data: inserted, error: aerr } = await db
      .from("assignments")
      .insert(rows)
      .select();
    if (aerr) throw aerr;

    // Demostración de estados según el tipo de publicación.
    if (p.key === "past") {
      // 0,1,2 completadas a tiempo; 3 completada tarde; 4 justificada; 5 vencida
      for (let i = 0; i < inserted.length; i++) {
        const a = inserted[i];
        if (i <= 2) {
          await completeAssignment(a, true);
        } else if (i === 3) {
          await completeAssignment(a, false); // tarde
        } else if (i === 4) {
          await db.from("assignments").update({ status: "justified", justified: true, admin_notes: "Permiso médico" }).eq("id", a.id);
        } else {
          await db.from("assignments").update({ status: "missed" }).eq("id", a.id);
        }
      }
    } else if (p.key === "today") {
      // 0 completada; 1 solo IG (incompleto); resto disponible/programada
      await completeAssignment(inserted[0], true);
      await db.from("task_completions").insert({
        assignment_id: inserted[1].id,
        platform: "instagram",
        link_opened_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        completion_status: "on_time",
      });
    }
    // future: todas quedan 'scheduled'

    console.log(`  ✓ ${p.title} — ${rows.length} asignaciones`);
  }

  // 4) Notificación de ejemplo para el primer integrante
  await db.from("notifications").insert({
    user_id: memberIds[0],
    title: "Nueva tarea asignada",
    message: "Tienes una publicación pendiente para hoy.",
  });

  console.log("\nListo. Contraseña de los integrantes demo:", DEMO_PASSWORD);
}

async function completeAssignment(a, onTime) {
  const completedAt = onTime
    ? new Date(new Date(a.assigned_datetime).getTime() + 5 * 60000)
    : new Date(new Date(a.deadline_datetime).getTime() + 10 * 60000);
  const status = onTime ? "on_time" : "late";
  for (const platform of ["instagram", "tiktok"]) {
    await db.from("task_completions").insert({
      assignment_id: a.id,
      platform,
      link_opened_at: a.assigned_datetime,
      completed_at: completedAt.toISOString(),
      completion_status: status,
    });
  }
  await db
    .from("assignments")
    .update({ status: onTime ? "completed" : "completed_late" })
    .eq("id", a.id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
