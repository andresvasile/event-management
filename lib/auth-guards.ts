import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./prisma";

export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session;
}

export async function requireSuperAdmin() {
  const session = await requireSession();
  if (session.user.role !== "admin") redirect("/");
  return session;
}

export async function requireOrganization() {
  const session = await requireSession();
  const activeOrganizationId = session.session.activeOrganizationId;
  const membership =
    (activeOrganizationId
      ? await prisma.member.findUnique({
          where: { organizationId_userId: { organizationId: activeOrganizationId, userId: session.user.id } },
          include: { organization: true },
        })
      : null) ??
    (await prisma.member.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
      orderBy: { createdAt: "asc" },
    }));

  if (!membership) {
    if (session.user.role === "admin") redirect("/superadmin");
    redirect("/sin-salon");
  }

  return { session, membership, organization: membership.organization, organizationId: membership.organizationId };
}
