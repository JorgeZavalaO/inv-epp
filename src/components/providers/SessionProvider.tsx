"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { SessionMonitor } from "@/components/auth/SessionMonitor";

export default function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <SessionMonitor />
      {children}
    </NextAuthSessionProvider>
  );
}