import { githubConfig } from "@/app/config";
import { CustomSession } from "@/types";
import NextAuth, { NextAuthOptions } from "next-auth";
import GithubProvider, { GithubProfile } from "next-auth/providers/github";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  jwt: {
    secret: process.env.NEXTAUTH_JWT_SECRET,
  },
  providers: [
    GithubProvider({
      clientId: githubConfig.clientId,
      clientSecret: githubConfig.clientSecret,
      authorization: { params: { scope: "read:user repo" } },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      // pass the github login to client
      (session as CustomSession).user.login = token.login as string;
      return session;
    },
    async jwt({ token, account, profile }) {
      // Persist the OAuth access_token and or the user id to the token right after signin
      if (account) {
        token.accessToken = account.access_token;
        token.login = (profile as GithubProfile).login;
      }
      return token;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
