import SettingsForm from "@/components/settings/SettingsForm";
import WarehousePreferencesForm from "@/components/settings/WarehousePreferencesForm";
import { getSystemConfig } from "@/lib/settings";
import { Settings, ArrowLeft, Inbox, Mail, MessageCircle } from "lucide-react";
import Link from "next/link";
import { hasPermission, getCurrentUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getWarehouseScope } from "@/lib/warehouse-scope";
import { markAccessRequestHandled } from "./actions";

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

    const accessRequests = isAdmin
        ? await prisma.accessRequest.findMany({
              orderBy: { createdAt: 'desc' },
              take: 30,
          })
        : [];
    const pendingAccessRequests = accessRequests.filter(
        (request) => request.status === 'PENDING',
    ).length;

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

                    {/* Solicitudes de acceso (solo ADMIN) */}
                    {isAdmin && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                    <Inbox className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        Solicitudes de acceso
                                    </h2>
                                    <p className="text-sm text-gray-500">
                                        Personas que pidieron una demostración desde la
                                        página pública.
                                    </p>
                                </div>
                                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                                    {pendingAccessRequests} pendiente
                                    {pendingAccessRequests === 1 ? '' : 's'}
                                </span>
                            </div>

                            {accessRequests.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    Todavía no hay solicitudes.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {accessRequests.map((request) => {
                                        const phoneDigits = request.phone?.replace(/\D/g, '') ?? '';
                                        return (
                                            <div
                                                key={request.id}
                                                className="rounded-lg border border-gray-200 p-4"
                                            >
                                                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                                                    <div>
                                                        <p className="font-medium text-gray-900">
                                                            {request.name}
                                                            {request.company ? (
                                                                <span className="ml-2 text-sm font-normal text-gray-500">
                                                                    {request.company}
                                                                </span>
                                                            ) : null}
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            {request.email}
                                                            {request.phone ? ` · ${request.phone}` : ''}
                                                        </p>
                                                    </div>
                                                    <span
                                                        className={`self-start rounded-full px-2 py-0.5 text-xs font-medium ${
                                                            request.status === 'PENDING'
                                                                ? 'bg-amber-100 text-amber-800'
                                                                : request.status === 'CONTACTED'
                                                                  ? 'bg-emerald-100 text-emerald-800'
                                                                  : 'bg-gray-100 text-gray-700'
                                                        }`}
                                                    >
                                                        {request.status === 'PENDING'
                                                            ? 'Pendiente'
                                                            : request.status === 'CONTACTED'
                                                              ? 'Contactado'
                                                              : 'Cerrado'}
                                                    </span>
                                                </div>

                                                {request.message && (
                                                    <p className="mt-2 text-sm text-gray-700">
                                                        {request.message}
                                                    </p>
                                                )}

                                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                                    <a
                                                        href={`mailto:${request.email}?subject=${encodeURIComponent('EPP Manager - Solicitud de acceso')}`}
                                                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                    >
                                                        <Mail className="h-3.5 w-3.5" />
                                                        Correo
                                                    </a>
                                                    {phoneDigits && (
                                                        <a
                                                            href={`https://wa.me/${phoneDigits}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 rounded-md border border-green-300 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
                                                        >
                                                            <MessageCircle className="h-3.5 w-3.5" />
                                                            WhatsApp
                                                        </a>
                                                    )}
                                                    <span className="text-xs text-gray-400">
                                                        {request.createdAt.toLocaleDateString('es-PE')}
                                                    </span>
                                                    {request.status === 'PENDING' && (
                                                        <form action={markAccessRequestHandled}>
                                                            <input
                                                                type="hidden"
                                                                name="id"
                                                                value={request.id}
                                                            />
                                                            <button
                                                                type="submit"
                                                                className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-800"
                                                            >
                                                                Marcar contactado
                                                            </button>
                                                        </form>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
