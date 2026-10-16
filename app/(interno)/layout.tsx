import Link from "next/link";
import { requireOrganization } from "@/lib/auth-guards";
import { SignOutButton } from "./sign-out-button";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/eventos", label: "Eventos" },
  { href: "/servicios", label: "Servicios" },
  { href: "/tipos-evento", label: "Tipos de evento" },
];

export default async function InternalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { session, organization, membership } = await requireOrganization();
  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Navegación principal">
        <div className="brand">
          <span className="brandMark">S</span>
          <div>
            <strong>{organization.name}</strong>
            <small>{membership.role === "owner" ? "Dueño" : membership.role === "admin" ? "Administrador" : "Personal operativo"}</small>
          </div>
        </div>
        <nav className="navList">
          {navItems.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebarAccount">
          <span>{session.user.name}</span>
          <small>{session.user.email}</small>
          {session.user.role === "admin" ? <Link href="/superadmin">Administrar salones</Link> : null}
          <SignOutButton />
        </div>
      </aside>
      <main className="mainContent">{children}</main>
    </div>
  );
}
