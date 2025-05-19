import { ReactNode } from 'react';
import { auth } from '@clerk/nextjs/server';
import SidebarNav from '@/components/SidebarNav';
import { ensureClerkUser } from '@/lib/user-sync';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await ensureClerkUser();

  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-white border-r flex flex-col justify-between">
        <SidebarNav />
      </aside>
      <div className="flex-1 flex flex-col">
        <main className="flex-1 overflow-auto p-6 bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
