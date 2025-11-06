import SettingsForm from "@/components/settings/SettingsForm";
import { getSystemConfig } from "@/lib/settings";
import { Settings, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { hasPermission } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
    // Verificar permisos
    const canAccess = await hasPermission('settings_update');
    
    if (!canAccess) {
        redirect('/dashboard');
    }
    
    const cfg = await getSystemConfig();
    
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <Link 
                                href="/dashboard" 
                                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Volver al dashboard
                            </Link>
                        </div>
                        <div className="flex items-center gap-2">
                            <Settings className="h-5 w-5 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                                Configuración
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Configuración del sistema
                    </h1>
                    <p className="text-gray-600">
                        Administra la configuración general de tu aplicación y personaliza 
                        la información de tu empresa.
                    </p>
                </div>

                {/* Settings Sections */}
                <div className="space-y-8">
                    {/* Información de la empresa */}
                    <div>
                        <SettingsForm 
                            initialName={cfg.companyName} 
                            initialLogo={cfg.logoUrl} 
                        />
                    </div>

                    {/* Sección futura para más configuraciones */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                    Configuraciones adicionales
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Más opciones de configuración estarán disponibles próximamente
                                </p>
                            </div>
                            <div className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                                Próximamente
                            </div>
                        </div>
                        
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 border border-gray-200 rounded-lg opacity-50">
                                <h4 className="font-medium text-gray-700 mb-1">Notificaciones</h4>
                                <p className="text-sm text-gray-500">
                                    Configurar alertas y notificaciones del sistema
                                </p>
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg opacity-50">
                                <h4 className="font-medium text-gray-700 mb-1">Usuarios</h4>
                                <p className="text-sm text-gray-500">
                                    Gestionar permisos y roles de usuario
                                </p>
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg opacity-50">
                                <h4 className="font-medium text-gray-700 mb-1">Integrations</h4>
                                <p className="text-sm text-gray-500">
                                    Conectar con servicios externos
                                </p>
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg opacity-50">
                                <h4 className="font-medium text-gray-700 mb-1">Seguridad</h4>
                                <p className="text-sm text-gray-500">
                                    Configuraciones de seguridad y acceso
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}