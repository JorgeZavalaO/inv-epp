
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-gradient-to-br from-primary-light to-primary-dark text-white">      
      <h1 className="mt-6 text-4xl font-extrabold">Bienvenido a EPP Manager</h1>
      <p className="mt-2 text-lg max-w-xl text-center">
        Gestiona de manera eficiente tus Equipos de Protección Personal con nuestra plataforma intuitiva.
      </p>
      <div className="mt-8 flex gap-4">
        <Link href="/epps" className="px-6 py-3 bg-white text-primary-dark rounded-md font-medium hover:bg-gray-100 transition">
          Ver Inventario
        </Link>
        <Link href="/dashboard" className="px-6 py-3 border border-white rounded-md font-medium hover:bg-white/20 transition">
          Ir al Panel
        </Link>
      </div>
      <footer className="absolute bottom-4 text-sm opacity-80">
        © {new Date().getFullYear()} EPP Manager
      </footer>
    </div>
  );
}
