import { ReactNode } from 'react';
import { auth } from '@clerk/nextjs/server';
import SidebarNav from '@/components/SidebarNav';
import { ensureClerkUser } from '@/lib/user-sync';
// Update the import path below if the actual location is different, for example:
import { getLowStockCount } from "@/lib/alerts";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  const low = await getLowStockCount(); 
  await ensureClerkUser();

  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-white border-r flex flex-col justify-between">
        <SidebarNav />
      </aside>
      <div className="flex-1 flex flex-col">
        {low > 0 && (
          <div className="bg-yellow-100 text-yellow-800 text-sm py-2 px-4">
            {low} EPP
            {low > 1 && "s"} están por debajo del stock mínimo.{" "}
            <a
              className="underline font-medium"
              href="/dashboard"
            >
              Ver detalles
            </a>
          </div>
        )}
        <main className="flex-1 overflow-auto p-6 bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
