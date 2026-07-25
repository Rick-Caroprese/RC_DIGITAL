import Link from "next/link";
import { signOut } from "@/app/login/actions";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";
import NavLink from "@/components/NavLink";
import type { Profile } from "@/lib/types";

// Header común. `nav` recibe los enlaces propios de cada área.
export default function AppHeader({
  profile,
  nav,
}: {
  profile: Profile;
  nav?: { href: string; label: string }[];
}) {
  const initials = (profile.full_name || profile.email)
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header
      className="sticky top-0 z-20 border-b backdrop-blur-md"
      style={{
        backgroundColor: "color-mix(in srgb, var(--surface) 82%, transparent)",
        borderColor: "var(--border)",
      }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {nav?.map((n) => (
            <NavLink key={n.href} href={n.href}>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <span
            className="hidden h-9 w-9 place-items-center rounded-full text-xs font-bold sm:grid"
            style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
            title={profile.full_name || profile.email}
          >
            {initials}
          </span>
          <form action={signOut}>
            <button className="btn btn-outline !min-h-0 !px-3 !py-2 text-sm">Salir</button>
          </form>
        </div>
      </div>

      {nav && nav.length > 0 && (
        <nav className="flex gap-1.5 overflow-x-auto px-4 pb-2.5 sm:hidden">
          {nav.map((n) => (
            <NavLink key={n.href} href={n.href} pill>
              {n.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
