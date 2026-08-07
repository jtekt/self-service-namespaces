import NextAuth, { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      preferredUsername: string;
    } & DefaultSession["user"];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    {
      id: "oidc",
      name: process.env.AUTH_OIDC_NAME || "SSO",
      type: "oidc",
      issuer: process.env.AUTH_OIDC_ISSUER,
      clientId: process.env.AUTH_OIDC_ID,
      clientSecret: process.env.AUTH_OIDC_SECRET,
    },
  ],
  trustHost: true,
  callbacks: {
    authorized: async ({ auth }) => !!auth?.user,
    async jwt({ token, account, profile }) {
      if (account && profile) {
        // Some IdPs emit preferred_username as a JSON number when it's a
        // numeric ID; coerce to string so it's safe to use as a DNS label.
        token.preferredUsername = String(profile.preferred_username);
      }
      return token;
    },
    async session({ session, token }) {
      session.user.preferredUsername = token.preferredUsername as string;
      return session;
    },
  },
});
