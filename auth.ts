import NextAuth, { type DefaultSession } from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

declare module "next-auth" {
  interface Session {
    user: {
      preferredUsername: string;
    } & DefaultSession["user"];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Keycloak],
  trustHost: true,
  callbacks: {
    authorized: async ({ auth }) => !!auth?.user,
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.preferredUsername = profile.preferred_username;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.preferredUsername = token.preferredUsername as string;
      return session;
    },
  },
});
