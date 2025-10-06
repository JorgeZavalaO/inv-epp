import NextAuth from 'next-auth';
import authConfig from './auth.config';

// Auth.js sin adaptador de Prisma (usamos credentials provider)
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
});