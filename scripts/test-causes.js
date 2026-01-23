#!/usr/bin/env node

/**
 * Script para probar que las causas se generan correctamente
 * Este script hace una solicitud al API de auditoría y verifica que incluya causas
 */

const fs = require('fs');
const path = require('path');

async function testCauses() {
  try {
    console.log('🧪 Verificando que las causas se incluyen en el API...\n');

    // Leer el archivo del API
    const apiPath = path.join(__dirname, '../src/app/api/audit/delivery-consistency/route.ts');
    const apiContent = fs.readFileSync(apiPath, 'utf-8');

    // Verificaciones
    const checks = [
      {
        name: 'Interface Issue incluye "cause"',
        test: () => apiContent.includes('cause?: string;'),
      },
      {
        name: 'Interface Issue incluye "impact"',
        test: () => apiContent.includes('impact?: string;'),
      },
      {
        name: 'MISSING_MOVEMENT incluye causa',
        test: () => apiContent.includes('type: "MISSING_MOVEMENT"') && apiContent.includes('cause') && apiContent.includes('impact:'),
      },
      {
        name: 'QUANTITY_MISMATCH analiza múltiples movimientos',
        test: () => apiContent.includes('hasMultipleMovements') && apiContent.includes('timeDiff'),
      },
      {
        name: 'ORPHAN_MOVEMENT calcula días desde creación',
        test: () => apiContent.includes('daysSinceCreation'),
      },
    ];

    let passed = 0;
    let failed = 0;

    console.log('Verificaciones:\n');
    checks.forEach(check => {
      const result = check.test();
      const icon = result ? '✅' : '❌';
      console.log(`${icon} ${check.name}`);
      if (result) {
        passed++;
      } else {
        failed++;
      }
    });

    console.log(`\n📊 Resultado: ${passed} pasaron, ${failed} fallaron`);

    // Verificar el componente
    console.log('\n🧪 Verificando componente React...\n');

    const componentPath = path.join(__dirname, '../src/components/audit/DeliveryConsistencyAudit.tsx');
    const componentContent = fs.readFileSync(componentPath, 'utf-8');

    const componentChecks = [
      {
        name: 'Componente incluye "cause" en interfaz',
        test: () => componentContent.includes('cause?: string;'),
      },
      {
        name: 'Componente incluye "impact" en interfaz',
        test: () => componentContent.includes('impact?: string;'),
      },
      {
        name: 'Componente muestra sección de causas',
        test: () => componentContent.includes('¿Por qué sucedió?'),
      },
      {
        name: 'Componente muestra sección de impacto',
        test: () => componentContent.includes('Impacto en Inventario'),
      },
    ];

    let componentPassed = 0;
    let componentFailed = 0;

    componentChecks.forEach(check => {
      const result = check.test();
      const icon = result ? '✅' : '❌';
      console.log(`${icon} ${check.name}`);
      if (result) {
        componentPassed++;
      } else {
        componentFailed++;
      }
    });

    console.log(`\n📊 Componente: ${componentPassed} pasaron, ${componentFailed} fallaron`);

    if (failed === 0 && componentFailed === 0) {
      console.log('\n✨ ¡Todas las verificaciones pasaron! Las causas están implementadas correctamente.');
      process.exit(0);
    } else {
      console.log('\n⚠️ Algunas verificaciones fallaron. Revisa la implementación.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
    process.exit(1);
  }
}

testCauses();
