import { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import SidebarNav from "@/components/SidebarNav";
import { ensureClerkUser } from "@/lib/user-sync";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();         // Proteger ruta y extraer userId
  if (!userId) {
    throw new Error('Unauthorized');
  }

  await ensureClerkUser();           // Upsert en BD

  return (
    <ClerkProvider>
      <div className="flex h-screen">
        <aside className="w-64 text-white">
          <SidebarNav />
        </aside>
        <div className="flex-1 flex flex-col">
          <header className="bg-white shadow p-4">
            <h1 className="text-xl font-semibold">EPP Management</h1>
          </header>
          <main className="flex-1 overflow-auto p-6 bg-gray-50">
            {children}
          </main>
        </div>
      </div>
    </ClerkProvider>
  );
}
