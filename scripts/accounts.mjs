// Carga las cuentas (IG+TikTok) de cada integrante en member_accounts.
// Idempotente: reemplaza las cuentas existentes de cada correo.
// Uso: node scripts/accounts.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path = ".env.local") {
  const txt = readFileSync(path, "utf8");
  for (const line of txt.split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv();
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// [email, [ [ig, tt], ... ] ]  (null si no hay handle)
const DATA = [
  ["oscarbernal1018@gmail.com", [
    ["oscarbernal18", "bernal1018"],
    ["lilianapalomino.73", "lilianapalomino95"],
    ["andressuarez19_", "iwannabeyouuursss"],
  ]],
  ["bertelvalentina81@gmail.com", [
    ["Milenamendoza15", "milena12_mendoza"],
    ["luisenriquebertel", "luis.enrique12_0"],
    ["Valentina_bertel08", "Valentina-09164"],
  ]],
  ["camiloromero2618@gmail.com", [
    ["Camilo_romero65", "Camilor_65"],
    ["Juan_hamster10", "Juxncho1010"],
  ]],
  ["acostashaira060@gmail.com", [
    ["Yulianaacosta347", "gallego_yuliana"],
    ["Yuliana45373", "Gallego.yuliana3"],
    ["Aligátor.8765602", "Once3.3"],
  ]],
  ["danieljulianescobarabello8@gmail.com", [
    ["dxniel_escobar02", "dxni_z70"],
    ["santiago_pena86", "daniel_escobar2020"],
    ["david_epalza20", "saca_frijol203"],
  ]],
  ["jhefermazo077@gmail.com", [
    ["juanma28870", "paisavargas82"],
    ["paisavargas234", "pepe.nerin"],
    ["jhefermazoo", "jhefersonmazo"],
  ]],
  ["sallvatorecabas@gmail.com", [
    ["Sallvatore4", "salva10105"],
    ["Tore101110", "Sallvatore.cabas"],
    ["Cabasmarulanda", "sallvat8"],
  ]],
  ["marinella_2001@gmail.com", [
    ["jeferson_hernandezgomez", "jeferson.hernande23"],
    ["giseth.Km", "jeferson.hernande23"],
    ["Virginiavallejo21", "virginiavallejo_"],
  ]],
];

async function findUserId(email) {
  let page = 1;
  while (page < 25) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const u = data.users.find((x) => (x.email || "").toLowerCase() === email.toLowerCase());
    if (u) return u.id;
    if (data.users.length < 100) break;
    page++;
  }
  return null;
}

const clean = (h) => (h ? h.trim().replace(/^@/, "") || null : null);

async function main() {
  for (const [email, accounts] of DATA) {
    const uid = await findUserId(email);
    if (!uid) { console.log("! no existe usuario", email); continue; }
    await db.from("member_accounts").delete().eq("user_id", uid);
    const rows = accounts.map(([ig, tt], i) => ({
      user_id: uid,
      label: `Cuenta ${i + 1}`,
      instagram_handle: clean(ig),
      tiktok_handle: clean(tt),
      position: i,
      active: true,
    }));
    const { error } = await db.from("member_accounts").insert(rows);
    console.log(`${error ? "!" : "✓"} ${email}: ${rows.length} cuentas ${error?.message || ""}`);
  }
  const { count } = await db.from("member_accounts").select("id", { count: "exact", head: true });
  console.log("\nTotal cuentas en el sistema:", count);
}
main().catch((e) => { console.error(e); process.exit(1); });
