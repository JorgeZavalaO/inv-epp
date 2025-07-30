import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import ExportExcelButton from "@/components/delivery/ExportExcelButton";
import { formatDateLima } from "@/lib/formatDate";

import { 
  FileText, 
  Package, 
  User, 
  MapPin, 
  Briefcase, 
  Warehouse, 
  Calendar,
  ArrowLeft,
  StickyNote,
  Hash
} from "lucide-react";

export default async function DeliveryBatchDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  const b = await prisma.deliveryBatch.findUnique({
    where: { id: Number(id) },
    include: {
      collaborator: { select: { name: true, position: true, location: true } },
      user: { select: { name: true, email: true } },
      deliveries: {
        include: { epp: { select: { code: true, name: true } } },
        orderBy: { id: "asc" },
      },
      warehouse: { select: { name: true } },
    },
  });
  
  if (!b) notFound();

  // const formatDate = (date: Date) => {
  //   return new Intl.DateTimeFormat('es-PE', {
  //     day: '2-digit',
  //     month: '2-digit',
  //     year: 'numeric',
  //     hour: '2-digit',
  //     minute: '2-digit'
  //   }).format(date);
  // };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                Entrega #{b.code}
              </h1>
              <p className="text-slate-600 flex items-center gap-1 mt-1">
                <Calendar className="w-4 h-4" />
               {formatDateLima(b.createdAt)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="px-3 py-1">
              <Hash className="w-3 h-3 mr-1" />
              {b.deliveries.length} ítems
            </Badge>
            <Link href={`/api/delivery-batches/${b.id}/pdf`} target="_blank">
              <Button className="bg-red-600 hover:bg-red-700 text-white">
                <FileText className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
            </Link>
            <ExportExcelButton batchId={b.id} />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Collaborator Info */}
          <Card className="shadow-md border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5 text-blue-600" />
                Información del Colaborador
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Nombre completo</p>
                  <p className="font-semibold text-slate-900">{b.collaborator.name}</p>
                </div>
                
                <Separator />
                
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1 flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    Cargo
                  </p>
                  <p className="text-slate-700">{b.collaborator.position || "No especificado"}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Ubicación
                  </p>
                  <p className="text-slate-700">{b.collaborator.location || "No especificada"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Info */}
          <Card className="shadow-md border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Warehouse className="w-5 h-5 text-green-600" />
                Información de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Operador responsable</p>
                  <p className="font-semibold text-slate-900">{b.user.name || b.user.email}</p>
                </div>
                
                <Separator />
                
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Almacén de origen</p>
                  <p className="text-slate-700">{b.warehouse.name}</p>
                </div>
                
                {b.note && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-1 flex items-center gap-1">
                        <StickyNote className="w-3 h-3" />
                        Observaciones
                      </p>
                      <p className="text-slate-700 bg-amber-50 p-2 rounded border-l-4 border-amber-400">
                        {b.note}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="shadow-md border-0 bg-gradient-to-br from-blue-50 to-indigo-100">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="w-5 h-5 text-indigo-600" />
                Resumen de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600 mb-2">
                  {b.deliveries.length}
                </div>
                <p className="text-slate-600 text-sm mb-4">Tipos de EPP entregados</p>
                
                <div className="text-2xl font-semibold text-slate-800">
                  {b.deliveries.reduce((sum, d) => sum + d.quantity, 0)}
                </div>
                <p className="text-slate-600 text-sm">Unidades totales</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items Table */}
        <Card className="shadow-md border-0 bg-white/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Detalle de Artículos Entregados
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50/50">
                    <th className="text-left p-4 font-semibold text-slate-700">#</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Código EPP</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Descripción</th>
                    <th className="text-center p-4 font-semibold text-slate-700">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {b.deliveries.map((delivery, index) => (
                    <tr 
                      key={delivery.id} 
                      className="border-b hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="p-4 text-slate-600 font-mono text-sm">
                        {(index + 1).toString().padStart(2, '0')}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="font-mono">
                          {delivery.epp.code}
                        </Badge>
                      </td>
                      <td className="p-4 font-medium text-slate-900">
                        {delivery.epp.name}
                      </td>
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full font-semibold text-blue-800">
                          {delivery.quantity}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-start">
          <Button 
            asChild 
            variant="outline" 
            className="bg-white hover:bg-slate-50"
          >
            <Link href="/deliveries" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver a Entregas
            </Link>
          </Button>
        </div>
        
      </div>
    </div>
  );
}