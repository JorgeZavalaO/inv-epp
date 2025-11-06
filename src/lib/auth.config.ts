import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;

if (!authSecret) {
  throw new Error('Auth.js secret no configurado. Define AUTH_SECRET o NEXTAUTH_SECRET en las variables de entorno.');
}

if (!authUrl) {
  console.warn('Advertencia: AUTH_URL o NEXTAUTH_URL no configurados. Define la URL pública para Auth.js en tus variables de entorno.');
}

const loginSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
});

export default {
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' }
      },
      async authorize(credentials) {
        try {
          // Validar credenciales
          const { email, password } = loginSchema.parse(credentials);

          // Buscar usuario
          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              role: true,
              isActive: true,
              image: true,
            },
          });

          if (!user) {
            console.log('Usuario no encontrado:', email);
            return null;
          }

          if (!user.isActive) {
            console.log('Usuario inactivo:', email);
            return null;
          }

          // Verificar contraseña
          const isValid = await compare(password, user.password);

          if (!isValid) {
            console.log('Contraseña inválida para:', email);
            return null;
          }

          // Actualizar último login
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });

          // Retornar usuario (sin password)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
          };
        } catch (error) {
          console.error('Error en authorize:', error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id as string; // Type assertion to ensure it's treated as a string
        token.role = user.role;
      }
      
      // Actualizar el rol desde la BD si ha pasado más de 5 minutos
      // O si es un update trigger (cuando se actualiza la sesión manualmente)
      if (trigger === 'update' || !token.lastRoleCheck || Date.now() - (token.lastRoleCheck as number) > 5 * 60 * 1000) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, isActive: true },
          });
          
          if (dbUser) {
            // Actualizar el rol si cambió
            if (dbUser.role !== token.role) {
              console.log(`Rol actualizado para usuario ${token.id}: ${token.role} -> ${dbUser.role}`);
              token.role = dbUser.role;
            }
            
            // Si el usuario fue desactivado, invalidar la sesión
            if (!dbUser.isActive) {
              console.log(`Usuario ${token.id} fue desactivado`);
              return null as any; // Esto invalidará la sesión
            }
          }
          
          token.lastRoleCheck = Date.now();
        } catch (error) {
          console.error('Error al verificar rol del usuario:', error);
          // En caso de error, mantener el token actual
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session.user.role = token.role as any;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-authjs.session-token' 
        : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60, // 30 días
      },
    },
  },
  trustHost: true,
  secret: authSecret,
} satisfies NextAuthConfig;