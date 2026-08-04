import { auth } from "@/auth";
import { getStats } from "@/lib/queries";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Proxy already gates these routes; this is only for display.
  const [session, stats] = await Promise.all([auth(), getStats()]);

  return (
    <div className="flex min-h-screen">
      <Sidebar fixturesWaiting={stats.fixturesWaiting} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar email={session?.user?.email ?? ""} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
