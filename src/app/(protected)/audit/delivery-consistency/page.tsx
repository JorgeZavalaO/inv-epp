import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import DeliveryConsistencyAudit from "@/components/audit/DeliveryConsistencyAudit";

export const metadata = {
  title: "Auditoría de Entregas - Inconsistencias",
};

export default async function DeliveryConsistencyPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/login");
  }

  return (
    <section className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <DeliveryConsistencyAudit />
    </section>
  );
}
