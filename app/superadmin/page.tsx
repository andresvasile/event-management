import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/app/(interno)/sign-out-button";
import { activateOrganization, createOrganization, inviteMember } from "./actions";

type SuperAdminPageProps = {
  searchParams: Promise<{ created?: string; error?: string; invitation?: string }>;
};

const roleLabels: Record<string, string> = { owner: "Dueño", admin: "Administrador", member: "Personal operativo" };

export default async function SuperAdminPage({ searchParams }: SuperAdminPageProps) {
  const session = await requireSuperAdmin();
  const params = await searchParams;
  const organizations = await prisma.organization.findMany({
    include: {
      members: { include: { user: true }, orderBy: { createdAt: "asc" } },
      invitations: { where: { status: "pending", expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } },
    },
    orderBy: { name: "asc" },
  });
  const sharedInvitation = params.invitation
    ? organizations.flatMap((organization) => organization.invitations).find((invitation) => invitation.id === params.invitation)
    : undefined;
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, "");

  return (
    <main className="adminPage">
      <header className="adminTopbar">
        <div>
          <strong>Administración general</strong>
          <span>{session.user.name} · {session.user.email}</span>
        </div>
        <div className="buttonRow">
          <Link className="button" href="/">Ir al salón activo</Link>
          <SignOutButton />
        </div>
      </header>

      <div className="adminContent">
        <header className="pageHeader">
          <div><h1>Salones y accesos</h1><p>Creá salones y asigná a sus dueños o al personal.</p></div>
        </header>

        {params.error ? <p className="formError noticeMessage" role="alert">{params.error}</p> : null}
        {params.created ? <p className="noticeBox">El salón fue creado con sus tipos de evento y alquiler inicial.</p> : null}
        {sharedInvitation ? (
          <section className="noticeBox invitationResult">
            <strong>Invitación lista para compartir</strong>
            <code>{baseUrl}/invitacion/{sharedInvitation.id}</code>
          </section>
        ) : null}

        <div className="grid columns2 adminForms">
          <section className="panel">
            <div className="panelHeader"><h2>Nuevo salón</h2></div>
            <form action={createOrganization} className="panelBody formGrid">
              <div className="field"><label htmlFor="organizationName">Nombre</label><input id="organizationName" name="name" placeholder="Ej: Salón Los Aromos" required /></div>
              <div className="field"><label htmlFor="organizationSlug">Identificador</label><input id="organizationSlug" name="slug" pattern="[A-Za-z0-9 áéíóúÁÉÍÓÚñÑ_-]{3,}" placeholder="salon-los-aromos" /></div>
              <p className="fieldHelp fullWidth">Se usa internamente para identificar el salón. Si se deja vacío, se genera desde el nombre.</p>
              <div className="formActions"><button className="button primary" type="submit">Crear salón</button></div>
            </form>
          </section>

          <section className="panel">
            <div className="panelHeader"><h2>Invitar una persona</h2></div>
            <form action={inviteMember} className="panelBody formGrid">
              <div className="field"><label htmlFor="inviteOrganization">Salón</label><select id="inviteOrganization" name="organizationId" required><option value="">Seleccionar</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></div>
              <div className="field"><label htmlFor="inviteRole">Rol</label><select defaultValue="owner" id="inviteRole" name="role"><option value="owner">Dueño</option><option value="admin">Administrador</option><option value="member">Personal operativo</option></select></div>
              <div className="field fullWidth"><label htmlFor="inviteEmail">Correo electrónico</label><input id="inviteEmail" name="email" required type="email" /></div>
              <div className="formActions"><button className="button primary" disabled={organizations.length === 0} type="submit">Crear invitación</button></div>
            </form>
          </section>
        </div>

        <section className="panel">
          <div className="panelHeader"><h2>Salones registrados</h2><span className="muted">{organizations.length} salones</span></div>
          <div className="tableWrap">
            <table className="responsiveTable">
              <thead><tr><th>Salón</th><th>Miembros</th><th>Invitaciones pendientes</th><th>Acciones</th></tr></thead>
              <tbody>
                {organizations.map((organization) => (
                  <tr key={organization.id}>
                    <td data-label="Salón"><strong>{organization.name}</strong><small>{organization.slug}</small></td>
                    <td data-label="Miembros">
                      {organization.members.map((member) => <span className="memberLine" key={member.id}>{member.user.name} · {roleLabels[member.role] ?? member.role}</span>)}
                    </td>
                    <td data-label="Invitaciones pendientes">
                      {organization.invitations.length ? organization.invitations.map((invitation) => <span className="memberLine" key={invitation.id}>{invitation.email} · {roleLabels[invitation.role] ?? invitation.role}</span>) : <span className="muted">Ninguna</span>}
                    </td>
                    <td data-label="Acciones"><form action={activateOrganization}><input name="organizationId" type="hidden" value={organization.id} /><button className="button" type="submit">Abrir salón</button></form></td>
                  </tr>
                ))}
                {organizations.length === 0 ? <tr><td colSpan={4}>Todavía no hay salones registrados.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
