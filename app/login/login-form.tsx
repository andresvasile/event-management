"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function LoginForm({ callbackURL = "/" }: { callbackURL?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const data = new FormData(event.currentTarget);
    const result = await authClient.signIn.email({
      email: String(data.get("email") ?? "").trim().toLowerCase(),
      password: String(data.get("password") ?? ""),
      rememberMe: true,
    });

    if (result.error) {
      setError("El correo o la contraseña no son correctos.");
      setPending(false);
      return;
    }

    const safeCallback = callbackURL.startsWith("/") && !callbackURL.startsWith("//") ? callbackURL : "/";
    const destination = result.data.user.role === "admin" && safeCallback === "/" ? "/superadmin" : safeCallback;
    router.push(destination);
    router.refresh();
  }

  return (
    <form className="authForm" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="email">Correo electrónico</label>
        <input autoComplete="email" id="email" name="email" required type="email" />
      </div>
      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <input autoComplete="current-password" id="password" name="password" required type="password" />
      </div>
      {error ? <p className="formError" role="alert">{error}</p> : null}
      <button className="button primary" disabled={pending} type="submit">
        {pending ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}
