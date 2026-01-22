# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.0.0] - 2026-01-22

### 🎉 Lanzamiento Inicial

Primera versión estable del Sistema de Protección Perimetral Automatizada con Cloudflare.

### ✨ Agregado

#### Frontend
- Interfaz web moderna con React + TypeScript + Tailwind CSS
- Formulario de solicitud de protección con validación
- Protección anti-bot con Cloudflare Turnstile
- Visualización de logs en tiempo real
- Panel de Control de Protección
- Verificación automática de delegación DNS
- Instrucciones detalladas de delegación DNS
- Navegación mejorada entre vistas
- Modo claro/oscuro
- Diseño totalmente responsive

#### Backend
- API serverless en Python (Vercel Functions)
- Integración completa con Cloudflare API
- API de solicitud de protección (`/api/solicitar-proteccion`)
- API de control de protecciones (`/api/toggle-protection`)
- API de verificación de delegación DNS (`/api/verificar-delegacion`)
- API de diagnóstico (`/api/diagnostico`)
- Módulo de configuración centralizada (`api/config.py`)
- Módulo de utilidades compartidas (`api/utils.py`)
- Validación de seguridad con Turnstile
- Resolución automática de IPs mediante DNS
- Manejo robusto de errores

#### Protecciones Implementadas
- DNS con Proxy (Nube Naranja)
- SSL/TLS en modo Strict
- Redirección forzada HTTPS
- Web Application Firewall (WAF)
- Protección DDoS
- Reglas de Firewall personalizadas

#### Documentación
- README.md completo con guías de uso
- Documentación técnica en `/docs`
- Scripts de verificación en `/scripts`
- Ejemplos de uso y troubleshooting

### 🔧 Optimizado

#### Estructura del Proyecto
- Eliminados archivos obsoletos:
  - `app.py` (Flask obsoleto)
  - `cloudflare_protect.py` (lógica duplicada)
  - `verify_protection.py` (consolidado)
  - `test_real_protection.py` (consolidado)
  - `test-api.html` (archivos de prueba)
  - `test-toggle-protection.html` (archivos de prueba)
  - `diagnostico.html` (movido a tools)
  - `src/App_old.tsx` (backup innecesario)

#### Organización
- Scripts consolidados en `/scripts`
- Documentación organizada en `/docs`
- Configuración centralizada en `api/config.py`
- Utilidades compartidas en `api/utils.py`
- `.gitignore` actualizado

#### Dependencias
- Eliminadas dependencias obsoletas (Flask, Flask-CORS)
- Agregado `python-dotenv` para gestión de variables de entorno
- Actualizadas versiones de dependencias

#### Configuración
- `vercel.json` actualizado con todas las APIs
- `package.json` con información profesional
- `requirements.txt` limpio y documentado
- Scripts npm agregados (`npm run verify`)

### 📝 Documentación

#### Nuevos Documentos
- `CHANGELOG.md` - Historial de cambios
- `scripts/README.md` - Documentación de scripts
- `docs/INDEX.md` - Índice de documentación

#### Actualizados
- `README.md` - Estructura optimizada y actualizada
- Documentación de APIs
- Guías de troubleshooting

### 🐛 Corregido
- Rutas de APIs en `vercel.json`
- Imports en módulos Python
- Validación de dominios
- Manejo de errores en APIs

### 🔒 Seguridad
- Validación de tokens Turnstile
- Validación de formato de URLs
- Validación de dominios en zona
- CORS configurado correctamente
- Manejo seguro de credenciales

---

## [Unreleased]

### Planeado para v1.1
- Historial de cambios de protección
- Notificaciones por email
- Polling automático de verificación DNS
- Dashboard de métricas

---

## Tipos de Cambios

- `Agregado` - Para nuevas funcionalidades
- `Cambiado` - Para cambios en funcionalidades existentes
- `Obsoleto` - Para funcionalidades que serán eliminadas
- `Eliminado` - Para funcionalidades eliminadas
- `Corregido` - Para corrección de bugs
- `Seguridad` - Para vulnerabilidades de seguridad

---

**Formato de Versiones:** [MAJOR.MINOR.PATCH]
- **MAJOR:** Cambios incompatibles con versiones anteriores
- **MINOR:** Nuevas funcionalidades compatibles con versiones anteriores
- **PATCH:** Correcciones de bugs compatibles con versiones anteriores
