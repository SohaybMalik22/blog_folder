import type { NextAuthConfig } from "next-auth";

// Edge-safe config used by middleware. No DB/bcrypt here — those need the
// Node runtime and live in auth.ts's Credentials provider instead.
export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = request.nextUrl.pathname.startsWith("/login");
      if (isOnLogin) return true;
      return isLoggedIn;
    },
  },
};
