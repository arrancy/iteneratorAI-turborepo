import Google from "next-auth/providers/google";
import prisma from "@repo/db";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { AuthOptions } from "next-auth";
import Email from "next-auth/providers/email";
export const authOptions: AuthOptions = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    Email({ server: process.env.EMAIL_SERVER, from: process.env.EMAIL_FROM }),
  ],
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (
        user &&
        (account?.provider === "google" || account?.provider === "email")
      ) {
        const { email } = user;
        if (!email) return token;
        const dbUser = await prisma.user.findUnique({ where: { email } });
        if (!dbUser) return token;

        token.id = dbUser.id;
        if (!dbUser.name) return token;
        token.name = dbUser.name;

        if (profile && "email_verified" in profile) {
          const isVerified = profile.email_verified;

          if (!dbUser.emailVerified && isVerified) {
            await prisma.user.update({
              where: { email },
              data: { emailVerified: new Date() },
            });
          }
          token.id = dbUser.id;
          return token;
        }
        return token;
      }

      return token;
    },
    async session({ session, token }) {
      if (!session.user) {
        return session;
      }
      session.user.id = token.id || "";
      if (!token.name) return session;
      session.user.name = token.name;
      return session;
    },
  },
};
