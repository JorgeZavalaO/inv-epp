// 🚀 OPTIMIZACIÓN INMEDIATA - DeliveryBatch Detail Page
// Reemplazar src/app/(protected)/deliveries/[id]/page.tsx

import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  User, 
  MapPin, 
  Calendar,
  Package,
  Warehouse,
  StickyNote,
  ArrowLeft,
  Printer
} from "lucide-react";
import Link from "next/link";

// ✅ OPTIMIZACIÓN: Usar cache de 5 minutos para páginas de detalles
export const revalidate = 300;

interface DeliveryDetail {
  id: number;
  quantity: number;
  epp: {
    code: string;
    name: string;
    category: string;
  };
}

interface BatchDetail {
  id: number;
  code: string;
  createdAt: Date;
  note: string | null;
  collaborator: {
    name: string;
    position: string | null;
    location: string | null;
  } | null;
  warehouse: {
    name: string;
  } | null;
  user: {
    name: string | null;
  } | null;
  deliveries: DeliveryDetail[];
  totalItems: number;
  totalQuantity: number;
}

// ✅ OPTIMIZACIÓN: Consulta optimizada con select específico y agregación
async function getBatchDetails(id: number): Promise<BatchDetail | null> {
  const batch = await prisma.deliveryBatch.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      createdAt: true,
      note: true,
      collaborator: {
        select: {
          name: true,
          position: true,
          location: true,
        }
      },
      warehouse: {
        select: {
          name: true,
        }
      },
      user: {
        select: {
          name: true,
        }
      },
      deliveries: {
        select: {
          id: true,
          quantity: true,
          epp: {
            select: {
              code: true,
              name: true,
              category: true,
            }
          }
        },
        orderBy: {
          id: 'asc'
        }
      },
      _count: {
        select: {
          deliveries: true
        }
      }
    }
  });

  if (!batch) return null;

  // ✅ OPTIMIZACIÓN: Calcular agregaciones en memoria en lugar de DB
  const totalQuantity = batch.deliveries.reduce((sum, d) => sum + d.quantity, 0);

  return {
    ...batch,
    totalItems: batch._count.deliveries,
    totalQuantity,
  };
}

export default async function DeliveryBatchDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const batchId = Number(id);
  
  if (Number.isNaN(batchId)) {
    notFound();
  }

  const batch = await getBatchDetails(batchId);
  
  if (!batch) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Header con navegación */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/deliveries">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Entregas
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Detalle de Entrega</h1>
            <p className="text-muted-foreground">
              Lote {batch.code} • {batch.totalItems} productos • {batch.totalQuantity} unidades
            </p>
          </div>
        </div>
        
        {/* ✅ OPTIMIZACIÓN: Link directo a PDF sin carga de JavaScript */}
        <Button asChild>
          <Link href={`/api/delivery-batches/${batch.id}/pdf`} target="_blank">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir PDF
          </Link>
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Información del Lote */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-md border-0 bg-gradient-to-br from-slate-50 to-slate-100">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="w-5 h-5 text-slate-600" />
                Información del Lote
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-600">Fecha</p>
                    <p className="text-slate-900">
                      {batch.createdAt.toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {batch.collaborator && (
                  <>
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-slate-500" />
                      <div>
                        <p className="text-sm font-medium text-slate-600">Colaborador</p>
                        <p className="text-slate-900 font-medium">{batch.collaborator.name}</p>
                        {batch.collaborator.position && (
                          <p className="text-sm text-slate-600">{batch.collaborator.position}</p>
                        )}
                      </div>
                    </div>

                    {batch.collaborator.location && (
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        <div>
                          <p className="text-sm font-medium text-slate-600">Ubicación</p>
                          <p className="text-slate-900">{batch.collaborator.location}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {batch.warehouse && (
                  <div className="flex items-center gap-3">
                    <Warehouse className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-600">Almacén</p>
                      <p className="text-slate-900">{batch.warehouse.name}</p>
                    </div>
                  </div>
                )}

                {batch.user?.name && (
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-600">Procesado por</p>
                      <p className="text-slate-900">{batch.user.name}</p>
                    </div>
                  </div>
                )}
              </div>

              {batch.note && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium text-slate-600 mb-1 flex items-center gap-1">
                    <StickyNote className="w-3 h-3" />
                    Observaciones
                  </p>
                  <p className="text-slate-700 bg-amber-50 p-2 rounded border-l-4 border-amber-400">
                    {batch.note}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estadísticas Rápidas */}
          <Card className="shadow-md border-0 bg-gradient-to-br from-blue-50 to-indigo-100">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="w-5 h-5 text-indigo-600" />
                Resumen de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-600">{batch.totalItems}</p>
                  <p className="text-sm text-slate-600">Productos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-600">{batch.totalQuantity.toLocaleString()}</p>
                  <p className="text-sm text-slate-600">Unidades</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de EPPs Entregados */}
        <div className="lg:col-span-2">
          <Card className="shadow-md border-0">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>EPPs Entregados</span>
                <Badge variant="secondary">{batch.totalItems} productos</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* ✅ OPTIMIZACIÓN: Usar grid responsive en lugar de tabla para mejor UX móvil */}
              <div className="space-y-3">
                {batch.deliveries.map((delivery) => (
                  <div 
                    key={delivery.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{delivery.epp.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {delivery.epp.code}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {delivery.epp.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">
                        {delivery.quantity.toLocaleString()}
                      </p>
                      <p className="text-sm text-slate-600">unidades</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}