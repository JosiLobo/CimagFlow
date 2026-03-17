import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import prisma from "./db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        // Admin padrão - criar no banco se não existir
        if (
          credentials.email === "admin@signflow.com" &&
          credentials.password === "admin123"
        ) {
          let adminUser = await prisma.user.findUnique({
            where: { email: "admin@signflow.com" },
          });
          if (!adminUser) {
            const hashedPassword = await bcrypt.hash("admin123", 10);
            adminUser = await prisma.user.create({
              data: {
                email: "admin@signflow.com",
                name: "Administrador SignFlow",
                password: hashedPassword,
                role: "ADMIN",
                phone: "11977777777",
              },
            });
          }
          return {
            id: adminUser.id,
            email: adminUser.email,
            name: adminUser.name,
            role: adminUser.role,
            phone: adminUser.phone ?? undefined,
            photo: adminUser.photo ?? undefined,
            permissions: ["*"],
          };
        }
        // Consulta normal ao banco
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) return null;
        const passwordMatch = await bcrypt.compare(credentials.password, user.password);
        if (!passwordMatch) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone ?? undefined,
          photo: user.photo ?? undefined,
          permissions: (user as any).permissions ?? [],
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.phone = (user as any).phone;
        token.photo = (user as any).photo;
        token.permissions = (user as any).permissions ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).phone = token.phone;
        (session.user as any).photo = token.photo;
        (session.user as any).permissions = token.permissions ?? [];
      }
      return session;
    },
  },
};
