<<<<<<< HEAD
# 🛡️ Cuban CAS - Cybersecurity as a Service Platform

> Enterprise-grade SaaS platform for automated cybersecurity services with multi-tenant architecture and Stripe integration.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e.svg)](https://supabase.com/)

---

## 📋 Tabla de Contenidos

- [Descripción](#descripción)
- [Características](#características)
- [Arquitectura](#arquitectura)
- [Stack Tecnológico](#stack-tecnológico)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso](#uso)
- [Documentación](#documentación)
- [Contribución](#contribución)
- [Licencia](#licencia)

---

## 🎯 Descripción

**Cuban CAS** es una plataforma SaaS multi-tenant de servicios automatizados de ciberseguridad, desarrollada como proyecto de tesis. Implementa una arquitectura Zero Trust con Row Level Security (RLS), integración completa con Stripe para monetización, y Edge Functions serverless para escalabilidad.

### **Problema que Resuelve:**
Las empresas necesitan servicios de ciberseguridad profesionales pero carecen de:
- Recursos para contratar equipos especializados
- Herramientas automatizadas de monitoreo
- Reportes de seguridad en tiempo real
- Gestión centralizada de múltiples dominios

### **Solución:**
Plataforma SaaS que automatiza:
- ✅ Protección perimetral con Cloudflare
- ✅ Escaneo de vulnerabilidades con Shodan
- ✅ Pruebas de rendimiento automatizadas
- ✅ Generación de reportes con IA
- ✅ Monitoreo continuo 24/7

---

## ✨ Características

### **🔐 Seguridad Multi-Tenant**
- Row Level Security (RLS) a nivel de PostgreSQL
- Aislamiento bulletproof entre organizaciones
- Control de acceso basado en roles (RBAC + ABAC)
- Auditoría completa de todas las acciones

### **💳 Monetización con Stripe**
- 4 planes: Free, Basic ($29), Pro ($99), Enterprise ($299)
- Checkout integrado con Stripe
- Webhooks para sincronización automática
- Suspensión automática por impago
- Facturación mensual y anual

### **🚀 Servicios Automatizados**
- **Cloudflare Protection**: WAF, DDoS, SSL automático
- **Vulnerability Scanning**: Detección de vulnerabilidades
- **Performance Testing**: Pruebas de carga y rendimiento
- **Security Testing**: Pruebas de seguridad automatizadas
- **AI Reports**: Reportes generados con IA

### **📊 Dashboard Completo**
- Métricas en tiempo real
- Gestión de dominios
- Historial de escaneos
- Reportes descargables
- Control de límites de plan

---

## 🏗️ Arquitectura

### **Diagrama de Alto Nivel:**

```
┌─────────────────────────────────────────────────────┐
│              FRONTEND (React + Vite)                 │
│  • TypeScript + Tailwind CSS                         │
│  • React Router + Context API                        │
│  • Real-time updates                                 │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│         EDGE FUNCTIONS (Supabase)                    │
│  • create-checkout (Stripe integration)              │
│  • stripe-webhook (Event processing)                 │
│  • validate-plan-limits (Usage control)              │
│  • check-subscriptions (Cron job)                    │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│         POSTGRESQL (Supabase)                        │
│  • 12 tables with RLS                                │
│  • 20+ security policies                             │
│  • Multi-tenant isolation                            │
│  • Automatic triggers                                │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES                       │
│  • Stripe (Payments)                                 │
│  • Cloudflare (Security)                             │
│  • Shodan (Vulnerability scanning)                   │
└─────────────────────────────────────────────────────┘
```

### **Patrones Arquitectónicos:**
- ✅ **Event-Driven Architecture (EDA)**
- ✅ **Zero Trust Security**
- ✅ **Multi-Tenant SaaS**
- ✅ **Serverless Functions**
- ✅ **Row Level Security (RLS)**

---

## 🛠️ Stack Tecnológico

### **Frontend:**
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation

### **Backend:**
- **Supabase** - Backend as a Service
- **PostgreSQL** - Database
- **Edge Functions** - Serverless functions (Deno)
- **Row Level Security** - Multi-tenant isolation

### **Integraciones:**
- **Stripe** - Payment processing
- **Cloudflare** - Security services
- **Shodan** - Vulnerability scanning
- **OpenAI** - AI report generation

### **DevOps:**
- **Git** - Version control
- **GitHub** - Repository hosting
- **Vercel** - Frontend deployment (opcional)
- **Supabase** - Backend hosting

---

## 📦 Instalación

### **Prerrequisitos:**
- Node.js 18+ 
- npm o yarn
- Git
- Cuenta en Supabase
- Cuenta en Stripe (opcional para testing)

### **Pasos:**

```bash
# 1. Clonar repositorio
git clone https://github.com/EncriptorX/Arquitectura-escalable-para-servicios-automatizados.git
cd Arquitectura-escalable-para-servicios-automatizados

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 4. Ejecutar migraciones de base de datos
# Ver: docs/SETUP_SUPABASE.md

# 5. Iniciar servidor de desarrollo
npm run dev
```

---

## ⚙️ Configuración

### **1. Supabase**

```bash
# Crear proyecto en https://supabase.com
# Obtener URL y Anon Key
# Ejecutar migraciones SQL en SQL Editor:
# - CONSOLIDATED_MIGRATION.sql
# - supabase/migrations/20260227_saas_monetization_complete.sql
```

Ver guía completa: [`docs/SETUP_SUPABASE.md`](docs/SETUP_SUPABASE.md)

### **2. Stripe**

```bash
# Crear cuenta en https://stripe.com
# Crear productos y precios
# Configurar webhook
# Actualizar Price IDs en base de datos
```

Ver guía completa: [`docs/SETUP_STRIPE.md`](docs/SETUP_STRIPE.md)

### **3. Variables de Entorno**

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# App
VITE_APP_NAME=Cuban CAS Platform
VITE_APP_URL=http://localhost:5173
```

---

## 🚀 Uso

### **Desarrollo Local:**

```bash
# Iniciar servidor de desarrollo
npm run dev

# Abrir en navegador
# http://localhost:5173
```

### **Compilar para Producción:**

```bash
# Build
npm run build

# Preview
npm run preview
```

### **Desplegar Edge Functions:**

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Desplegar funciones
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
supabase functions deploy validate-plan-limits
supabase functions deploy check-subscriptions
```

---

## 📚 Documentación

### **Arquitectura:**
- [`ARCHITECTURE.md`](ARCHITECTURE.md) - Arquitectura general del sistema
- [`docs/STRIPE_INTEGRATION_ARCHITECTURE.md`](docs/STRIPE_INTEGRATION_ARCHITECTURE.md) - Integración con Stripe
- [`docs/HARDCORE_SECURITY_ARCHITECTURE.md`](docs/HARDCORE_SECURITY_ARCHITECTURE.md) - Seguridad multi-tenant

### **Implementación:**
- [`docs/SAAS_IMPLEMENTATION_GUIDE.md`](docs/SAAS_IMPLEMENTATION_GUIDE.md) - Guía de implementación SaaS
- [`docs/STRIPE_COMPLETE_FLOW.md`](docs/STRIPE_COMPLETE_FLOW.md) - Flujo completo de monetización
- [`docs/FRONTEND_IMPLEMENTATION.md`](docs/FRONTEND_IMPLEMENTATION.md) - Implementación del frontend

### **Setup:**
- [`docs/SETUP_SUPABASE.md`](docs/SETUP_SUPABASE.md) - Configuración de Supabase
- [`docs/SETUP_STRIPE.md`](docs/SETUP_STRIPE.md) - Configuración de Stripe
- [`docs/SETUP_CLOUDFLARE.md`](docs/SETUP_CLOUDFLARE.md) - Configuración de Cloudflare

### **Despliegue:**
- [`docs/DEPLOY_FUNCTIONS.md`](docs/DEPLOY_FUNCTIONS.md) - Desplegar Edge Functions

---

## 🧪 Testing

```bash
# Ejecutar tests (cuando estén implementados)
npm test

# Validar TypeScript
npm run type-check

# Lint
npm run lint
```

---

## 📊 Estado del Proyecto

### **Completado:**
- ✅ Arquitectura multi-tenant con RLS
- ✅ Sistema de autenticación
- ✅ Gestión de planes y suscripciones
- ✅ Integración completa con Stripe
- ✅ Edge Functions serverless
- ✅ Frontend React con TypeScript
- ✅ Documentación completa

### **En Desarrollo:**
- 🚧 Integración con Cloudflare API
- 🚧 Integración con Shodan API
- 🚧 Generación de reportes con IA
- 🚧 Tests automatizados

### **Roadmap:**
- 📋 Dashboard de analytics avanzado
- 📋 API pública para integraciones
- 📋 Mobile app (React Native)
- 📋 White-label para Enterprise

---

## 🤝 Contribución

Este es un proyecto de tesis, pero las contribuciones son bienvenidas:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver [`LICENSE`](LICENSE) para más detalles.

---

## 👨‍💻 Autor

**Diosmany** - Proyecto de Tesis
- GitHub: [@EncriptorX](https://github.com/EncriptorX)

---

## 🙏 Agradecimientos

- [Supabase](https://supabase.com/) - Backend as a Service
- [Stripe](https://stripe.com/) - Payment processing
- [Cloudflare](https://cloudflare.com/) - Security services
- [React](https://reactjs.org/) - UI framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling

---

## 📈 Métricas del Proyecto

- **Líneas de código**: ~15,000+
- **Archivos**: 100+
- **Documentación**: 20+ archivos MD
- **Edge Functions**: 8
- **Tablas DB**: 12
- **RLS Policies**: 20+

---

**⭐ Si este proyecto te resulta útil, considera darle una estrella en GitHub!**

---

## 🔗 Enlaces Útiles

- [Documentación Completa](docs/)
- [Arquitectura del Sistema](ARCHITECTURE.md)
- [Integración Stripe](docs/STRIPE_INTEGRATION_ARCHITECTURE.md)

---

**Desarrollado con ❤️ para la comunidad de ciberseguridad**
=======
# Arquitectura-escalable-para-servicios-automatizados
Arquitectura escalable para servicios automatizados de ciberseguridad en entornos web basados en la nube
>>>>>>> 0f7f4f1bbc79941b92b20d721e3ffe755b1d3adb
