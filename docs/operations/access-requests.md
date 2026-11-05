# Solicitudes de acceso y notificaciones

El registro público de usuarios está deshabilitado. La página `/auth/signup`
ahora es un formulario de **solicitud de acceso** que guarda el contacto de la
persona interesada en la tabla `AccessRequest`. Las cuentas las sigue creando un
administrador desde el módulo Usuarios.

## Dónde se ven las solicitudes

Un ADMIN las ve en **Configuración → Solicitudes de acceso**, con botones para
escribir por correo, abrir WhatsApp (si dejaron teléfono) y marcarlas como
contactadas.

## Notificaciones automáticas (opcionales)

Sin variables de entorno, la solicitud se guarda igual y aparece en el panel,
pero no se envía ningún aviso. Para activar avisos, configurar en Vercel:

| Variable | Uso |
|---|---|
| `CONTACT_WEBHOOK_URL` | Recibe un `POST` JSON con los datos del contacto. Sirve para Zapier, Make o la API de WhatsApp Cloud. |
| `CALLMEBOT_API_KEY` + `CALLMEBOT_PHONE` | Envían un WhatsApp mediante CallMeBot. El destinatario debe activar el bot una vez para obtener su API key. |
| `RESEND_API_KEY` | Envía un correo mediante Resend. |
| `CONTACT_NOTIFICATION_EMAIL` | Destinatario del correo. Por ejemplo, el correo del administrador. |
| `CONTACT_NOTIFICATION_FROM` | Remitente verificado en Resend. Por defecto `onboarding@resend.dev`. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Correo público que se muestra en la página de solicitud. |
| `NEXT_PUBLIC_CONTACT_WHATSAPP` | Número de WhatsApp en formato internacional. Si está vacío, no se muestra el botón. |

Los fallos de notificación no bloquean la solicitud: el lead queda guardado
igual y el error se registra en los logs del servidor.

## Pendiente recomendado

- Configurar `CONTACT_WEBHOOK_URL` o `RESEND_API_KEY` para recibir el aviso
  automático.
- Definir `NEXT_PUBLIC_CONTACT_WHATSAPP` con el número de contacto comercial.
- Si el volumen de solicitudes crece, agregar rate limiting por IP.
