// Middleware optimizado para Edge (<=1MB) evitando importar Prisma, zod, bcrypt, etc.
// En lugar de usar "auth" (que arrastra la configuración completa de NextAuth),
// validamos el token JWT con getToken y mantenemos la lógica mínima de protección.

import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const AUTH_SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

if (!AUTH_SECRET) {
  throw new Error('Auth.js secret no configurado. Define AUTH_SECRET o NEXTAUTH_SECRET en las variables de entorno.');
}

// Rutas públicas exactas
const PUBLIC_SET = new Set([
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/error',
  '/api/health',
]);

// Prefijos públicos (comienzos de path) – evita incluir la config completa de NextAuth
const PUBLIC_PREFIXES = ['/api/auth']; // callbacks / endpoints de next-auth

function isPublic(pathname: string): boolean {
  if (PUBLIC_SET.has(pathname)) return true;
  return PUBLIC_PREFIXES.some(p => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const { pathname } = nextUrl;

  // Permitir recursos de vercel / static vía matcher (config) pero aquí un early guard simple
  if (isPublic(pathname)) {
    // Si ya está logueado y accede a /auth/signin → redirigir
    if (pathname.startsWith('/auth/signin')) {
      const token = await getToken({ req, secret: AUTH_SECRET });
      if (token) {
        const url = nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  }

  // Validar sesión mínima mediante JWT. Esto NO importa Prisma ni providers pesados.
  const token = await getToken({ req, secret: AUTH_SECRET });

  if (!token) {
    const loginUrl = nextUrl.clone();
    loginUrl.pathname = '/auth/signin';
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Excluir archivos estáticos y rutas internas de Next.js
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Incluir rutas de API
    '/(api|trpc)(.*)',
  ],
};
