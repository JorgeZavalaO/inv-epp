import { PrismaClient, RoleName } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const roles = [RoleName.ADMIN, RoleName.JEFA_SST, RoleName.SUPERVISOR]

  // Crear roles
  for (const r of roles) {
    await prisma.role.upsert({
      where: { name: r },
      update: {},
      create: { name: r }
    })
  }

  // Obtener IDs de roles
  const allRoles = await prisma.role.findMany()
  const roleMap = Object.fromEntries(allRoles.map(r => [r.name, r.id]))

  const initialUsers = [
    { email: 'admin@empresa.com',   role: RoleName.ADMIN,     password: 'Admin123!' },
    { email: 'sst@empresa.com',     role: RoleName.JEFA_SST,  password: 'Sst12345!' },
    { email: 'sup@empresa.com',     role: RoleName.SUPERVISOR, password: 'Sup12345!' },
  ]

  for (const u of initialUsers) {
    const hashedPassword = await bcrypt.hash(u.password, 10)

    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password: hashedPassword,
        roleId: roleMap[u.role]
      },
      create: {
        email: u.email,
        password: hashedPassword,
        roleId: roleMap[u.role]
      }
    })
  }

  console.log('✅ Seed inicial completado')
}

main()
  .catch(e => {
    console.error('❌ Error en el seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
