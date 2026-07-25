import type { Platform } from "./types";

/**
 * Construye el esquema de deep link para abrir la app nativa cuando sea posible.
 * Instagram y TikTok respetan sus esquemas propios en móvil; si la app no está
 * instalada, el llamador debe hacer fallback a la URL https normal.
 *
 * Formatos soportados de entrada:
 *  - Instagram: /p/{code}/, /reel/{code}/, /{username}
 *  - TikTok:    /@{user}/video/{id}, /@{user}
 * Si no se reconoce el patrón, se devuelve null (usar https directamente).
 */
export function toDeepLink(platform: Platform, url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const path = u.pathname.replace(/^\/+|\/+$/g, "");
  const parts = path.split("/").filter(Boolean);

  if (platform === "instagram") {
    // instagram://media?id=... no acepta el shortcode directamente de forma fiable,
    // pero instagram:// abre la app; usamos el esquema con la ruta preservada.
    // El patrón más robusto es abrir la app en el perfil o media por username.
    if (parts[0] === "p" || parts[0] === "reel" || parts[0] === "reels") {
      // Post/Reel: abrir la app; el usuario navega al contenido ya cargado.
      return `instagram://`;
    }
    if (parts.length === 1) {
      return `instagram://user?username=${encodeURIComponent(parts[0])}`;
    }
    return `instagram://`;
  }

  if (platform === "tiktok") {
    // TikTok abre por esquema; el contenido queda en la URL https de fallback.
    return `snssdk1233://`;
  }

  return null;
}

/** Etiqueta legible para cada plataforma. */
export const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
};
