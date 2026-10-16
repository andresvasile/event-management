"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

function cleanSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createOrganization(formData: FormData) {
  await requireSuperAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const slug = cleanSlug(String(formData.get("slug") ?? name));
  if (!name || slug.length < 3) redirect("/superadmin?error=Ingresá+un+nombre+y+un+identificador+válido");

  let organizationId: string;
  try {
    const organization = await auth.api.createOrganization({
      body: { name, slug },
      headers: await headers(),
    });
    if (!organization) throw new Error("No se creó el salón.");
    organizationId = organization.id;
    await prisma.$transaction([
      prisma.service.create({
        data: { organizationId, name: "Alquiler del salón", active: true, required: true },
      }),
      prisma.eventType.createMany({
        data: [
          { organizationId, name: "Cumple" },
          { organizationId, name: "Casamiento" },
          { organizationId, name: "Egreso", supportsGraduationRoster: true },
          { organizationId, name: "Otro" },
        ],
      }),
    ]);
  } catch {
    redirect("/superadmin?error=No+se+pudo+crear+el+salón.+Revisá+que+el+identificador+no+esté+en+uso");
  }

  revalidatePath("/superadmin");
  redirect(`/superadmin?created=${organizationId}`);
}

export async function inviteMember(formData: FormData) {
  await requireSuperAdmin();
  const organizationId = String(formData.get("organizationId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleValue = String(formData.get("role") ?? "member");
  const role = roleValue === "owner" || roleValue === "admin" ? roleValue : "member";
  if (!organizationId || !email) redirect("/superadmin?error=Completá+el+salón+y+el+correo");

  let invitationId: string;
  try {
    const invitation = await auth.api.createInvitation({
      body: { organizationId, email, role, resend: true },
      headers: await headers(),
    });
    invitationId = invitation.id;
  } catch {
    redirect("/superadmin?error=No+se+pudo+crear+la+invitación.+La+persona+puede+ser+miembro+del+salón");
  }

  revalidatePath("/superadmin");
  redirect(`/superadmin?invitation=${invitationId}`);
}

export async function activateOrganization(formData: FormData) {
  await requireSuperAdmin();
  const organizationId = String(formData.get("organizationId") ?? "");
  await auth.api.setActiveOrganization({ body: { organizationId }, headers: await headers() });
  redirect("/");
}
