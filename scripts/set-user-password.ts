/**
 * Script para establecer contraseña para usuarios existentes
 * Ejecutar con:
 *   npx tsx scripts/set-user-password.ts [--email=correo@dominio] [--min-length=8] [--salt-rounds=12]
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

const args = process.argv.slice(2);
const emailArg = args.find((a) => a.startsWith('--email='));
const minLenArg = args.find((a) => a.startsWith('--min-length='));
const saltRoundsArg = args.find((a) => a.startsWith('--salt-rounds='));

const MIN_LENGTH = minLenArg ? parseInt(minLenArg.split('=')[1], 10) : 8;
const SALT_ROUNDS = saltRoundsArg ? parseInt(saltRoundsArg.split('=')[1], 10) : 10;

async function setUserPassword() {
  try {
    console.log('📝 Configuración de contraseña para usuario existente\n');

    let selectedUser: { id: string; email: string; name: string; role: string } | undefined;

    if (emailArg) {
      const email = emailArg.split('=')[1];
      selectedUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, name: true, role: true },
      }) as any;
      if (!selectedUser) {
        console.log(`❌ No se encontró usuario con email: ${email}`);
        return;
      }
      console.log(`✅ Usuario seleccionado por email: ${selectedUser.email}`);
    } else {
      // Listar usuarios si no se proporciona --email
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
      selectedUser = users[parseInt(userIndex) - 1] as any;

      if (!selectedUser) {
        console.log('❌ Usuario no válido');
        return;
      }

      console.log(`\n✅ Usuario seleccionado: ${selectedUser.email}`);
    }

    const password = await question(`Ingresa la nueva contraseña (mínimo ${MIN_LENGTH} caracteres): `);

    if (password.length < MIN_LENGTH) {
      console.log(`❌ La contraseña debe tener al menos ${MIN_LENGTH} caracteres`);
      return;
    }

    const confirmPassword = await question('Confirma la contraseña: ');

    if (password !== confirmPassword) {
      console.log('❌ Las contraseñas no coinciden');
      return;
    }

    const confirm = await question('Escribe "CONFIRMAR" para aplicar el cambio: ');
    if (confirm !== 'CONFIRMAR') {
      console.log('❌ Operación cancelada');
      return;
    }

    // Hashear contraseña
    console.log('\n🔐 Hasheando contraseña...');
    const hashedPassword = await hash(password, SALT_ROUNDS);

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