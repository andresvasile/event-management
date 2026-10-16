"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type InvitationFormProps = {
  email: string;
  invitationId: string;
  sessionEmail?: string;
};

export function InvitationForm({ email, invitationId, sessionEmail }: InvitationFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const hasSession = Boolean(sessionEmail);
  const wrongAccount = hasSession && sessionEmail?.toLowerCase() !== email.toLowerCase();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    if (!hasSession) {
      const data = new FormData(event.currentTarget);
      const password = String(data.get("password") ?? "");
      if (password.length < 10) {
        setError("La contraseña debe tener al menos 10 caracteres.");
        setPending(false);
        return;
      }
      const registration = await authClient.signUp.email({
        email,
        name: String(data.get("name") ?? "").trim(),
        password,
      });
      if (registration.error) {
        setError(registration.error.message || "No se pudo crear la cuenta.");
        setPending(false);
        return;
      }
    }

    const acceptance = await authClient.organization.acceptInvitation({ invitationId });
    if (acceptance.error) {
      setError(acceptance.error.message || "No se pudo aceptar la invitación.");
      setPending(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (wrongAccount) {
    return <p className="formError">Esta invitación corresponde a {email}. Cerrá la sesión actual e ingresá con esa cuenta.</p>;
  }

  return (
    <form className="authForm" onSubmit={handleSubmit}>
      {!hasSession ? (
        <>
          <div className="field">
            <label htmlFor="name">Nombre y apellido</label>
            <input autoComplete="name" id="name" name="name" required />
          </div>
          <div className="field">
            <label htmlFor="password">Crear contraseña</label>
            <input autoComplete="new-password" id="password" minLength={10} name="password" required type="password" />
            <p className="fieldHelp">Mínimo 10 caracteres.</p>
          </div>
        </>
      ) : null}
      {error ? <p className="formError" role="alert">{error}</p> : null}
      <button className="button primary" disabled={pending} type="submit">
        {pending ? "Procesando..." : hasSession ? "Aceptar invitación" : "Crear cuenta y aceptar"}
      </button>
    </form>
  );
}
