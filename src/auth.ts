import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isSessionAgeValid, SESSION_MAX_AGE_SECONDS } from "./lib/auth-policy";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  callbacks: {
    jwt({ token, account }) {
      if (account) {
        return { sub: token.sub, signedInAt: Date.now() };
      }
      return isSessionAgeValid(token.signedInAt) ? token : null;
    },
    session({ session }) {
      return { expires: session.expires };
    },
  },
});
