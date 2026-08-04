"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

function titleFor(pathname: string): string {
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  if (/^\/posts\/[^/]+$/.test(pathname)) return "Edit dispatch";
  if (pathname.startsWith("/posts")) return "Dispatches";
  return "Admin";
}

export function Topbar({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between border-b border-line bg-surface px-6 py-3.5">
      <h1 className="text-base font-bold text-ink">{titleFor(pathname)}</h1>

      <div className="flex items-center gap-4">
        <span className="hidden text-[0.75rem] text-ink-soft sm:block">{email}</span>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="btn btn--ghost">
          Sign out
        </button>
      </div>
    </header>
  );
}
