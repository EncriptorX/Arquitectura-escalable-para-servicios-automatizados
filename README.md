# 🛡️ Sistema de Protección Perimetral Automatizada con Cloudflare

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/KevPatterson/cloudflare-perimeter-protection)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.9+-yellow.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)

Sistema web automatizado para configurar protección perimetral de seguridad utilizando la API de Cloudflare. Desarrollado como proyecto de tesis para demostrar la automatización de configuraciones de seguridad en infraestructura cloud.

## 🆕 Actualización Importante - Arquitectura CSaaS (Enero 2026)

### ⚡ Nueva Arquitectura Compatible con Plan Gratuito

El proyecto ha sido completamente adaptado para funcionar con el **plan gratuito de Cloudflare**, eliminando la dependencia de `custom_origin_server` y `custom_origin_sni` (no disponibles en plan Free).

**Cambios Principales:**
- ✅ **Backend Proxy Inteligente**: Nuevo sistema de proxy reverso HTTP/HTTPS
- ✅ **Sin custom_origin_***: Compatible con plan gratuito de Cloudflare
- ✅ **Mínima Intervención del Cliente**: Solo requiere cambio DNS tipo CNAME
- ✅ **Protección Completa**: Todas las protecciones de Cloudflare activas

**Documentación Completa:**
- 📖 [ARQUITECTURA_PROXY.md](./ARQUITECTURA_PROXY.md) - Arquitectura completa
- 📖 [CAMBIOS_ARQUITECTURA.md](./CAMBIOS_ARQUITECTURA.md) - Resumen de cambios
- 📖 [README_PROXY.md](./README_PROXY.md) - Guía de uso del proxy
- 📖 [PRESENTACION_TESIS.md](./PRESENTACION_TESIS.md) - Presentación visual
- 📖 [INICIO_RAPIDO.md](./INICIO_RAPIDO.md) - Inicio rápido
- 📖 [RESUMEN_CAMBIOS.txt](./RESUMEN_CAMBIOS.txt) - Resumen ejecutivo

**Tests:**
```bash
# Ejecutar tests de la nueva arquitectura
python scripts/test_proxy_architecture.py
# Resultado: 6/6 tests pasados ✅
```

**Arquitectura:**
```
Cliente → cliente-abc.suncarsrl.com → Backend Proxy → www.cliente.com
          (Custom Hostname)           (api/proxy.py)   (Origin Real)
```

## 📋 Tabla de Contenidos

- [Descripción](#descripción)
- [Características](#características)
- [Arquitectura](#arquitectura)
- [Tecnologías](#tecnologías)
- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso](#uso)
- [Protecciones Implementadas](#protecciones-implementadas)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Flujo de Funcionamiento](#flujo-de-funcionamiento)
- [Deployment](#deployment)
- [Verificación](#verificación)
- [Limitaciones](#limitaciones)
- [Escalabilidad](#escalabilidad)
- [Documentación Adicional](#documentación-adicional)
- [Troubleshooting](#troubleshooting)
- [Contribución](#contribución)
- [Licencia](#licencia)

---

## 📖 Descripción

Este sistema automatiza la configuración de protección perimetral de seguridad para aplicaciones web mediante la API de Cloudflare. Permite a los usuarios solicitar protección para sus dominios a través de una interfaz web intuitiva, ejecutando automáticamente todas las configuraciones de seguridad necesarias.

### Problema que Resuelve

La configuración manual de protección perimetral en Cloudflare requiere:
- Conocimientos técnicos avanzados
- Múltiples pasos en el dashboard
- Tiempo considerable (30-60 minutos por dominio)
- Riesgo de errores de configuración

### Solución

Este sistema automatiza todo el proceso en **menos de 30 segundos**, aplicando:
- DNS con Proxy (Nube Naranja)
- SSL/TLS en modo Strict
- Redirección forzada HTTPS
- Web Application Firewall (WAF)
- Protección DDoS
- Reglas de Firewall personalizadas

---

## ✨ Características

### Frontend
- ✅ Interfaz web moderna y responsive (React + TypeScript + Tailwind CSS)
- ✅ Formulario de solicitud con validación en tiempo real
- ✅ Protección anti-bot con Cloudflare Turnstile
- ✅ Visualización de logs en tiempo real
- ✅ Indicadores de progreso animados
- ✅ **Panel de Control de Protección** - Activar/Desactivar políticas de seguridad
- ✅ **Verificación de Delegación DNS** - Comprobar estado de nameservers en tiempo real
- ✅ Instrucciones automáticas de delegación DNS con nameservers de Cloudflare
- ✅ Modo claro/oscuro
- ✅ Totalmente responsive (móvil, tablet, desktop)

### Backend
- ✅ API serverless en Python (Vercel Functions)
- ✅ Integración completa con Cloudflare API
- ✅ **API de Control del Servicio** - Activar/Desactivar el servicio globalmente
- ✅ **API de Toggle Protection** - Habilitar/Deshabilitar protecciones
- ✅ **API de Verificación de Delegación DNS** - Validar nameservers
- ✅ **Validación Robusta de Entradas** - Solo acepta dominios FQDN puros
- ✅ Validación de seguridad con Turnstile
- ✅ Resolución automática de IPs mediante DNS
- ✅ Manejo robusto de errores
- ✅ Logs detallados de cada operación

### Seguridad
- ✅ Validación de tokens Turnstile
- ✅ **Validación Estricta de Entradas** - Rechaza esquemas, rutas, puertos, IPs
- ✅ **Protección contra Inyecciones** - Bloquea XSS, SQL injection, path traversal
- ✅ Validación de formato de URLs (solo dominios FQDN)
- ✅ Validación de dominios en zona
- ✅ CORS configurado correctamente
- ✅ Manejo seguro de credenciales

### Nuevas Funcionalidades (Enero 2026)
- ✅ **Control de Protección en Tiempo Real** - Activar/desactivar políticas desde el panel
- ✅ **Verificación Automática de DNS** - Comprobar si el dominio está delegado correctamente
- ✅ **Instrucciones de Delegación Detalladas** - Pasos claros para configurar nameservers
- ✅ **Panel de Control Dedicado** - Interfaz completa para gestionar protecciones
- ✅ **Estado Visual de Protecciones** - Ver estado de WAF, HTTPS, Firewall, etc.
- ✅ **Navegación Mejorada** - Acceso fácil a todas las funcionalidades
- ✅ **Validación Robusta de Entradas** - Protección contra URLs maliciosas y ataques de inyección

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        USUARIO                               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (React + Vite)                    │
│  - Formulario de solicitud                                   │
│  - Validación de campos                                      │
│  - Cloudflare Turnstile                                      │
│  - Visualización de logs en tiempo real                      │
└────────────────────────┬────────────────────────────────────┘
                         │ POST /api/solicitar-proteccion
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (Python Serverless)                     │
│  1. Validar Turnstile                                        │
│  2. Validar URLs                                             │
│  3. Obtener información de zona                              │
│  4. Resolver IP del dominio                                  │
│  5. Ejecutar protecciones                                    │
│                                                              │
│  🔧 Sistema de Excepciones Tipadas:                         │
│     - ValidationError (400) - Errores de usuario            │
│     - AuthenticationError (403) - Errores de autenticación  │
│     - CloudflareAPIError (502) - Errores de Cloudflare      │
│     - DNSError (400) - Errores de DNS                       │
│     - NetworkError (503) - Errores de red                   │
│     - ServiceDisabledError (503) - Servicio deshabilitado   │
│                                                              │
│  🛡️ Validación Robusta de Entradas:                        │
│     - Solo acepta dominios FQDN puros                       │
│     - Rechaza esquemas (http://, https://)                  │
│     - Rechaza rutas, puertos, parámetros                    │
│     - Bloquea inyecciones (XSS, SQL, path traversal)        │
│     - Protección contra IPs y caracteres especiales         │
│                                                              │
│  📊 Sistema de Logging Estructurado:                        │
│     - Formato JSON con timestamps ISO 8601                  │
│     - Auditoría completa de operaciones                     │
│     - Trazabilidad de errores y eventos                     │
│     - Loggers especializados por categoría:                 │
│       * protection_logger - Solicitudes de protección       │
│       * delegation_logger - Verificación DNS                │
│       * service_logger - Control del servicio               │
│       * toggle_logger - Activación/desactivación            │
│     - Funciones de logging de auditoría:                    │
│       * log_protection_request() - Solicitudes              │
│       * log_dns_configuration() - Configuración DNS         │
│       * log_security_setting() - Cambios de seguridad       │
│       * log_firewall_rule() - Reglas de firewall           │
│       * log_delegation_check() - Verificación DNS           │
│       * log_service_toggle() - Estado del servicio          │
│       * log_api_error() - Errores de API                    │
│       * log_turnstile_verification() - Verificación Turnstile│
└────────────────────────┬────────────────────────────────────┘
                         │ API Calls
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   CLOUDFLARE API                             │
│  - GET /zones/{zone_id}                                      │
│  - POST/PUT /dns_records                                     │
│  - PATCH /settings/ssl                                       │
│  - PATCH /settings/always_use_https                          │
│  - PATCH /settings/waf                                       │
│  - PATCH /settings/security_level                            │
│  - POST /firewall/rules                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tecnologías

### Frontend
- **React 18** - Biblioteca de UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server
- **Tailwind CSS** - Framework de estilos
- **Framer Motion** - Animaciones
- **Lucide React** - Iconos
- **Cloudflare Turnstile** - Protección anti-bot

### Backend
- **Python 3.9+** - Lenguaje de programación
- **Vercel Serverless Functions** - Hosting del backend
- **urllib** - Cliente HTTP nativo
- **socket** - Resolución DNS

### Infraestructura
- **Vercel** - Hosting y deployment
- **Cloudflare** - Protección perimetral y DNS
- **Git/GitHub** - Control de versiones

---

## 📦 Requisitos Previos

### Software Necesario
- Node.js 18+ y npm/yarn
- Python 3.9+
- Git
- Cuenta en Vercel
- Cuenta en Cloudflare

### Cuentas y Credenciales

#### 1. Cloudflare
- Cuenta activa en [Cloudflare](https://dash.cloudflare.com)
- Dominio agregado a Cloudflare
- API Token con permisos:
  - Zone:Read
  - Zone Settings:Edit
  - DNS:Edit
  - Firewall Services:Edit
- Zone ID del dominio

#### 2. Cloudflare Turnstile
- Site Key (para frontend)
- Secret Key (para backend)

#### 3. Vercel
- Cuenta en [Vercel](https://vercel.com)
- Vercel CLI instalado (opcional)

---

## 🚀 Instalación

### 1. Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/cloudflare-perimeter-protection.git
cd cloudflare-perimeter-protection
```

### 2. Instalar Dependencias del Frontend

```bash
npm install
```

### 3. Instalar Dependencias del Backend

```bash
pip install -r requirements.txt
```

**Dependencias incluidas:**
- `requests==2.31.0` - Cliente HTTP para Cloudflare API
- `dnspython==2.4.2` - DNS lookups y verificación
- `python-dotenv==1.0.0` - Gestión de variables de entorno

### 4. Configurar Variables de Entorno

#### Frontend (.env)

```bash
# Crear archivo .env en la raíz del proyecto
VITE_TURNSTILE_SITE_KEY=tu_turnstile_site_key
```

#### Backend (Vercel)

Las variables del backend se configuran en Vercel Dashboard:

```bash
TURNSTILE_SECRET_KEY=tu_turnstile_secret_key
CF_API_TOKEN=tu_cloudflare_api_token
CF_ZONE_ID=tu_cloudflare_zone_id
```

---

## ⚙️ Configuración

### Paso 1: Obtener Cloudflare API Token

1. Ve a https://dash.cloudflare.com/profile/api-tokens
2. Click en "Create Token"
3. Usa la plantilla "Edit zone DNS" o crea uno custom
4. Permisos necesarios:
   - Zone:Read
   - Zone Settings:Edit
   - DNS:Edit
   - Firewall Services:Edit
5. Copia el token generado

### Paso 2: Obtener Cloudflare Zone ID

1. Ve a https://dash.cloudflare.com
2. Selecciona tu dominio
3. En la barra lateral derecha, busca "Zone ID"
4. Copia el Zone ID

### Paso 3: Configurar Cloudflare Turnstile

1. Ve a https://dash.cloudflare.com
2. Selecciona tu sitio
3. Ve a "Turnstile"
4. Crea un nuevo widget
5. Copia el Site Key y Secret Key

### Paso 4: Configurar Variables en Vercel

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega las variables:
   ```
   TURNSTILE_SECRET_KEY=...
   CF_API_TOKEN=...
   CF_ZONE_ID=...
   ```
4. Aplica a: Production, Preview, Development
5. Guarda los cambios

---

## 💻 Uso

### Desarrollo Local

#### 1. Iniciar el Frontend

```bash
npm run dev
```

El frontend estará disponible en `http://localhost:5173`

#### 2. Iniciar el Backend (Vercel Dev)

```bash
vercel dev
```

El backend estará disponible en `http://localhost:3000`

---

### Uso del Sistema

#### Flujo Principal: Solicitar Protección

##### 1. Acceder a la Aplicación

Abre tu navegador y ve a la URL del proyecto (local o producción).

##### 2. Llenar el Formulario

- **Nombre de la Empresa:** Nombre de tu organización
- **Nombre del Responsable:** Tu nombre
- **Correo Electrónico:** Email de contacto
- **Teléfono:** (Opcional) Número de contacto
- **URLs a Proteger:** Dominios o subdominios a proteger
  - Ejemplo: `demo.tudominio.com`
  - Puedes agregar múltiples URLs
- **Comentarios:** (Opcional) Información adicional

##### 3. Completar Turnstile

Completa el desafío de Cloudflare Turnstile para verificar que no eres un bot.

##### 4. Enviar Solicitud

Click en "Solicitar Protección" y espera a que el sistema procese la solicitud.

##### 5. Visualizar Resultados

- Verás logs en tiempo real de cada paso
- Indicador de progreso
- Banner indicando si es modo real o simulación
- Nameservers de Cloudflare al finalizar

##### 6. Instrucciones de Delegación DNS

El sistema muestra automáticamente:
- **Nameservers asignados por Cloudflare** (con botón de copiar)
- **Pasos detallados** para actualizar nameservers en tu registrador
- **Explicación clara** de qué es la delegación DNS y por qué es necesaria
- **Tiempos estimados** de propagación DNS (15 min - 48 horas)

##### 7. Verificar Delegación DNS

Una vez actualices los nameservers en tu registrador:
- Haz clic en **"Verificar Ahora"** en el componente de verificación
- El sistema comprueba automáticamente si los nameservers coinciden
- Muestra resultado visual:
  - ✅ **Verde** = Delegación exitosa, sistema puede continuar
  - ⏳ **Amarillo** = Delegación pendiente, espera propagación
  - ⚠️ **Naranja** = No se pudo verificar automáticamente

---

#### Flujo Secundario: Panel de Control

##### 1. Acceder al Panel de Control

Desde cualquier página, haz clic en **"Panel de Control"** en el header.

##### 2. Ver Estado de Protecciones

El panel muestra:
- **Estado general** (Activo/Inactivo)
- **Detalles de cada protección:**
  - WAF (Web Application Firewall)
  - HTTPS Redirect
  - Nivel de Seguridad
  - Reglas de Firewall
- **Última actualización**

##### 3. Activar/Desactivar Protecciones

- **Activar Protección:** Habilita todas las políticas de seguridad
  - WAF → ON
  - HTTPS Redirect → ON
  - Security Level → HIGH
  - Firewall Rules → ENABLED
  
- **Desactivar Protección:** Desactiva temporalmente las políticas
  - WAF → OFF
  - HTTPS Redirect → OFF
  - Security Level → MEDIUM
  - Firewall Rules → PAUSED

**⚠️ Importante:** Desactivar la protección deja tu dominio expuesto. Solo desactiva si es absolutamente necesario.

##### 4. Actualizar Estado

Haz clic en el botón de **refresh** (🔄) para actualizar el estado en tiempo real.

##### 5. Solicitar Protección para Nuevo Dominio

Desde el panel de control:
- Haz clic en **"Solicitar Protección"** en el header, o
- Haz clic en el botón destacado **"Solicitar Protección para Nuevo Dominio"**
- Se abrirá el formulario de solicitud

---

### Navegación del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                      PÁGINA PRINCIPAL                        │
│  - Hero section                                              │
│  - Características                                           │
│  - Beneficios                                                │
│  - Pasos                                                     │
│                                                              │
│  Header: [Panel de Control] [Solicitar Protección]          │
└─────────────────────────────────────────────────────────────┘
                    │                    │
        ┌───────────┘                    └───────────┐
        │                                            │
        ▼                                            ▼
┌──────────────────────┐              ┌──────────────────────┐
│  PANEL DE CONTROL    │              │  FORMULARIO          │
│  - Estado actual     │              │  - Datos empresa     │
│  - Activar/Desactivar│              │  - URLs              │
│  - Detalles          │              │  - Turnstile         │
│  - Solicitar nuevo   │              │  - Enviar            │
└──────────────────────┘              └──────────────────────┘
        │                                            │
        │                                            ▼
        │                              ┌──────────────────────┐
        │                              │  PÁGINA DE PROCESO   │
        │                              │  - Logs en tiempo    │
        │                              │    real              │
        │                              │  - Progreso          │
        │                              │  - Instrucciones DNS │
        │                              │  - Verificador DNS   │
        │                              │  - Control integrado │
        │                              └──────────────────────┘
        │                                            │
        └────────────────────────────────────────────┘
```

---

### 6. API de Estado del Sistema (NUEVO)

**Endpoint:** `GET /api/status`

**Descripción:** Obtiene el estado completo del sistema y todas las protecciones aplicadas.

**Response:**
```json
{
  "status": "ok",
  "service_enabled": true,
  "zone_info": {
    "id": "abc123...",
    "name": "tudominio.com",
    "status": "active",
    "nameservers": ["ns1.cloudflare.com", "ns2.cloudflare.com"]
  },
  "dns_records": {
    "total": 5,
    "proxied": 3,
    "records": [{
      "id": "...",
      "name": "demo.tudominio.com",
      "type": "A",
      "content": "192.0.2.1",
      "proxied": true
    }]
  },
  "security_settings": {
    "ssl": "strict",
    "always_use_https": "on",
    "waf": "on",
    "security_level": "high"
  },
  "firewall_rules": [{
    "id": "...",
    "description": "CAS Auto-Provisioned Block Rule",
    "action": "block",
    "paused": false
  }],
  "evidence": {
    "idempotent": true,
    "protected": true,
    "proxied": true
  },
  "summary": {
    "total_protections": 6,
    "active_protections": 5,
    "protection_level": "high"
  }
}
```

**Uso:**
- Verificar estado completo del sistema
- Comprobar qué protecciones están activas
- Obtener evidencia de configuración
- Auditoría de seguridad

---

## 🔌 APIs Disponibles

### 1. API de Solicitud de Protección

**Endpoint:** `POST /api/solicitar-proteccion`

**Descripción:** Configura protección perimetral completa para uno o más dominios.

**Request:**
```json
{
  "company": "Mi Empresa",
  "responsible": "Juan Pérez",
  "email": "juan@empresa.com",
  "phone": "+1234567890",
  "urls": ["demo.tudominio.com"],
  "comments": "Comentarios opcionales",
  "turnstileToken": "token_de_turnstile"
}
```

**Response (Éxito):**
```json
{
  "status": "ok",
  "message": "Protección perimetral configurada exitosamente",
  "urls": ["demo.tudominio.com"],
  "sitios": [{
    "dominio": "demo.tudominio.com",
    "estado": "Protección perimetral configurada",
    "nameservers": ["ns1.cloudflare.com", "ns2.cloudflare.com"],
    "origin_ip": "192.0.2.1"
  }],
  "logs": ["...", "..."],
  "progress": 100,
  "nameservers": ["ns1.cloudflare.com", "ns2.cloudflare.com"],
  "simulation_mode": false
}
```

---

### 2. API de Control de Protección (NUEVO)

**Endpoint:** `GET /api/toggle-protection`

**Descripción:** Obtiene el estado actual de todas las protecciones.

**Response:**
```json
{
  "status": "ok",
  "protection_status": {
    "waf": true,
    "https_redirect": true,
    "security_level": "high",
    "firewall_rules": [{
      "id": "...",
      "description": "CAS Auto-Provisioned Block Rule",
      "action": "block",
      "enabled": true
    }],
    "overall_enabled": true
  },
  "logs": ["..."]
}
```

**Endpoint:** `POST /api/toggle-protection`

**Descripción:** Activa o desactiva todas las protecciones.

**Request:**
```json
{
  "enable": true,
  "domain": "demo.tudominio.com"
}
```

**Response:**
```json
{
  "status": "ok",
  "message": "Protecciones activadas exitosamente",
  "toggle_result": {
    "success": true,
    "results": {
      "waf": true,
      "https_redirect": true,
      "security_level": true,
      "firewall_rules": true,
      "dns_proxy": true
    },
    "logs": ["..."]
  },
  "protection_status": { "..." }
}
```

---

### 3. API de Control del Servicio (NUEVO)

**Endpoint:** `GET /api/toggle-service`

**Descripción:** Obtiene el estado actual del servicio de protección.

**Response:**
```json
{
  "status": "ok",
  "service_enabled": true,
  "message": "Servicio habilitado"
}
```

**Endpoint:** `POST /api/toggle-service`

**Descripción:** Activa o desactiva el servicio de protección globalmente.

**Request:**
```json
{
  "enabled": false
}
```

**Response:**
```json
{
  "status": "ok",
  "service_enabled": false,
  "message": "Servicio deshabilitado exitosamente",
  "previous_state": true
}
```

**Notas:**
- Cuando el servicio está deshabilitado, `/api/solicitar-proteccion` retorna error 503
- El estado es global y afecta a todas las solicitudes
- Útil para mantenimiento o control de acceso temporal

---

### 4. API de Verificación de Delegación DNS (NUEVO)

**Endpoint:** `GET /api/verificar-delegacion`

**Descripción:** Health check del endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "API de verificación de delegación DNS funcionando",
  "has_cloudflare_config": true
}
```

**Endpoint:** `POST /api/verificar-delegacion`

**Descripción:** Verifica si un dominio está delegado correctamente a Cloudflare.

**Request:**
```json
{
  "dominio": "demo.tudominio.com"
}
```

**Response (Delegado):**
```json
{
  "status": "ok",
  "dominio": "demo.tudominio.com",
  "zona_cloudflare": "tudominio.com",
  "delegado": true,
  "puede_continuar": true,
  "nameservers_esperados": ["ns1.cloudflare.com", "ns2.cloudflare.com"],
  "nameservers_actuales": ["ns1.cloudflare.com", "ns2.cloudflare.com"],
  "mensaje": "✅ El dominio está correctamente delegado a Cloudflare...",
  "timestamp": "2026-01-22T10:30:00Z"
}
```

**Response (No Delegado):**
```json
{
  "status": "ok",
  "dominio": "demo.tudominio.com",
  "delegado": false,
  "puede_continuar": false,
  "nameservers_esperados": ["ns1.cloudflare.com", "ns2.cloudflare.com"],
  "nameservers_actuales": ["ns1.registrador.com", "ns2.registrador.com"],
  "mensaje": "⏳ El dominio aún NO está delegado a Cloudflare...",
  "timestamp": "2026-01-22T10:30:00Z"
}
```

---

### 5. API de Diagnóstico

**Endpoint:** `GET /api/diagnostico`

**Descripción:** Muestra el estado de configuración del sistema.

**Response:**
```json
{
  "modo_actual": "REAL",
  "configuracion": {
    "CF_API_TOKEN": {
      "configurado": true,
      "preview": "1234567890...",
      "longitud": 40
    },
    "CF_ZONE_ID": {
      "configurado": true,
      "preview": "abcdef12...",
      "longitud": 32
    },
    "TURNSTILE_SECRET_KEY": {
      "configurado": true,
      "preview": "0x4AAAA...",
      "longitud": 40
    }
  },
  "estado": {
    "puede_validar_turnstile": true,
    "puede_aplicar_proteccion_real": true,
    "modo_simulacion_activo": false
  },
  "instrucciones": []
}
```

---

## 🛡️ Protecciones Implementadas

### 1. DNS con Proxy (Nube Naranja)

**Qué hace:**
- Crea o actualiza registros DNS tipo A
- Activa el proxy de Cloudflare (`proxied: true`)
- Oculta la IP real del servidor origen

**API Call:**
```http
POST/PUT /zones/{zone_id}/dns_records
{
  "type": "A",
  "name": "demo.tudominio.com",
  "content": "192.0.2.1",
  "proxied": true,
  "ttl": 1
}
```

**Resultado:** Todo el tráfico pasa por Cloudflare antes de llegar al servidor.

---

### 2. SSL/TLS Strict

**Qué hace:**
- Configura cifrado end-to-end
- Modo: Full (Strict)
- Requiere certificado válido en el origen

**API Call:**
```http
PATCH /zones/{zone_id}/settings/ssl
{
  "value": "strict"
}
```

**Resultado:** Comunicación cifrada Cliente → Cloudflare → Servidor.

---

### 3. Force HTTPS

**Qué hace:**
- Redirección automática HTTP → HTTPS
- Funciona a nivel de edge

**API Call:**
```http
PATCH /zones/{zone_id}/settings/always_use_https
{
  "value": "on"
}
```

**Resultado:** Todas las peticiones HTTP se convierten en HTTPS.

---

### 4. Web Application Firewall (WAF)

**Qué hace:**
- Activa el motor WAF de Cloudflare
- Protege contra ataques OWASP Top 10

**API Call:**
```http
PATCH /zones/{zone_id}/settings/waf
{
  "value": "on"
}
```

**Protege contra:**
- SQL Injection
- XSS (Cross-Site Scripting)
- CSRF
- File Inclusion
- Command Injection

---

### 5. DDoS Protection

**Qué hace:**
- Configura nivel de seguridad alto
- Aumenta sensibilidad para desafíos CAPTCHA

**API Call:**
```http
PATCH /zones/{zone_id}/settings/security_level
{
  "value": "high"
}
```

**Protege contra:**
- DDoS Layer 3/4 (Network/Transport)
- DDoS Layer 7 (Application)
- Ataques volumétricos

---

### 6. Firewall Custom Rules

**Qué hace:**
- Crea reglas personalizadas de firewall
- Bloquea tráfico malicioso

**API Call:**
```http
POST /zones/{zone_id}/firewall/rules
[{
  "filter": {
    "expression": "(ip.geoip.country eq \"XX\") or (http.user_agent contains \"BadBot\")",
    "paused": false
  },
  "action": "block",
  "description": "CAS Auto-Provisioned Block Rule"
}]
```

**Resultado:** Filtrado avanzado de tráfico malicioso.

---

## 📁 Estructura del Proyecto

```
cloudflare-perimeter-protection/
├── api/                            # Backend - Vercel Serverless Functions
│   ├── config.py                   # Configuración centralizada
│   ├── utils.py                    # Utilidades compartidas
│   ├── logger.py                   # Sistema de logging estructurado
│   ├── exceptions.py               # Sistema de excepciones tipadas
│   ├── solicitar-proteccion.py     # API principal de protección
│   ├── toggle-protection.py        # API de control de protecciones
│   ├── toggle-service.py           # API de control del servicio
│   ├── verificar-delegacion.py     # API de verificación DNS
│   ├── diagnostico.py              # API de diagnóstico
│   └── status.py                   # API de estado del sistema
│
├── src/                            # Frontend - React + TypeScript
│   ├── components/
│   │   ├── ServiceRequestForm.tsx  # Formulario de solicitud
│   │   ├── ProcessInfoPage.tsx     # Página de resultados
│   │   ├── ControlPanelPage.tsx    # Panel de control
│   │   ├── ProtectionControl.tsx   # Control de protecciones
│   │   ├── DelegationChecker.tsx   # Verificador de DNS
│   │   ├── layout.tsx              # Layout principal
│   │   ├── log-terminal.tsx        # Terminal de logs
│   │   └── ui/                     # Componentes UI reutilizables
│   │       ├── card.tsx
│   │       ├── badge.tsx
│   │       └── alert.tsx
│   ├── hooks/
│   │   └── use-toast.ts            # Hook de notificaciones
│   ├── lib/
│   │   └── utils.ts                # Utilidades frontend
│   ├── App.tsx                     # Componente principal
│   ├── main.tsx                    # Entry point
│   └── index.css                   # Estilos globales
│
├── scripts/                        # Scripts de utilidad y herramientas
│   ├── README.md                   # Documentación de scripts
│   ├── OPTIMIZATIONS.md            # Documentación de optimizaciones
│   ├── run_all_tests.py            # Ejecutor de todos los tests
│   ├── demo_idempotencia.py        # Demostración de idempotencia
│   └── verificar_proteccion_aplicada.py  # Verificación de protecciones (OPTIMIZADO)
│
├── tests/                          # Suite completa de tests
│   ├── README.md                   # Documentación de tests
│   │
│   ├── validation/                 # Tests de validación de entradas
│   │   ├── test_validacion_entrada.py    # Suite completa (50+ tests)
│   │   ├── test_validacion_fqdn.py       # Tests de formato FQDN
│   │   ├── test_quick_validation.py      # Tests rápidos
│   │   └── verificar_validacion.py       # Verificación integral
│   │
│   ├── unit/                       # Tests unitarios
│   │   ├── test_exceptions.py            # Sistema de excepciones
│   │   ├── test_logging.py               # Sistema de logging
│   │   ├── test_idempotencia.py          # Idempotencia y tolerancia
│   │   └── test_mensajes_informativos.py # Mensajes al usuario
│   │
│   └── integration/                # Tests de integración
│       ├── test_integration_exceptions.py # Integración de excepciones
│       ├── test_status_endpoint.py        # Endpoint /status
│       ├── test_toggle_service.py         # Control del servicio
│       ├── test_turnstile_handling.py     # Manejo de Turnstile
│       ├── test_verificacion_delegacion.py # Verificación DNS
│       └── test_flow_controller.py        # Controlador de flujo
│
├── docs/                           # Documentación adicional
│   ├── INDEX.md                    # Índice de documentación
│   ├── VALIDACION_ENTRADAS.md      # Documentación de validación de entradas
│   ├── VERIFICACION_DELEGACION.md  # Doc de verificación DNS
│   ├── CLOUDFLARE_INTEGRATION.md   # Integración con Cloudflare
│   ├── DEPLOYMENT.md               # Guía de despliegue
│   ├── IMPLEMENTACION_MULTI_TENANT.md  # Guía multi-tenant
│   └── ...                         # Más documentación
│
├── supabase/                       # Base de datos (futuro)
│   └── migrations/
│
├── public/                         # Archivos estáticos
├── dist/                           # Build de producción
│
├── .env                            # Variables de entorno (local)
├── .gitignore                      # Archivos ignorados por Git
├── vercel.json                     # Configuración de Vercel
├── package.json                    # Dependencias Node.js
├── requirements.txt                # Dependencias Python
├── tsconfig.json                   # Configuración TypeScript
├── tailwind.config.js              # Configuración Tailwind
├── vite.config.ts                  # Configuración Vite
└── README.md                       # Este archivo
```

### Estructura Optimizada

**Cambios recientes (v1.0.0):**
- ✅ Eliminados archivos obsoletos (`app.py`, `cloudflare_protect.py`)
- ✅ Consolidados scripts de verificación en `/scripts`
- ✅ Creado módulo de configuración centralizada (`api/config.py`)
- ✅ Creado módulo de utilidades compartidas (`api/utils.py`)
- ✅ Actualizado `vercel.json` con todas las APIs
- ✅ Limpieza de archivos de prueba HTML
- ✅ Documentación organizada en `/docs`

---

## 🔄 Flujo de Funcionamiento

### Flujo Completo del Sistema

```
1. Usuario accede a la aplicación web
   ↓
2. Llena el formulario con sus datos
   ↓
3. Ingresa URL(s) a proteger
   ↓
4. Completa Cloudflare Turnstile
   ↓
5. Click en "Solicitar Protección"
   ↓
6. Frontend envía POST a /api/solicitar-proteccion
   {
     "company": "...",
     "email": "...",
     "urls": ["demo.tudominio.com"],
     "turnstileToken": "..."
   }
   ↓
7. Backend valida token de Turnstile
   ↓
8. Backend valida formato de URLs
   ↓
9. Backend obtiene información de la zona de Cloudflare
   GET /zones/{zone_id}
   ↓
10. Backend resuelve IP del dominio
    socket.gethostbyname("demo.tudominio.com")
    ↓
11. Backend valida que el dominio pertenece a la zona
    ↓
12. Backend ejecuta 6 protecciones:
    a. DNS con Proxy (POST /dns_records)
    b. SSL/TLS Strict (PATCH /settings/ssl)
    c. Force HTTPS (PATCH /settings/always_use_https)
    d. WAF (PATCH /settings/waf)
    e. DDoS Protection (PATCH /settings/security_level)
    f. Firewall Rules (POST /firewall/rules)
    ↓
13. Backend retorna respuesta con logs
    {
      "status": "ok",
      "logs": [...],
      "nameservers": [...],
      "simulation_mode": false
    }
    ↓
14. Frontend recibe respuesta
    ↓
15. Frontend muestra logs progresivamente (300ms por log)
    ↓
16. Frontend muestra banner "MODO REAL ACTIVO"
    ↓
17. Frontend muestra nameservers de Cloudflare
    ↓
18. Usuario ve resultado final
```

### Flujo de Logs en Tiempo Real

```
Frontend:
1. Recibe array de logs del backend
2. Guarda todos los logs en estado
3. Muestra logs uno por uno cada 300ms
4. Actualiza barra de progreso
5. Al terminar, muestra estado final

Backend:
1. Cada operación agrega logs
2. Logs se acumulan en array
3. Al final, retorna todos los logs
4. Frontend los muestra progresivamente
```

---

## 🚀 Deployment

### Deployment en Vercel

#### 1. Conectar Repositorio

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login en Vercel
vercel login

# Deploy
vercel
```

#### 2. Configurar Variables de Entorno

En Vercel Dashboard:
1. Ve a Settings → Environment Variables
2. Agrega:
   ```
   TURNSTILE_SECRET_KEY=...
   CF_API_TOKEN=...
   CF_ZONE_ID=...
   ```

#### 3. Configurar Build Settings

Vercel detecta automáticamente la configuración desde `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "functions": {
    "api/**/*.py": {
      "runtime": "python3.9"
    }
  }
}
```

#### 4. Deploy

```bash
# Deploy a producción
vercel --prod
```

### Configuración de Dominio Personalizado

1. Ve a Vercel Dashboard → Settings → Domains
2. Agrega tu dominio personalizado
3. Configura DNS según las instrucciones
4. Espera propagación DNS

---

## ✅ Verificación

### Verificar que el Sistema Funciona en Modo REAL

El sistema está configurado para funcionar en **modo REAL** cuando las credenciales de Cloudflare están configuradas. Aquí está cómo verificarlo:

#### 🔍 Verificación de Modo de Operación

**1. Verificar Configuración (API de Diagnóstico):**

```bash
curl https://tu-dominio.vercel.app/api/diagnostico
```

**Respuesta esperada (Modo REAL):**
```json
{
  "modo_actual": "REAL",
  "configuracion": {
    "CF_API_TOKEN": {
      "configurado": true,
      "preview": "1234567890...",
      "longitud": 40
    },
    "CF_ZONE_ID": {
      "configurado": true,
      "preview": "abcdef12...",
      "longitud": 32
    }
  },
  "estado": {
    "puede_aplicar_proteccion_real": true,
    "modo_simulacion_activo": false
  }
}
```

**Respuesta en Modo Simulación (sin credenciales):**
```json
{
  "modo_actual": "SIMULACIÓN",
  "estado": {
    "puede_aplicar_proteccion_real": false,
    "modo_simulacion_activo": true
  }
}
```

#### 🎯 Garantía de Funcionamiento Real

**Todos los scripts y APIs funcionan en modo REAL cuando:**

✅ **Variables de entorno configuradas:**
- `CF_API_TOKEN` - Token de API de Cloudflare
- `CF_ZONE_ID` - ID de la zona de Cloudflare
- `TURNSTILE_SECRET_KEY` - Clave secreta de Turnstile

✅ **Operaciones REALES ejecutadas:**

1. **`api/solicitar-proteccion.py`**
   - ✅ Conecta con Cloudflare API real
   - ✅ Crea/actualiza registros DNS reales
   - ✅ Configura SSL/TLS real
   - ✅ Activa WAF real
   - ✅ Configura protección DDoS real
   - ✅ Crea reglas de firewall reales
   - ⚠️ Solo entra en simulación si NO hay credenciales

2. **`api/toggle-protection.py`**
   - ✅ Activa/desactiva protecciones reales
   - ✅ Modifica configuración real de Cloudflare
   - ✅ Sin modo simulación

3. **`api/verificar-delegacion.py`**
   - ✅ Consulta DNS real
   - ✅ Verifica nameservers reales
   - ✅ Compara con Cloudflare real
   - ✅ Sin modo simulación

4. **`scripts/verificar_proteccion_aplicada.py`**
   - ✅ Consulta estado real de Cloudflare
   - ✅ Verifica protecciones reales aplicadas
   - ✅ Sin modo simulación

#### 📋 Checklist de Verificación

**Para confirmar que el sistema funciona en modo REAL:**

- [ ] Variables de entorno configuradas en Vercel
- [ ] API de diagnóstico muestra `"modo_actual": "REAL"`
- [ ] Solicitud de protección retorna `"simulation_mode": false`
- [ ] Cambios visibles en Cloudflare Dashboard
- [ ] DNS records creados con proxy activo (🟠)
- [ ] SSL/TLS configurado en modo Strict
- [ ] WAF activado
- [ ] Security Level en High

#### 🧪 Prueba de Funcionamiento Real

**Paso 1: Verificar Modo**
```bash
curl https://tu-dominio.vercel.app/api/diagnostico | jq '.modo_actual'
# Debe retornar: "REAL"
```

**Paso 2: Solicitar Protección**
```bash
# Enviar solicitud desde el formulario web
# Verificar en la respuesta: "simulation_mode": false
```

**Paso 3: Verificar en Cloudflare**
```bash
# Ir a Cloudflare Dashboard
# DNS > Records > Buscar el dominio
# Debe tener 🟠 (nube naranja) = Proxied
```

**Paso 4: Ejecutar Script de Verificación**
```bash
python scripts/verificar_proteccion_aplicada.py
# Debe mostrar controles activos reales
```

#### ⚠️ Importante: Modo Simulación

El sistema **SOLO** entra en modo simulación si:
- ❌ `CF_API_TOKEN` no está configurado
- ❌ `CF_ZONE_ID` no está configurado

**Indicadores de modo simulación:**
- Respuesta incluye `"simulation_mode": true`
- Logs muestran "WARNING: Cloudflare credentials not configured"
- Nameservers muestran "Configure CF_API_TOKEN and CF_ZONE_ID"
- API de diagnóstico muestra `"modo_actual": "SIMULACIÓN"`

**Para salir del modo simulación:**
1. Configurar variables en Vercel Dashboard
2. Hacer redeploy del proyecto
3. Verificar con API de diagnóstico

---

### Verificar que el Sistema Funciona

#### Opción 1: Usar el Script de Verificación

```bash
# Desde la raíz del proyecto
python scripts/verificar_proteccion_aplicada.py

# O usando npm
npm run verify
```

**El script verifica y muestra claramente:**

✅ **Controles Activos:**
- DNS con Proxy (Nube Naranja)
- SSL/TLS en modo Strict
- Force HTTPS (Redirección automática)
- WAF (Web Application Firewall)
- DDoS Protection (Security Level High)
- Firewall Rules Personalizadas

❌ **Controles Inactivos:**
- Muestra qué protecciones no están configuradas
- Indica el impacto de seguridad
- Sugiere acciones correctivas

⚠️ **Limitaciones Técnicas:**
- Identifica controles no disponibles por plan
- Explica qué plan se requiere
- Muestra alternativas disponibles

**Ejemplo de salida:**
```
======================================================================
RESUMEN DE PROTECCION PERIMETRAL
======================================================================

Estadísticas:
   Total de controles verificados: 6
   Controles activos: 5
   Controles inactivos: 0
   Limitaciones de plan: 1

CONTROLES ACTIVOS:
   ✅ DNS con Proxy
   ✅ SSL/TLS Strict
   ✅ Force HTTPS
   ✅ WAF
   ✅ DDoS Protection

LIMITACIONES TÉCNICAS (No disponibles en tu plan):
   ⚠️  Firewall Rules Personalizadas

   NOTA: Estas funcionalidades requieren un plan superior.
   Las protecciones básicas (SSL, WAF, DDoS) siguen activas.

EVALUACIÓN GENERAL
   🎉 ¡EXCELENTE! Todas las protecciones disponibles están activas
   Nivel de seguridad: ÓPTIMO
```

#### Opción 2: Verificar en Cloudflare Dashboard

1. **DNS Records:**
   - Ve a DNS → Records
   - Busca el dominio
   - Debe tener 🟠 (nube naranja)

2. **SSL/TLS:**
   - Ve a SSL/TLS → Overview
   - Debe estar en "Full (strict)"

3. **Security:**
   - Ve a Security → Settings
   - Security Level: High
   - WAF: On

4. **Firewall:**
   - Ve a Security → WAF
   - Debe existir regla "CAS Auto-Provisioned Block Rule"

#### Opción 3: Verificar con curl

```bash
curl -I https://demo.tudominio.com

# Debe incluir headers de Cloudflare:
# cf-ray: ...
# cf-cache-status: ...
# server: cloudflare
```

### Página de Diagnóstico

Accede a `/diagnostico.html` para ver:
- Estado de configuración
- Variables de entorno
- Modo actual (Real/Simulación)
- Instrucciones de configuración

---

## ⚠️ Limitaciones

### Limitaciones Técnicas

1. **Una Zona = Un Dominio**
   - El `CF_ZONE_ID` configurado corresponde a un solo dominio
   - Solo se pueden proteger ese dominio y sus subdominios
   - No se pueden proteger dominios externos

2. **Requiere Dominio en Cloudflare**
   - El dominio debe estar agregado a Cloudflare previamente
   - El usuario debe tener acceso a la zona

3. **Nameservers Deben Estar Delegados**
   - Para que la protección funcione completamente
   - El usuario debe cambiar nameservers en su registrador
   - Puede tardar horas en propagar

### Limitaciones por Plan de Cloudflare

| Función | Free | Pro | Business |
|---------|------|-----|----------|
| DNS Proxy | ✅ | ✅ | ✅ |
| SSL/TLS | ✅ | ✅ | ✅ |
| WAF Básico | ✅ | ✅ | ✅ |
| DDoS Protection | ✅ | ✅ | ✅ |
| Firewall Rules | 5 reglas | 20 reglas | 100 reglas |
| WAF Avanzado | ❌ | ❌ | ✅ |

---

## 📈 Escalabilidad

### Modelo Actual: Subdominios (Demo)

**Uso:** Demostración académica

```
Zona: tudominio.com
Subdominios protegidos:
- demo.tudominio.com
- cliente1.tudominio.com
- cliente2.tudominio.com
```

**Ventajas:**
- ✅ Una sola zona
- ✅ Gratis
- ✅ Suficiente para demo

---

### Modelo Multi-Tenant (Producción)

**Uso:** Servicio SaaS real

**Cómo funciona:**
1. Usuario proporciona sus credenciales de Cloudflare
2. Usuario ingresa su `CF_API_TOKEN` y `CF_ZONE_ID`
3. Sistema usa las credenciales del usuario
4. Protege el dominio del usuario

**Ventajas:**
- ✅ Escalable infinitamente
- ✅ Sin costos adicionales
- ✅ Usuario controla su zona

**Implementación:** Ver `IMPLEMENTACION_MULTI_TENANT.md`

---

### Modelo Reseller (Enterprise)

**Uso:** Proveedor de servicios

**Cómo funciona:**
1. Proveedor agrega dominios a su cuenta
2. Proveedor gestiona múltiples zonas
3. Sistema usa credenciales del proveedor
4. Protege dominios de clientes

**Ventajas:**
- ✅ Usuario no necesita cuenta en Cloudflare
- ✅ Control total del proveedor

**Desventajas:**
- ❌ Requiere plan premium
- ❌ Costos por dominio

---

## 📚 Documentación Adicional

Toda la documentación adicional se encuentra en la carpeta **`docs/`**.

📖 **[Ver Índice Completo de Documentación](./docs/INDEX.md)**

### Documentos Principales

#### 📡 API y Desarrollo
- **[API_REFERENCE.md](./docs/API_REFERENCE.md)** - Referencia completa de APIs
- **[CLOUDFLARE_INTEGRATION.md](./docs/CLOUDFLARE_INTEGRATION.md)** - Integración con Cloudflare
- **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Guía de despliegue

#### 🔍 Verificación y DNS
- **[VERIFICACION_DELEGACION.md](./docs/VERIFICACION_DELEGACION.md)** - Documentación técnica de verificación DNS
- **[DEPLOYMENT_VERIFICACION_DELEGACION.md](./docs/DEPLOYMENT_VERIFICACION_DELEGACION.md)** - Guía de despliegue de verificación
- **[DIAGRAMA_VERIFICACION_DELEGACION.md](./docs/DIAGRAMA_VERIFICACION_DELEGACION.md)** - Diagramas de flujo

#### 📖 Guías de Uso
- **[GUIA_SUBDOMINIOS_DEMO.md](./docs/GUIA_SUBDOMINIOS_DEMO.md)** - Guía para usar subdominios
- **[COMO_DIAGNOSTICAR_CONSOLA.md](./docs/COMO_DIAGNOSTICAR_CONSOLA.md)** - Diagnóstico con consola
- **[README_DIAGNOSTICO.md](./docs/README_DIAGNOSTICO.md)** - Guía de diagnóstico completa

#### 🛡️ Protección y Seguridad
- **[VALIDACION_ENTRADAS.md](./docs/VALIDACION_ENTRADAS.md)** - Sistema de validación de entradas
- **[PROTECTION_VERIFICATION.md](./docs/PROTECTION_VERIFICATION.md)** - Verificación de protecciones

#### 🚀 Implementación
- **[IMPLEMENTACION_MULTI_TENANT.md](./docs/IMPLEMENTACION_MULTI_TENANT.md)** - Guía multi-tenant
- **[SOLUCION_MULTI_TENANT.md](./docs/SOLUCION_MULTI_TENANT.md)** - Solución multi-tenant detallada

#### 🎨 Diseño
- **[DESIGN_IMPROVEMENTS.md](./docs/DESIGN_IMPROVEMENTS.md)** - Mejoras de diseño
- **[RESPONSIVE_IMPROVEMENTS.md](./docs/RESPONSIVE_IMPROVEMENTS.md)** - Mejoras responsive
- **[UI_MOCKUPS_VERIFICACION.md](./docs/UI_MOCKUPS_VERIFICACION.md)** - Mockups de UI

---

## 🔧 Troubleshooting

### Problema: "MODO SIMULACIÓN ACTIVO"

**Causa:** Credenciales de Cloudflare no configuradas

**Solución:**
1. Ve a Vercel → Settings → Environment Variables
2. Verifica que existan `CF_API_TOKEN` y `CF_ZONE_ID`
3. Si no existen, agrégalas
4. Haz redeploy del proyecto

---

### Problema: "Error: Dominio no válido para esta zona"

**Causa:** El dominio no pertenece a la zona configurada

**Solución:**
- Usa subdominios de tu zona: `demo.tudominio.com`
- O configura el `CF_ZONE_ID` correcto para ese dominio

---

### Problema: "No se pudo resolver el dominio"

**Causa:** El dominio no existe o no tiene registros DNS

**Solución:**
- Verifica que el dominio exista
- Verifica que tenga registros DNS configurados
- Usa un dominio que ya esté funcionando

---

### Problema: Logs no aparecen en tiempo real

**Causa:** Error al parsear la respuesta del API

**Solución:**
1. Abre la consola del navegador (F12)
2. Busca errores en la consola
3. Verifica que el API esté retornando JSON válido
4. Revisa los logs de Vercel Functions

---

### Problema: Turnstile no se carga

**Causa:** `VITE_TURNSTILE_SITE_KEY` no configurado

**Solución:**
1. Crea archivo `.env` en la raíz
2. Agrega: `VITE_TURNSTILE_SITE_KEY=tu_site_key`
3. Reinicia el servidor de desarrollo

---

### Problema: Botón "Activar Protección" no hace nada (NUEVO)

**Causa:** Posibles causas:
- Endpoint no está respondiendo
- Error en la consola del navegador
- Credenciales de Cloudflare incorrectas

**Solución:**
1. Abre la consola del navegador (F12)
2. Busca logs que empiecen con `[ProtectionControl]`
3. Verifica el estado de la petición HTTP
4. Usa `test-toggle-protection.html` para probar el endpoint directamente
5. Verifica que `CF_API_TOKEN` y `CF_ZONE_ID` estén configurados correctamente

---

### Problema: "No se pudo verificar nameservers actuales" (NUEVO)

**Causa:** El servidor no puede hacer DNS lookups o el dominio no existe

**Solución:**
- Verifica que el dominio exista y tenga registros NS
- Espera unos minutos y vuelve a intentar
- Si persiste, verifica manualmente comparando los nameservers
- Asegúrate de que `dnspython` esté instalado: `pip install dnspython==2.4.2`

---

### Problema: Verificación DNS muestra "Delegación Pendiente" pero ya actualicé los nameservers (NUEVO)

**Causa:** Propagación DNS aún en proceso

**Solución:**
- La propagación DNS puede tardar de 15 minutos a 48 horas
- Típicamente toma 1-2 horas
- Espera un poco más y vuelve a verificar
- Usa herramientas como https://dnschecker.org para verificar la propagación global
- Verifica que actualizaste los nameservers en el registrador correcto

---

### Problema: Panel de Control muestra "Protección Inactiva" pero debería estar activa (NUEVO)

**Causa:** Alguna protección no está configurada correctamente

**Solución:**
1. Haz clic en el botón de refresh (🔄) para actualizar el estado
2. Verifica cada componente individual:
   - WAF debe estar ON
   - HTTPS Redirect debe estar ON
   - Security Level debe estar HIGH
   - Firewall Rules deben estar ENABLED
3. Si alguno está incorrecto, usa el botón "Activar Protección"
4. Verifica en Cloudflare Dashboard que las configuraciones se aplicaron

---

## 🤝 Contribución

¿Quieres contribuir al proyecto? ¡Genial! Lee nuestra [Guía de Contribución](./CONTRIBUTING.md) para comenzar.

### Cómo Contribuir

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios usando [Conventional Commits](https://www.conventionalcommits.org/)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Guías de Estilo

- **TypeScript:** Usar tipos explícitos, seguir convenciones de React
- **Python:** Seguir PEP 8, usar type hints
- **Commits:** Usar Conventional Commits (`feat:`, `fix:`, `docs:`, etc.)
- **Documentación:** Actualizar README.md y docs cuando sea necesario

Ver [CONTRIBUTING.md](./CONTRIBUTING.md) para más detalles.

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

---

## 📚 Archivos Importantes

- **[README.md](./README.md)** - Documentación principal del proyecto
- **[VALIDACION_IMPLEMENTADA.md](./VALIDACION_IMPLEMENTADA.md)** - Resumen de validación de entradas
- **[CHANGELOG.md](./CHANGELOG.md)** - Historial de cambios y versiones
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Guía para contribuir al proyecto
- **[.env.example](./.env.example)** - Ejemplo de variables de entorno
- **[docs/INDEX.md](./docs/INDEX.md)** - Índice de documentación adicional
- **[docs/VALIDACION_ENTRADAS.md](./docs/VALIDACION_ENTRADAS.md)** - Documentación completa de validación
- **[scripts/README.md](./scripts/README.md)** - Documentación de scripts de utilidad

---

## 👥 Autores

- **Kevin Patterson** - Desarrollo inicial - [GitHub](https://github.com/KevPatterson)

---

## 📊 Sistema de Logging Estructurado

El sistema implementa un sistema completo de logging estructurado para auditoría y trazabilidad de todas las operaciones.

### Características

- **Formato JSON** - Logs estructurados con timestamps ISO 8601
- **Loggers Especializados** - Diferentes loggers por categoría de operación
- **Auditoría Completa** - Registro de todas las operaciones críticas
- **Trazabilidad** - Seguimiento completo de errores y eventos
- **Contexto Rico** - Información detallada en cada log

### Loggers Disponibles

#### 1. Protection Logger
Registra solicitudes de protección y provisión de seguridad.

```python
from api.logger import log_protection_request

log_protection_request(
    domain="ejemplo.com",
    origin_ip="192.0.2.1",
    status="complete",
    operations={"dns_proxy": True, "waf": True},
    zone_name="ejemplo.com"
)
```

#### 2. Delegation Logger
Registra verificaciones de delegación DNS.

```python
from api.logger import log_delegation_check

log_delegation_check(
    domain="ejemplo.com",
    delegated=True,
    nameservers=["ns1.cloudflare.com", "ns2.cloudflare.com"],
    expected_nameservers=["ns1.cloudflare.com", "ns2.cloudflare.com"],
    zone_name="ejemplo.com"
)
```

#### 3. Service Logger
Registra cambios en el estado del servicio.

```python
from api.logger import log_service_toggle

log_service_toggle(
    enabled=True,
    previous_state=False,
    remote_ip="192.0.2.1"
)
```

#### 4. Toggle Logger
Registra activación/desactivación de protecciones.

```python
from api.logger import log_protection_toggle

log_protection_toggle(
    enabled=True,
    domain="ejemplo.com",
    operations={"waf": True, "https_redirect": True}
)
```

### Funciones de Logging de Auditoría

| Función | Descripción | Uso |
|---------|-------------|-----|
| `log_protection_request()` | Solicitudes de protección | Provisión de seguridad |
| `log_dns_configuration()` | Configuración DNS | Cambios en DNS |
| `log_security_setting()` | Configuración de seguridad | Cambios en WAF, SSL, etc. |
| `log_firewall_rule()` | Reglas de firewall | Creación/modificación de reglas |
| `log_delegation_check()` | Verificación DNS | Comprobación de nameservers |
| `log_service_toggle()` | Estado del servicio | Activar/desactivar servicio |
| `log_protection_toggle()` | Estado de protecciones | Activar/desactivar protecciones |
| `log_api_error()` | Errores de API | Errores en peticiones |
| `log_turnstile_verification()` | Verificación Turnstile | Validación de seguridad |

### Formato de Logs

Los logs se generan en formato JSON con la siguiente estructura:

```json
{
  "timestamp": "2026-01-26T10:30:00.123456Z",
  "level": "INFO",
  "logger": "protection",
  "event": "protection_request",
  "domain": "ejemplo.com",
  "origin_ip": "192.0.2.1",
  "status": "complete",
  "operations": {
    "dns_proxy": true,
    "waf": true,
    "https_redirect": true
  },
  "zone_name": "ejemplo.com"
}
```

### Tests

Ejecuta los tests del sistema de logging:

```bash
python scripts/test_logging.py
```

Ver [api/logger.py](./api/logger.py) para la implementación completa.

---

## 🔄 Idempotencia y Tolerancia a Fallos

El sistema está diseñado para ser idempotente y tolerante a fallos, permitiendo reprovisionamiento sin interrupciones.

### Qué es Idempotencia

Una operación es **idempotente** cuando puede ejecutarse múltiples veces sin cambiar el resultado más allá de la primera ejecución.

**Ejemplo:**
```python
# Primera ejecución: Crea registro DNS
provision_domain("ejemplo.com")  # ✅ Registro creado

# Segunda ejecución: Detecta que ya existe, no falla
provision_domain("ejemplo.com")  # ✅ Registro ya existe, continúa

# Tercera ejecución: Mismo resultado
provision_domain("ejemplo.com")  # ✅ Registro ya existe, continúa
```

### Operaciones Idempotentes

Todas las operaciones del sistema son idempotentes:

1. **DNS con Proxy**
   - Busca registro existente antes de crear
   - Si existe, actualiza en lugar de crear
   - No falla si el registro ya existe

2. **Configuración de Seguridad**
   - Verifica estado actual antes de aplicar
   - Solo aplica si es necesario
   - No falla si ya está configurado

3. **Reglas de Firewall**
   - Busca reglas existentes
   - Reactiva si están pausadas
   - No falla si ya existen

### Tolerancia a Fallos

El sistema continúa operando incluso si algunas operaciones fallan:

```python
# Flujo de provisión
1. DNS Proxy (CRÍTICO) ✅
2. SSL/TLS (IMPORTANTE) ✅
3. HTTPS Redirect (IMPORTANTE) ⚠️ Falla, pero continúa
4. WAF (IMPORTANTE) ✅
5. Security Level (IMPORTANTE) ✅
6. Firewall Rules (OPCIONAL) ⚠️ No disponible en plan, continúa

# Resultado: "partial" - Algunas protecciones activas
```

### Manejo de Errores Específicos

El sistema detecta y maneja errores específicos de Cloudflare:

| Código | Error | Manejo |
|--------|-------|--------|
| 81058 | Registro DNS ya existe | ✅ Continúa (idempotente) |
| 81057 | Registro DNS no encontrado | ⚠️ Intenta crear |
| 10000 | Permisos insuficientes | ❌ Falla con mensaje claro |
| 1003 | Limitación de plan | ⚠️ Continúa sin esa función |

### Tests de Idempotencia

Ejecuta los tests de idempotencia:

```bash
# Test completo de idempotencia
python scripts/test_idempotencia.py

# Demostración visual
python scripts/demo_idempotencia.py
```

**Verifica:**
- ✅ Operaciones pueden ejecutarse múltiples veces
- ✅ No fallan si la configuración ya existe
- ✅ Buscan estado actual antes de aplicar cambios
- ✅ Actualizan en lugar de crear duplicados

### Beneficios

1. **Reprovisionamiento Seguro** - Puedes ejecutar el provisión múltiples veces sin problemas
2. **Recuperación de Fallos** - Si algo falla, puedes reintentar sin efectos secundarios
3. **Actualizaciones Incrementales** - Puedes actualizar configuraciones sin romper lo existente
4. **Mantenimiento Simplificado** - No necesitas verificar estado antes de aplicar cambios

Ver [scripts/test_idempotencia.py](./scripts/test_idempotencia.py) y [scripts/demo_idempotencia.py](./scripts/demo_idempotencia.py) para más detalles.

---

## 🛡️ Validación Robusta de Entradas

El sistema implementa una validación estricta de entradas en el backend para proteger contra ataques y errores de usuario.

### Qué se Valida

El backend **solo acepta dominios FQDN puros** y rechaza:

❌ **Esquemas:** `http://`, `https://`, `ftp://`, `javascript:`, etc.
❌ **Rutas:** `/path`, `/path/to/page`
❌ **Parámetros:** `?query=1`, `&param=value`
❌ **Fragmentos:** `#section`, `#anchor`
❌ **Puertos:** `:8080`, `:443`
❌ **Credenciales:** `user@`, `user:pass@`
❌ **Direcciones IP:** `192.168.1.1`, `10.0.0.1`
❌ **Caracteres especiales:** Espacios, null bytes, CRLF

### Ejemplos

✅ **Válidos (Aceptados):**
```
ejemplo.com
sub.ejemplo.com
deep.sub.ejemplo.com
ejemplo-test.com
test.co.uk
```

❌ **Inválidos (Rechazados):**
```
http://ejemplo.com          → "No se permiten esquemas"
https://ejemplo.com         → "No se permiten esquemas"
ejemplo.com/path            → "No se permiten rutas"
ejemplo.com:8080            → "No se permiten puertos"
user@ejemplo.com            → "No se permiten credenciales"
192.168.1.1                 → "No se permiten direcciones IP"
javascript:alert(1)         → Bloqueado (inyección)
'; DROP TABLE domains; --   → Bloqueado (SQL injection)
```

### Protección de Seguridad

La validación protege contra:

1. **Inyección de esquemas maliciosos**
   - `javascript:alert(1)`
   - `data:text/html,<script>alert(1)</script>`
   - `file:///etc/passwd`

2. **Path traversal**
   - `ejemplo.com/../../../etc/passwd`

3. **CRLF injection**
   - `ejemplo.com\r\nHost: evil.com`

4. **SQL injection**
   - `'; DROP TABLE domains; --`

5. **XSS en dominio**
   - `<script>alert(1)</script>.com`

### Implementación

La validación se implementa en:

- **`api/utils.py`** - Funciones centralizadas de validación
  - `validate_domain()` - Valida formato FQDN
  - `validate_url()` - Validación completa con rechazo de componentes no permitidos

- **`api/solicitar-proteccion.py`** - Valida URLs antes de provisionar
- **`api/verificar-delegacion.py`** - Valida dominio antes de verificar DNS
- **`api/toggle-protection.py`** - Valida dominio si se proporciona

### Tests

Ejecuta los tests de validación:

```bash
# Suite completa (50+ tests)
python scripts/test_validacion_entrada.py

# Tests rápidos
python scripts/test_quick_validation.py

# Verificación integral
python scripts/verificar_validacion.py
```

**Resultados esperados:**
- ✅ Todos los dominios válidos son aceptados
- ✅ Todos los dominios inválidos son rechazados
- ✅ Todos los ataques de inyección son bloqueados

### Mensajes de Error

Los mensajes de error son claros y descriptivos:

```json
{
  "status": "error",
  "message": "No se permiten esquemas (http://, https://). Use solo el dominio FQDN",
  "error_type": "ValidationError",
  "error_category": "user_error",
  "invalid_url": "https://ejemplo.com"
}
```

Ver [VALIDACION_ENTRADAS.md](./docs/VALIDACION_ENTRADAS.md) para documentación completa.

---

## 🧪 Suite de Tests

El proyecto incluye una suite completa de tests para verificar todas las funcionalidades.

### Tests de Validación

| Test | Descripción | Comando |
|------|-------------|---------|
| `test_validacion_entrada.py` | Suite completa (50+ tests) | `python tests/validation/test_validacion_entrada.py` |
| `test_validacion_fqdn.py` | Tests de formato FQDN | `python tests/validation/test_validacion_fqdn.py` |
| `test_quick_validation.py` | Tests rápidos | `python tests/validation/test_quick_validation.py` |
| `verificar_validacion.py` | Verificación integral | `python tests/validation/verificar_validacion.py` |

### Tests Unitarios

| Test | Descripción | Comando |
|------|-------------|---------|
| `test_exceptions.py` | Excepciones tipadas | `python tests/unit/test_exceptions.py` |
| `test_logging.py` | Sistema de logging | `python tests/unit/test_logging.py` |
| `test_idempotencia.py` | Idempotencia y tolerancia | `python tests/unit/test_idempotencia.py` |
| `test_mensajes_informativos.py` | Mensajes al usuario | `python tests/unit/test_mensajes_informativos.py` |

### Tests de Integración

| Test | Descripción | Comando |
|------|-------------|---------|
| `test_integration_exceptions.py` | Integración de excepciones | `python tests/integration/test_integration_exceptions.py` |
| `test_status_endpoint.py` | Endpoint de estado | `python tests/integration/test_status_endpoint.py` |
| `test_toggle_service.py` | Control del servicio | `python tests/integration/test_toggle_service.py` |
| `test_turnstile_handling.py` | Manejo de Turnstile | `python tests/integration/test_turnstile_handling.py` |
| `test_verificacion_delegacion.py` | Verificación DNS | `python tests/integration/test_verificacion_delegacion.py` |
| `test_flow_controller.py` | Controlador de flujo | `python tests/integration/test_flow_controller.py` |

### Tests de Flujo

| Test | Descripción | Comando |
|------|-------------|---------|
| `test_flow_controller.py` | Controlador de flujo | `python tests/integration/test_flow_controller.py` |
| `test_refactored_solicitar.py` | Solicitud refactorizada | `python tests/integration/test_refactored_solicitar.py` |

### Ejecutar Todos los Tests

```bash
# Ejecutar todos los tests
python scripts/run_all_tests.py

# O usando npm
npm run test:all
```

### Scripts npm Disponibles

El proyecto incluye varios scripts npm para desarrollo y testing:

```bash
# Desarrollo
npm run dev          # Inicia servidor de desarrollo (Vite)
npm run build        # Construye para producción
npm run preview      # Preview del build de producción

# Calidad de Código
npm run lint         # Ejecuta ESLint
npm run typecheck    # Verifica tipos de TypeScript

# Verificación
npm run verify       # Verifica protecciones aplicadas
```

### Scripts de Demostración

| Script | Descripción | Comando |
|--------|-------------|---------|
| `demo_idempotencia.py` | Demo de idempotencia | `python scripts/demo_idempotencia.py` |
| `verificar_proteccion_aplicada.py` | Verificar protecciones | `python scripts/verificar_proteccion_aplicada.py` |

### Cobertura de Tests

La suite de tests cubre:

- ✅ **Validación de Entradas** - 50+ tests
- ✅ **Excepciones Tipadas** - 12 tests
- ✅ **Sistema de Logging** - Tests completos
- ✅ **Idempotencia** - Tests de operaciones repetidas
- ✅ **APIs** - Tests de todos los endpoints
- ✅ **Flujo de Provisión** - Tests del controlador central
- ✅ **Integración** - Tests de integración con Cloudflare

Ver [scripts/README.md](./scripts/README.md) y [tests/README.md](./tests/README.md) para documentación completa.

---

## 🔧 Sistema de Excepciones Tipadas

El sistema implementa un manejo robusto de errores con excepciones tipadas que permiten distinguir entre diferentes tipos de errores y manejarlos apropiadamente.

### Jerarquía de Excepciones

```python
BaseAPIError (Clase base)
├── ValidationError (400) - Errores de validación de usuario
├── AuthenticationError (403) - Errores de autenticación
├── CloudflareAPIError (502) - Errores de la API de Cloudflare
│   ├── CloudflareRateLimitError (429)
│   └── CloudflarePermissionError (403)
├── DNSError (400) - Errores de DNS
│   ├── DNSDelegationError
│   ├── DNSResolutionError
│   └── DNSRecordExistsError (200) - Idempotencia
├── NetworkError (503) - Errores de red
│   └── TimeoutError
├── ConfigurationError (500) - Errores de configuración
├── ServiceDisabledError (503) - Servicio deshabilitado
└── LogicError (500) - Errores lógicos
```

### Categorías de Errores

- **user_error**: Errores causados por el usuario (validación, autenticación)
- **cloudflare_error**: Errores de la API de Cloudflare
- **dns_error**: Errores relacionados con DNS
- **network_error**: Errores de conexión o timeout
- **configuration_error**: Errores de configuración del sistema
- **service_error**: Servicio deshabilitado o no disponible
- **idempotent**: Operaciones idempotentes (no son errores reales)

### Manejo de Errores en el Frontend

El frontend maneja automáticamente los diferentes tipos de errores mostrando mensajes apropiados:

```typescript
// Ejemplo de respuesta de error
{
  "status": "error",
  "message": "El dominio no cumple con el formato FQDN válido",
  "error_type": "ValidationError",
  "error_category": "user_error",
  "technical_message": "Detalles técnicos del error"
}
```

### Funciones Utilitarias

- `handle_cloudflare_error()`: Convierte errores de Cloudflare en excepciones tipadas
- `get_user_friendly_message()`: Genera mensajes amigables para el usuario

### Tests

Ejecuta los tests del sistema de excepciones:

```bash
python scripts/test_exceptions.py
```

---

## 🙏 Agradecimientos

- Cloudflare por su excelente API y documentación
- Vercel por el hosting serverless
- Comunidad de React y TypeScript
- Todos los que contribuyeron con feedback

---

## 📞 Soporte

Para soporte, abre un issue en GitHub o contacta a través de:
- Email: [tu-email@ejemplo.com]
- GitHub Issues: [https://github.com/KevPatterson/Cuban-CAS/issues]

---

## 🔗 Enlaces Útiles

- [Documentación de Cloudflare API](https://developers.cloudflare.com/api/)
- [Documentación de Vercel](https://vercel.com/docs)
- [Documentación de React](https://react.dev/)
- [Documentación de Tailwind CSS](https://tailwindcss.com/docs)
- [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/)

---

## 📊 Estado del Proyecto

- ✅ **Versión:** 1.0.0
- ✅ **Estado:** Producción
- ✅ **Última actualización:** Enero 2026
- ✅ **Mantenimiento:** Activo

### Funcionalidades Principales (v1.0.0)
- ✅ Solicitud de protección automatizada
- ✅ Panel de Control de Protección
- ✅ Activar/Desactivar protecciones en tiempo real
- ✅ Verificación automática de delegación DNS
- ✅ Instrucciones detalladas de delegación DNS
- ✅ Navegación mejorada entre vistas
- ✅ Estado visual de todas las protecciones
- ✅ API REST completa
- ✅ Arquitectura optimizada y modular
- ✅ **Sistema de Excepciones Tipadas** - Manejo robusto de errores
- ✅ **Logging Estructurado** - Auditoría completa de operaciones
- ✅ **Controlador Central de Flujo** - Orquestación clara de operaciones
- ✅ **Tolerancia a Fallos** - Operaciones idempotentes y resilientes
- ✅ **Validación Robusta de Entradas** - Protección contra ataques de inyección
- ✅ **Sistema de Logging Completo** - Auditoría detallada con loggers especializados

### Optimizaciones Recientes

**📦 Estructura del Proyecto**
- ✅ Eliminados 11 archivos obsoletos
- ✅ Consolidados scripts en `/scripts`
- ✅ Creados módulos compartidos (`api/config.py`, `api/utils.py`)
- ✅ Organización profesional de carpetas

**📝 Documentación**
- ✅ README.md profesional con badges
- ✅ CHANGELOG.md para historial de versiones
- ✅ CONTRIBUTING.md para colaboradores
- ✅ API_REFERENCE.md para documentación de APIs
- ✅ .env.example para configuración

**🔧 Configuración**
- ✅ `package.json` actualizado (v1.0.0)
- ✅ `requirements.txt` limpio (eliminado Flask)
- ✅ `vercel.json` con todas las APIs
- ✅ `.gitignore` mejorado

**📊 Métricas de Mejora**
- 🗑️ ~1,500 líneas de código eliminadas
- 📉 40% menos código duplicado
- 📈 100% de configuración centralizada
- ✅ 0 errores de TypeScript
- ⚠️ 2 warnings menores de ESLint

Ver [OPTIMIZATION_SUMMARY.md](./OPTIMIZATION_SUMMARY.md) para detalles completos.

---

## 🎯 Roadmap

### Versión 1.1 (Próxima)
- [ ] Historial de cambios de protección
- [ ] Notificaciones por email cuando delegación se complete
- [ ] Polling automático de verificación DNS
- [ ] Dashboard de métricas y estadísticas

### Versión 1.2 (Q2 2026)
- [ ] Soporte multi-tenant completo
- [ ] Gestión de múltiples dominios
- [ ] Roles y permisos de usuario
- [ ] Audit log de todas las operaciones
- [ ] Exportar configuración como código (IaC)

### Versión 2.0 (Futuro)
- [ ] Soporte para múltiples proveedores (AWS, Azure)
- [ ] API pública REST con autenticación
- [ ] Webhooks para eventos
- [ ] Integración con CI/CD
- [ ] CLI para automatización

---

**¡Gracias por usar este sistema! 🚀**

Si te ha sido útil, considera darle una ⭐ en GitHub.
