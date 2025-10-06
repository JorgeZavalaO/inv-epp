/**
 * Script para establecer contraseña para usuarios existentes
 * Ejecutar con: npx tsx scripts/set-user-password.ts
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function setUserPassword() {
  try {
    console.log('📝 Configuración de contraseña para usuario existente\n');

    // Listar usuarios
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (users.length === 0) {
      console.log('❌ No se encontraron usuarios en la base de datos.');
      return;
    }

    console.log('Usuarios encontrados:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.name}) - Rol: ${user.role}`);
    });

    const userIndex = await question('\nSelecciona el número del usuario: ');
    const selectedUser = users[parseInt(userIndex) - 1];

    if (!selectedUser) {
      console.log('❌ Usuario no válido');
      return;
    }

    console.log(`\n✅ Usuario seleccionado: ${selectedUser.email}`);

    const password = await question('Ingresa la nueva contraseña (mínimo 6 caracteres): ');

    if (password.length < 6) {
      console.log('❌ La contraseña debe tener al menos 6 caracteres');
      return;
    }

    const confirmPassword = await question('Confirma la contraseña: ');

    if (password !== confirmPassword) {
      console.log('❌ Las contraseñas no coinciden');
      return;
    }

    // Hashear contraseña
    console.log('\n🔐 Hasheando contraseña...');
    const hashedPassword = await hash(password, 10);

    // Actualizar usuario
    await prisma.user.update({
      where: { id: selectedUser.id },
      data: { password: hashedPassword },
    });

    console.log(`\n✅ Contraseña actualizada exitosamente para ${selectedUser.email}`);
    console.log('🔑 Ahora puedes iniciar sesión con:');
    console.log(`   Email: ${selectedUser.email}`);
    console.log(`   Contraseña: [la que acabas de configurar]`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

setUserPassword();