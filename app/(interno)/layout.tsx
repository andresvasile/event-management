import Link from "next/link";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/eventos", label: "Eventos" },
  { href: "/cotizaciones", label: "Cotizaciones" },
  { href: "/pagos", label: "Pagos" },
  { href: "/servicios", label: "Servicios" },
  { href: "/tipos-evento", label: "Tipos de evento" },
];

export default function InternalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Navegación principal">
        <div className="brand">
          <span className="brandMark">S</span>
          <div>
            <strong>Salon</strong>
            <small>Gestión interna</small>
          </div>
        </div>
        <nav className="navList">
          {navItems.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="mainContent">{children}</main>
    </div>
  );
}
