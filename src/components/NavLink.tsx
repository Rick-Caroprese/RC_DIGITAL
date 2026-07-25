"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Enlace de navegación con estado activo.
export default function NavLink({
  href,
  children,
  pill = false,
}: {
  href: string;
  children: React.ReactNode;
  pill?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
      style={{
        background: active
          ? "var(--primary-soft)"
          : pill
            ? "var(--surface-2)"
            : "transparent",
        color: active ? "var(--primary)" : "var(--text-muted)",
      }}
    >
      {children}
    </Link>
  );
}
