import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import type { AppNotification } from "@/lib/types";
import { formatDateTimeBogota } from "@/lib/datetime";
import { markNotificationRead, markAllRead } from "./actions";

export default async function NotificationsPage() {
  const profile = await requireMember();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const items = (data ?? []) as AppNotification[];
  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Avisos</h1>
        {unread > 0 && (
          <form action={markAllRead}>
            <button className="btn btn-outline !min-h-0 !px-3 !py-1.5 text-sm">
              Marcar todo como leído
            </button>
          </form>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card p-6 text-center" style={{ color: "var(--text-muted)" }}>
          No tienes avisos.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <div
              key={n.id}
              className="card p-4"
              style={{ borderLeft: n.read ? undefined : "3px solid var(--primary)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{n.title}</p>
                  {n.message && <p className="text-sm" style={{ color: "var(--text-muted)" }}>{n.message}</p>}
                  <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatDateTimeBogota(n.created_at)}
                  </p>
                </div>
                {!n.read && (
                  <form action={markNotificationRead.bind(null, n.id)}>
                    <button className="btn btn-outline !min-h-0 !px-2.5 !py-1 text-xs">
                      Leído
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
