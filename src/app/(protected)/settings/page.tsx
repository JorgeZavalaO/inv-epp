import SettingsForm from "@/components/settings/SettingsForm";
import WarehousePreferencesForm from "@/components/settings/WarehousePreferencesForm";
import { getSystemConfig } from "@/lib/settings";
import { Settings, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { hasPermission, getCurrentUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getWarehouseScope } from "@/lib/warehouse-scope";

export default async function SettingsPage() {
    const scope = await getWarehouseScope().catch(() => null);

    if (!scope) {
        redirect('/auth/signin');
    }

    const canManageSystem = await hasPermission('settings_update');
    const currentUser = await getCurrentUser();
    const isAdmin = currentUser?.role === 'ADMIN';
    const cfg = await getSystemConfig();

    const allowedWarehouses = await prisma.warehouse.findMany({
        where: scope.allowedIds === null ? {} : { id: { in: scope.allowedIds } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
    });

    const primaryWarehouse =
        scope.primaryWarehouseId === null
            ? null
            : allowedWarehouses.find((warehouse) => warehouse.id === scope.primaryWarehouseId) ?? null;

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
                        Administra tus preferencias de almacén y la configuración
                        general de tu empresa.
                    </p>
                </div>

                {/* Settings Sections */}
                <div className="space-y-8">
                    {/* Preferencias personales de almacén */}
                    <WarehousePreferencesForm
                        initialViewMode={scope.viewMode}
                        primaryWarehouse={primaryWarehouse}
                        allowedWarehouses={allowedWarehouses}
                        isAdmin={isAdmin}
                        needsPrimary={scope.needsPrimary}
                    />

                    {/* Información de la empresa (solo con permiso) */}
                    {canManageSystem && (
                        <div>
                            <SettingsForm 
                                initialName={cfg.companyName} 
                                initialLogo={cfg.logoUrl} 
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
