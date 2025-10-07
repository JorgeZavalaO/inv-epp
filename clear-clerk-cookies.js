// Script para limpiar cookies de Clerk y verificar el estado
// Ejecutar en la consola del navegador

// Función para limpiar cookies de Clerk
function clearClerkCookies() {
  const cookies = document.cookie.split(';');
  
  cookies.forEach(cookie => {
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
    
    if (name.includes('clerk') || name.includes('__clerk')) {
      // Limpiar cookie para el dominio actual
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname}`;
      console.log(`Eliminada cookie: ${name}`);
    }
  });
  
  console.log('Cookies de Clerk eliminadas. Recarga la página.');
}

// Función para verificar cookies actuales
function checkCookies() {
  const cookies = document.cookie.split(';');
  console.log('Cookies actuales:');
  cookies.forEach(cookie => {
    console.log(cookie.trim());
  });
}

// Ejecutar limpieza
console.log('=== LIMPIEZA DE COOKIES CLERK ===');
clearClerkCookies();
checkCookies();