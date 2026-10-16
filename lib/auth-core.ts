import { APIError } from "better-auth/api";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin, organization } from "better-auth/plugins";
import { prisma } from "./prisma";

export const auth = betterAuth({
  appName: "Gestión del salón",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
    transaction: true,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 10,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const email = user.email.toLowerCase();
          const isBootstrapAdmin =
            process.env.AUTH_BOOTSTRAP === "true" && email === process.env.SUPERADMIN_EMAIL?.toLowerCase();
          const invitation = await prisma.invitation.findFirst({
            where: { email, status: "pending", expiresAt: { gt: new Date() } },
            select: { id: true },
          });

          if (!isBootstrapAdmin && !invitation) {
            throw new APIError("FORBIDDEN", { message: "Necesitás una invitación vigente para crear la cuenta." });
          }

          return { data: { ...user, email } };
        },
      },
    },
  },
  plugins: [
    admin(),
    organization({
      allowUserToCreateOrganization: (user) => user.role === "admin",
      disableOrganizationDeletion: true,
      invitationExpiresIn: 60 * 60 * 24 * 7,
      async sendInvitationEmail() {
        // El panel muestra un enlace privado para compartir hasta integrar correo transaccional.
      },
    }),
    nextCookies(),
  ],
  advanced: {
    database: { joins: true },
  },
});
