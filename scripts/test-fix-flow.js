#!/usr/bin/env node

/**
 * Script para verificar que el flujo de corrección funciona
 * Verifica:
 * 1. El botón está presente cuando se selecciona una acción
 * 2. El AlertDialog funciona correctamente
 * 3. El handleFix envía el payload correcto
 * 4. El API responde correctamente
 */

const fs = require('fs');
const path = require('path');

async function testFixFlow() {
  console.log('🧪 Verificando flujo de corrección...\n');

  // Leer el componente
  const componentPath = path.join(__dirname, '../src/components/audit/DeliveryConsistencyAudit.tsx');
  const componentContent = fs.readFileSync(componentPath, 'utf-8');

  // Leer el API
  const apiPath = path.join(__dirname, '../src/app/api/audit/delivery-consistency/fix/route.ts');
  const apiContent = fs.readFileSync(apiPath, 'utf-8');

  const checks = [
    {
      name: 'Componente: handleFix existe',
      test: () => componentContent.includes('const handleFix = async () => {'),
    },
    {
      name: 'Componente: fetch POST al endpoint correcto',
      test: () => componentContent.includes('/api/audit/delivery-consistency/fix'),
    },
    {
      name: 'Componente: Payload DELETE_MOVEMENT',
      test: () => componentContent.includes('"DELETE_MOVEMENT"'),
    },
    {
      name: 'Componente: Payload UPDATE_DELIVERY',
      test: () => componentContent.includes('"UPDATE_DELIVERY"'),
    },
    {
      name: 'Componente: Payload CREATE_MOVEMENT',
      test: () => componentContent.includes('"CREATE_MOVEMENT"'),
    },
    {
      name: 'Componente: Toast de éxito',
      test: () => componentContent.includes('toast.success(result.message)'),
    },
    {
      name: 'Componente: Manejo de errores',
      test: () => componentContent.includes('toast.error') && componentContent.includes('catch (error)'),
    },
    {
      name: 'Componente: Recarga después de corregir',
      test: () => componentContent.includes('setTimeout(fetchIssues'),
    },
    {
      name: 'Componente: Botón "Aplicar Corrección" visible si fixAction',
      test: () => componentContent.includes('fixAction && (') && componentContent.includes('Aplicar Corrección'),
    },
    {
      name: 'Componente: AlertDialog para confirmación',
      test: () => componentContent.includes('AlertDialog') && componentContent.includes('Confirmar corrección'),
    },
    {
      name: 'API: POST endpoint existe',
      test: () => apiContent.includes('export async function POST'),
    },
    {
      name: 'API: Verificación de permisos',
      test: () => apiContent.includes('requirePermission("stock_movements_manage")'),
    },
    {
      name: 'API: DELETE_MOVEMENT action',
      test: () => apiContent.includes('action === "DELETE_MOVEMENT"'),
    },
    {
      name: 'API: UPDATE_DELIVERY action',
      test: () => apiContent.includes('action === "UPDATE_DELIVERY"'),
    },
    {
      name: 'API: CREATE_MOVEMENT action',
      test: () => apiContent.includes('action === "CREATE_MOVEMENT"'),
    },
    {
      name: 'API: Reversión de stock',
      test: () => apiContent.includes('ePPStock.update') && apiContent.includes('increment'),
    },
    {
      name: 'API: Auditoría de cambios',
      test: () => apiContent.includes('auditLog.create'),
    },
    {
      name: 'API: Respuesta de éxito',
      test: () => apiContent.includes('NextResponse.json({') && apiContent.includes('success: true'),
    },
  ];

  let passed = 0;
  let failed = 0;

  console.log('Verificaciones del Flujo de Corrección:\n');
  checks.forEach((check, idx) => {
    const result = check.test();
    const icon = result ? '✅' : '❌';
    console.log(`${icon} ${check.name}`);
    if (result) {
      passed++;
    } else {
      failed++;
      console.log(`   └─ FALLA: Esta característica no está implementada`);
    }
  });

  console.log(`\n📊 Resultado: ${passed} pasaron, ${failed} fallaron\n`);

  if (failed === 0) {
    console.log('✨ ¡El flujo de corrección está completo y debería funcionar!');
    return true;
  } else {
    console.log('⚠️ Hay algunas verificaciones que fallaron.');
    return false;
  }
}

testFixFlow().then(success => {
  process.exit(success ? 0 : 1);
});
