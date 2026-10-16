import Link from "next/link";
import { requireSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/app/(interno)/sign-out-button";

export default async function NoOrganizationPage() {
  const session = await requireSession();
  const invitations = await prisma.invitation.findMany({
    where: { email: session.user.email.toLowerCase(), status: "pending", expiresAt: { gt: new Date() } },
    include: { organization: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="authPage">
      <section className="authCard authCardWide">
        <header>
          <h1>Cuenta sin salón asignado</h1>
          <p>Tu cuenta todavía no pertenece a un salón. Aceptá una invitación vigente o pedile acceso al administrador.</p>
        </header>
        {invitations.length ? (
          <div className="stackList">
            {invitations.map((invitation) => (
              <div className="summaryLine" key={invitation.id}>
                <span>{invitation.organization.name}</span>
                <Link className="button primary" href={`/invitacion/${invitation.id}`}>Revisar invitación</Link>
              </div>
            ))}
          </div>
        ) : <p className="muted">No hay invitaciones vigentes para {session.user.email}.</p>}
        <SignOutButton />
      </section>
    </main>
  );
}
