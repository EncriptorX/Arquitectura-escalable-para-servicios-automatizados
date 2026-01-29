# Medidas de seguridad aplicadas

Este documento resume las medidas de seguridad implementadas en el proyecto.

## 1) Cabeceras de seguridad (anti‑clickjacking)

- **X-Frame-Options: DENY**
- **Content-Security-Policy** con `frame-ancestors 'none'`

**Aplicación:**
- Frontend (HTML estático) mediante CSP en [index.html](../index.html).
- Backend (API) en respuestas JSON y estándar.
- Configuración global en Vercel para todo el sitio.

## 2) CSP (Content Security Policy)

- **CSP base** con límites de `script-src`, `style-src`, `img-src`, `connect-src` y `frame-src`.
- **`frame-ancestors 'none'`** para bloquear el embebido del sitio en iframes de terceros.

## 3) Subresource Integrity (SRI)

- Scripts externos con **SRI SHA-512**.
- `crossorigin="anonymous"` para validar integridad correctamente.
- Aplicado al script de Cloudflare Turnstile.

## 4) CORS con allowlist

## 4) CORS bloqueado (sin acceso de terceros)

- `Access-Control-Allow-Origin` bloqueado con `null` para impedir acceso XHR desde cualquier sitio.
- `Vary: Origin` para evitar caché insegura.

## 5) Protección de endpoints administrativos

- `ADMIN_API_KEY` requerido para `POST` en endpoints administrativos.
- Admite `X-Admin-Key` o `Authorization: Bearer`.

## 6) Validación estricta de entradas

- Validación de dominios FQDN sin esquemas, rutas, puertos ni credenciales.
- Rechazo de IPs directas en entradas de dominio.

## 7) Prevención de SSRF en el proxy

- Validación del dominio de origen.
- Resolución DNS y bloqueo de destinos privados/reservados/loopback/link-local.

## 8) Sanitización de secretos

- `.env` sin credenciales reales.
- Uso de `.env.example` con placeholders.

## 9) Permissions-Policy

- `Permissions-Policy` aplicado globalmente para restringir APIs del navegador.

## 10) Cabeceras adicionales

- **Strict-Transport-Security (HSTS)** para forzar HTTPS.
- **X-Content-Type-Options: nosniff** para evitar MIME sniffing.
- **Referrer-Policy: no-referrer** para limitar fuga de URLs.

---

Si necesitas ajustar alguna política (por ejemplo, permitir `frame-ancestors` para un dominio de confianza), indícalo y se actualiza.
