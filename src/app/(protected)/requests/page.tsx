import { hasAnyPermission } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

export default async function RequestPage() {
  // Verificar permisos - necesita al menos uno de estos
  const canAccess = await hasAnyPermission(['requests_manage', 'requests_approve']);
  
  if (!canAccess) {
    redirect('/dashboard');
  }
  
  return <h1>Pagina de Solicitudes</h1>;
}