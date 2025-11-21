import NextAuth, { type NextAuthOptions, getServerSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials.password) {
          return null;
        }

        // Use raw query to bypass potential Prisma Client type issues
        const users = await prisma.$queryRaw<any[]>`
          SELECT * FROM "AdminUser" WHERE "username" = ${credentials.username.toLowerCase()} LIMIT 1
        `;
        const admin = users[0];

        if (!admin) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          admin.passwordHash,
        );

        if (!isValid) {
          return null;
        }

        await prisma.$executeRaw`
          UPDATE "AdminUser" SET "lastLoginAt" = ${new Date()} WHERE "id" = ${admin.id}
        `;

        const username = (admin as { username?: string | null }).username;

        return {
          id: admin.id,
          email: admin.email,
          username: username ?? undefined,
          name: admin.name,
          role: admin.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "EDITOR";
        token.username = (user as { username?: string }).username ?? "";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "EDITOR";
        (session.user as { username?: string }).username = (token.username as string) ?? "";
      }
      return session;
    },
  },
};

const nextAuth = NextAuth(authOptions);

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
export const { signIn, signOut } = nextAuth;
export const auth = () => getServerSession(authOptions);
