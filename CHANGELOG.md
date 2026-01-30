# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.0.2] - 2026-01-30

### ✨ Agregado

#### Frontend
- Integración de **Vercel Analytics** en la app React para métricas de uso.

---

## [1.0.1] - 2026-01-26

### 🛡️ Validación Robusta de Entradas

**Problema resuelto:** El backend confiaba demasiado en el frontend y aceptaba URLs "raras" con esquemas, rutas, puertos, etc.

### ✨ Agregado

#### Validación de Entradas
- **Validación estricta en el backend** - Solo acepta dominios FQDN puros
- **Protección contra inyecciones** - Bloquea XSS, SQL injection, path traversal
- **Rechazo de componentes no permitidos:**
  - ❌ Esquemas: `http://`, `https://`, `ftp://`, `javascript:`
  - ❌ Rutas: `/path`, `/path/to/page`
  - ❌ Parámetros: `?query=1`, `&param=value`
  - ❌ Fragmentos: `#section`
  - ❌ Puertos: `:8080`, `:443`
  - ❌ Credenciales: `user@`, `user:pass@`
  - ❌ Direcciones IP: `192.168.1.1`, `10.0.0.1`
  - ❌ Caracteres especiales: espacios, null bytes, CRLF

#### Funciones de Validación
- `validate_domain()` en `api/utils.py` - Valida formato FQDN básico
- `validate_url()` en `api/utils.py` - Validación completa con rechazo de componentes
- `validate_fqdn()` en `api/solicitar-proteccion.py` - Validación mejorada con excepciones tipadas
- Regex compilados para mejor rendimiento

#### Tests de Validación
- `scripts/test_validacion_entrada.py` - Suite completa (50+ tests)
- `scripts/test_quick_validation.py` - Tests rápidos (7 tests)
- `scripts/verificar_validacion.py` - Verificación integral (3 suites)
- Todos los tests pasan correctamente ✅

#### Documentación
- `docs/VALIDACION_ENTRADAS.md` - Documentación completa de validación
- `VALIDACION_IMPLEMENTADA.md` - Resumen ejecutivo de la implementación
- Sección en README.md sobre validación de entradas

### 🔒 Mejorado

#### Seguridad
- **Validación en todos los endpoints:**
  - `api/solicitar-proteccion.py` - Valida URLs antes de provisionar
  - `api/verificar-delegacion.py` - Valida dominio antes de verificar DNS
  - `api/toggle-protection.py` - Valida dominio si se proporciona
- **Mensajes de error descriptivos** - Indican exactamente qué está mal
- **Protección contra ataques:**
  - Inyección de esquemas maliciosos
  - Path traversal
  - CRLF injection
  - SQL injection
  - XSS en dominio

#### Performance
- Regex compilados para validación más rápida
- Validación centralizada en `api/utils.py`
- Código optimizado y sin duplicación

### 📊 Resultados de Tests

**Suite Completa (`test_validacion_entrada.py`):**
- ✅ 20/20 tests de validación de dominios
- ✅ 13/13 tests de validación de URLs
- ✅ 8/8 tests de casos extremos
- ✅ 9/9 tests de seguridad

**Tests Rápidos (`test_quick_validation.py`):**
- ✅ 7/7 tests pasados

**Verificación Integral (`verificar_validacion.py`):**
- ✅ Validación básica: PASÓ
- ✅ Seguridad: PASÓ
- ✅ Casos extremos: PASÓ

### 🔗 Referencias

- [VALIDACION_ENTRADAS.md](./docs/VALIDACION_ENTRADAS.md) - Documentación técnica completa
- [VALIDACION_IMPLEMENTADA.md](./VALIDACION_IMPLEMENTADA.md) - Resumen ejecutivo
- [README.md](./README.md#-validación-robusta-de-entradas) - Sección de validación

---

## [1.0.0] - 2026-01-22

### 🎉 Lanzamiento Inicial

Primera versión estable del Sistema de Protección Perimetral Automatizada con Cloudflare.

**✅ VERIFICADO: Funcionamiento 100% REAL**
- Todos los scripts y APIs funcionan en modo REAL con credenciales configuradas
- Solo entra en simulación si NO hay credenciales (modo seguro)
- Operaciones reales verificadas contra Cloudflare API
- Sin código de simulación hardcodeado

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
