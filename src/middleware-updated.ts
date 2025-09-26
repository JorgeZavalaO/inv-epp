// middleware.ts - Actualizado para manejar health checks
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/',
  '/api/health', // ✅ Health check público para monitoreo
])

const isApiRoute = createRouteMatcher(['/api(.*)']);

export default clerkMiddleware(async (auth, req) => {
  // Permitir health checks sin autenticación
  if (req.nextUrl.pathname === '/api/health') {
    return;
  }
  
  // Proteger otras rutas privadas
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
  
  // Headers de seguridad para APIs
  if (isApiRoute(req)) {
    const response = new Response();
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
  }
});

export const config = {
  matcher: [
    // Excluir archivos estáticos y rutas internas de Next.js
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Incluir rutas de API
    '/(api|trpc)(.*)',
  ],
};