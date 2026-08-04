import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Next.js 16 renamed middleware.ts -> proxy.ts. This only does the
// optimistic redirect check; every mutating route handler re-verifies
// the session itself via auth() since Proxy can be bypassed for
// Server Actions hitting routes excluded by the matcher.
const { auth } = NextAuth(authConfig);
export const proxy = auth;

export const config = {
  // api/auth/* must stay open (NextAuth's own login/csrf/session routes) or
  // login becomes impossible. api/generate authenticates itself via a
  // separate cron secret, not a session.
  matcher: ["/((?!api/auth|api/generate|_next/static|_next/image|favicon.ico).*)"],
};
