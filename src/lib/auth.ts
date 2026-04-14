import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { userStore } from "@/lib/infra";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        // Check if user exists, if not create them
        const existingUser = await userStore.getUser(user.id!);
        if (!existingUser) {
          await userStore.createUser({
            userId: user.id!,
            email: user.email,
            name: user.name || undefined,
            plan: "free",
            createdAt: new Date().toISOString(),
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
        // Fetch user data
        const dbUser = await userStore.getUser(token.userId as string);
        if (dbUser) {
          const extUser = session.user as {
            plan?: string;
            tickets?: number;
            ticketsExpiresAt?: string;
          };
          extUser.plan = dbUser.plan;
          extUser.tickets = dbUser.tickets;
          extUser.ticketsExpiresAt = dbUser.ticketsExpiresAt;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
