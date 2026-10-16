import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InvitationForm } from "./invitation-form";

type InvitationPageProps = { params: Promise<{ id: string }> };

const roleLabels: Record<string, string> = { owner: "Dueño", admin: "Administrador", member: "Personal operativo" };

export default async function InvitationPage({ params }: InvitationPageProps) {
  const { id } = await params;
  const [invitation, session] = await Promise.all([
    prisma.invitation.findFirst({
      where: { id, status: "pending", expiresAt: { gt: new Date() } },
      include: { organization: true },
    }),
    auth.api.getSession({ headers: await headers() }),
  ]);
  if (!invitation) notFound();

  return (
    <main className="authPage">
      <section className="authCard">
        <div className="authBrand"><span className="brandMark">S</span><strong>Gestión del salón</strong></div>
        <header>
          <h1>Invitación a {invitation.organization.name}</h1>
          <p>Te invitaron como {roleLabels[invitation.role] ?? invitation.role} con el correo <strong>{invitation.email}</strong>.</p>
        </header>
        <InvitationForm email={invitation.email} invitationId={invitation.id} sessionEmail={session?.user.email} />
      </section>
    </main>
  );
}
