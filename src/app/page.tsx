import Link from "next/link";
import { Shield, BarChart3, Clock, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header corporativo */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 shadow-lg">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">EPP Manager</h1>
                <p className="text-sm text-blue-200">Sistema Corporativo v2.0</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Sistema de Gestión
            <span className="block text-blue-400">EPP Corporativo</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Plataforma integral para el control, seguimiento y administración de Equipos de 
            Protección Personal en tu organización.
          </p>
        </div>

        {/* Características principales */}
        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="group relative overflow-hidden rounded-xl bg-white/10 p-6 backdrop-blur-sm transition-all hover:bg-white/20">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600/20">
              <BarChart3 className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="mt-4 font-semibold text-white">Control Integral</h3>
            <p className="mt-2 text-sm text-slate-300">
              Monitoreo completo de inventarios y stock en tiempo real
            </p>
          </div>

          <div className="group relative overflow-hidden rounded-xl bg-white/10 p-6 backdrop-blur-sm transition-all hover:bg-white/20">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-600/20">
              <Users className="h-6 w-6 text-green-400" />
            </div>
            <h3 className="mt-4 font-semibold text-white">Gestión Personal</h3>
            <p className="mt-2 text-sm text-slate-300">
              Asignación y seguimiento de EPP por colaborador
            </p>
          </div>

          <div className="group relative overflow-hidden rounded-xl bg-white/10 p-6 backdrop-blur-sm transition-all hover:bg-white/20">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-600/20">
              <Clock className="h-6 w-6 text-amber-400" />
            </div>
            <h3 className="mt-4 font-semibold text-white">Trazabilidad</h3>
            <p className="mt-2 text-sm text-slate-300">
              Registro completo de movimientos y entregas
            </p>
          </div>

          <div className="group relative overflow-hidden rounded-xl bg-white/10 p-6 backdrop-blur-sm transition-all hover:bg-white/20">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-600/20">
              <Shield className="h-6 w-6 text-purple-400" />
            </div>
            <h3 className="mt-4 font-semibold text-white">Cumplimiento</h3>
            <p className="mt-2 text-sm text-slate-300">
              Auditoría y reportes para normativas de seguridad
            </p>
          </div>
        </div>

        {/* Botones de acceso */}
        <div className="mt-16 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl sm:w-auto"
          >
            Acceder al Sistema
          </Link>
          <Link
            href="/epps"  
            className="flex w-full items-center justify-center rounded-lg border border-white/30 bg-white/10 px-8 py-3 font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 sm:w-auto"
          >
            Ver Inventario
          </Link>
        </div>
      </main>
    </div>
  );
}