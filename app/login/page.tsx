import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";

type LoginPageProps = { searchParams: Promise<{ callbackUrl?: string }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect(session.user.role === "admin" ? "/superadmin" : "/");
  const { callbackUrl } = await searchParams;

  return (
    <main className="authPage">
      <section className="authCard">
        <div className="authBrand"><span className="brandMark">S</span><strong>Gestión del salón</strong></div>
        <header>
          <h1>Ingreso al sistema</h1>
          <p>Usá la cuenta asignada por el administrador.</p>
        </header>
        <LoginForm callbackURL={callbackUrl} />
      </section>
    </main>
  );
}
