import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="publicQuotePage">
      <section className="publicQuoteCard panelBody" style={{ maxWidth: 560 }}>
        <h1>Página no encontrada</h1>
        <p className="muted">El contenido que buscás no existe o ya no está disponible.</p>
        <Link className="button primary" href="/">Volver al inicio</Link>
      </section>
    </main>
  );
}
