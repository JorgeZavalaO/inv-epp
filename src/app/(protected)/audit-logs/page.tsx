import { Metadata } from "next";
import AuditLogsClient from "@/components/audit/AuditLogsClient";

export const metadata: Metadata = {
  title: "Auditoría | Sistema de Gestión EPP",
  description: "Historial de auditoría y trazabilidad de operaciones",
};

export default function AuditLogsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Sistema de Auditoría</h1>
        <p className="text-muted-foreground mt-2">
          Visualiza y analiza el historial completo de operaciones del sistema
        </p>
      </div>
      
      <AuditLogsClient />
    </div>
  );
}
