# 🛡️ Sistema de Protección Perimetral Automatizada con Cloudflare

Sistema web automatizado para configurar protección perimetral de seguridad utilizando la API de Cloudflare. Desarrollado como proyecto de tesis para demostrar la automatización de configuraciones de seguridad en infraestructura cloud.

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
- ✅ **API de Toggle Protection** - Habilitar/Deshabilitar protecciones
- ✅ **API de Verificación de Delegación DNS** - Validar nameservers
- ✅ Validación de seguridad con Turnstile
- ✅ Resolución automática de IPs mediante DNS
- ✅ Manejo robusto de errores
- ✅ Logs detallados de cada operación

### Seguridad
- ✅ Validación de tokens Turnstile
- ✅ Validación de formato de URLs
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
git clone https://github.com/tu-usuario/cuban-cas.git
cd cuban-cas
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
- `flask==3.0.0` - Framework web
- `flask-cors==4.0.0` - CORS support
- `requests==2.31.0` - Cliente HTTP
- `dnspython==2.4.2` - DNS lookups (NUEVO)

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

### 3. API de Verificación de Delegación DNS (NUEVO)

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

### 4. API de Diagnóstico

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
cuban-cas/
├── api/
│   ├── solicitar-proteccion.py    # API principal de protección
│   ├── toggle-protection.py        # API de control de protecciones (NUEVO)
│   ├── verificar-delegacion.py    # API de verificación DNS (NUEVO)
│   └── diagnostico.py              # API de diagnóstico
├── src/
│   ├── components/
│   │   ├── ServiceRequestForm.tsx  # Formulario de solicitud
│   │   ├── ProcessInfoPage.tsx     # Página de resultados
│   │   ├── ControlPanelPage.tsx    # Panel de control (NUEVO)
│   │   ├── ProtectionControl.tsx   # Control de protecciones (NUEVO)
│   │   ├── DelegationChecker.tsx   # Verificador de DNS (NUEVO)
│   │   ├── layout.tsx              # Layout principal
│   │   ├── log-terminal.tsx        # Terminal de logs
│   │   └── ui/                     # Componentes UI
│   │       ├── card.tsx
│   │       ├── badge.tsx
│   │       └── alert.tsx
│   ├── hooks/
│   │   ├── use-tasks.ts            # Hook de tareas
│   │   ├── use-task-stream.ts      # Hook de streaming
│   │   └── use-toast.ts            # Hook de notificaciones
│   ├── lib/
│   │   └── utils.ts                # Utilidades
│   ├── App.tsx                     # Componente principal (ACTUALIZADO)
│   ├── main.tsx                    # Entry point
│   └── index.css                   # Estilos globales
├── public/                         # Archivos estáticos
├── docs/                           # Documentación adicional (NUEVO)
│   ├── VERIFICACION_DELEGACION.md  # Doc de verificación DNS
│   ├── DEPLOYMENT_VERIFICACION_DELEGACION.md
│   ├── RESUMEN_EJECUTIVO_VERIFICACION.md
│   ├── DIAGRAMA_VERIFICACION_DELEGACION.md
│   ├── UI_MOCKUPS_VERIFICACION.md
│   ├── GUIA_SUBDOMINIOS_DEMO.md
│   ├── CONFIRMACION_FINAL.md
│   ├── FUNCIONAMIENTO_REAL_SERVICIO.md
│   ├── DIAGRAMA_FLUJO_SERVICIO.md
│   ├── PROTECTION_VERIFICATION.md
│   ├── IMPLEMENTACION_MULTI_TENANT.md
│   ├── COMO_DIAGNOSTICAR_CONSOLA.md
│   ├── README_DIAGNOSTICO.md
│   ├── CLOUDFLARE_INTEGRATION.md
│   ├── DEPLOYMENT.md
│   ├── DESIGN_IMPROVEMENTS.md
│   ├── RESPONSIVE_IMPROVEMENTS.md
│   └── ...
├── test-toggle-protection.html     # Test del API de toggle (NUEVO)
├── cloudflare_protect.py           # Script original de protección
├── verificar_proteccion_aplicada.py # Script de verificación
├── diagnostico.html                # Página de diagnóstico
├── vercel.json                     # Configuración de Vercel
├── package.json                    # Dependencias Node.js
├── requirements.txt                # Dependencias Python (ACTUALIZADO)
├── tsconfig.json                   # Configuración TypeScript
├── tailwind.config.js              # Configuración Tailwind
├── vite.config.ts                  # Configuración Vite
└── README.md                       # Este archivo
```

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

### Verificar que el Sistema Funciona

#### Opción 1: Usar el Script de Verificación

```bash
python verificar_proteccion_aplicada.py
```

Este script verifica:
- ✅ Registros DNS con proxy activo
- ✅ Configuración SSL/TLS
- ✅ Force HTTPS
- ✅ WAF
- ✅ DDoS Protection
- ✅ Firewall Rules

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

#### Verificación y Delegación DNS
- **`docs/VERIFICACION_DELEGACION.md`** - Documentación técnica completa de verificación DNS
- **`docs/DEPLOYMENT_VERIFICACION_DELEGACION.md`** - Guía de despliegue de verificación
- **`docs/RESUMEN_EJECUTIVO_VERIFICACION.md`** - Resumen ejecutivo de la funcionalidad
- **`docs/DIAGRAMA_VERIFICACION_DELEGACION.md`** - Diagramas de flujo de verificación
- **`docs/UI_MOCKUPS_VERIFICACION.md`** - Mockups de interfaz de usuario

#### Guías de Uso
- **`docs/GUIA_SUBDOMINIOS_DEMO.md`** - Guía para usar subdominios en demostración
- **`docs/COMO_DIAGNOSTICAR_CONSOLA.md`** - Diagnóstico usando consola del navegador
- **`docs/README_DIAGNOSTICO.md`** - Guía de diagnóstico completa

#### Funcionamiento del Sistema
- **`docs/CONFIRMACION_FINAL.md`** - Confirmación de implementación correcta
- **`docs/FUNCIONAMIENTO_REAL_SERVICIO.md`** - Explicación detallada del funcionamiento
- **`docs/DIAGRAMA_FLUJO_SERVICIO.md`** - Diagramas de flujo del sistema
- **`docs/SERVICIO_REAL_VERIFICACION.md`** - Verificación del servicio real

#### Protección y Seguridad
- **`docs/PROTECTION_VERIFICATION.md`** - Verificación de protecciones
- **`docs/CLOUDFLARE_INTEGRATION.md`** - Integración con Cloudflare

#### Implementación y Despliegue
- **`docs/IMPLEMENTACION_MULTI_TENANT.md`** - Guía para implementar multi-tenant
- **`docs/SOLUCION_MULTI_TENANT.md`** - Solución multi-tenant detallada
- **`docs/DEPLOYMENT.md`** - Guía de despliegue general
- **`docs/DEPLOYMENT_FIX.md`** - Correcciones de despliegue

#### Mejoras y Diseño
- **`docs/DESIGN_IMPROVEMENTS.md`** - Mejoras de diseño implementadas
- **`docs/RESPONSIVE_IMPROVEMENTS.md`** - Mejoras de responsive design
- **`docs/DIAGNOSTICO_MODO_ACTUAL.md`** - Diagnóstico del modo actual

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

### Cómo Contribuir

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Guías de Estilo

- **TypeScript:** Usar tipos explícitos
- **Python:** Seguir PEP 8
- **Commits:** Usar Conventional Commits
- **Documentación:** Actualizar README.md

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

---

## 👥 Autores

- **Kevin Patterson** - Desarrollo inicial - [GitHub](https://github.com/KevPatterson)

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

- ✅ **Versión:** 2.0.0
- ✅ **Estado:** Producción
- ✅ **Última actualización:** Enero 2026
- ✅ **Mantenimiento:** Activo

### Nuevas Funcionalidades (v2.0.0 - Enero 2026)
- ✅ Panel de Control de Protección
- ✅ Activar/Desactivar protecciones en tiempo real
- ✅ Verificación automática de delegación DNS
- ✅ Instrucciones detalladas de delegación DNS
- ✅ Navegación mejorada entre vistas
- ✅ Estado visual de todas las protecciones
- ✅ API de toggle protection
- ✅ API de verificación de delegación

---

## 🎯 Roadmap

### Versión 2.1 (Próxima)
- [ ] Historial de cambios de protección
- [ ] Notificaciones por email cuando delegación se complete
- [ ] Polling automático de verificación DNS
- [ ] Dashboard de métricas y estadísticas
- [ ] Exportar configuración como código (IaC)

### Versión 2.2 (Q2 2026)
- [ ] Soporte multi-tenant completo
- [ ] Gestión de múltiples dominios
- [ ] Roles y permisos de usuario
- [ ] Audit log de todas las operaciones

### Versión 3.0 (Futuro)
- [ ] Soporte para múltiples proveedores (AWS, Azure)
- [ ] API pública REST
- [ ] Webhooks para eventos
- [ ] Integración con CI/CD
- [ ] CLI para automatización

---

**¡Gracias por usar este sistema! 🚀**

Si te ha sido útil, considera darle una ⭐ en GitHub.
