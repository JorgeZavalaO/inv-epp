import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

// Rutas públicas que no requieren autenticación
const publicRoutes = [
  '/auth/signin',
  '/auth/signup',
  '/auth/error',
  '/',
  '/api/health',
  '/api/auth',
];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  
  // Permitir rutas públicas
  const isPublicRoute = publicRoutes.some(route => 
    nextUrl.pathname.startsWith(route)
  );
  
  if (isPublicRoute) {
    // Si ya está logueado y trata de ir a signin, redirigir a dashboard
    if (isLoggedIn && nextUrl.pathname.startsWith('/auth/signin')) {
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
    return NextResponse.next();
  }
  
  // Redirigir a login si no está autenticado
  if (!isLoggedIn) {
    const loginUrl = new URL('/auth/signin', nextUrl);
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Excluir archivos estáticos y rutas internas de Next.js
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Incluir rutas de API
    '/(api|trpc)(.*)',
  ],
};
