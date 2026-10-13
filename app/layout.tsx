import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestión del salón",
  description: "Sistema de gestión para salón de eventos",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
