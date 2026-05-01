# 🗄️ Configuración de Supabase - Guía Paso a Paso

## 1. Crear Proyecto en Supabase

### 1.1 Registro y Creación
1. Ve a [supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Click en "New Project"
4. Completa los datos:
   - **Name**: `cas-platform`
   - **Database Password**: Genera una contraseña segura (guárdala)
   - **Region**: Selecciona la más cercana a tus usuarios
   - **Pricing Plan**: Free (para desarrollo)

### 1.2 Obtener Credenciales
Una vez creado el proyecto, ve a **Settings > API** y copia:
- **Project URL**: `https://your-project.supabase.co`
- **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (⚠️ Mantén esto secreto)

## 2. Configurar Variables de Entorno

### 2.1 Frontend (.env)
```bash
# Crear archivo .env en la raíz del proyecto
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_TURNSTILE_SITE_KEY=your_turnstile_site_key
```

### 2.2 Backend (Supabase Edge Functions)
En Supabase Dashboard > Edge Functions > Settings:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
TURNSTILE_SECRET_KEY=your_turnstile_secret_key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
OPENAI_API_KEY=sk-...
CF_API_TOKEN=your_cloudflare_token
CF_ZONE_ID=your_cloudflare_zone_id
```

## 3. Ejecutar Migraciones SQL

### 3.1 Usando Supabase CLI (Recomendado)

#### Instalar Supabase CLI
```bash
# Windows (usando Chocolatey)
choco install supabase

# macOS (usando Homebrew)
brew install supabase/tap/supabase

# Linux/WSL
curl -fsSL https://supabase.com/install.sh | sh
```

#### Inicializar proyecto
```bash
cd Cuban-CAS
supabase init
supabase login
supabase link --project-ref your-project-ref
```

#### Ejecutar migraciones
```bash
supabase db push
```

### 3.2 Usando SQL Editor (Alternativa)

1. Ve a **SQL Editor** en Supabase Dashboard
2. Copia y pega el contenido de `supabase/migrations/20260130_complete_cas_schema.sql`
3. Click en "Run" para ejecutar la migración
4. Verifica que todas las tablas se crearon correctamente en **Table Editor**

## 4. Verificar Configuración

### 4.1 Verificar Tablas
En **Table Editor** deberías ver:
- ✅ organizations
- ✅ user_profiles
- ✅ plans
- ✅ subscriptions
- ✅ domains
- ✅ security_services
- ✅ service_executions
- ✅ reports
- ✅ usage_records
- ✅ invoices
- ✅ notifications
- ✅ integrations

### 4.2 Verificar RLS
En **Authentication > Policies** deberías ver las políticas RLS creadas.

### 4.3 Verificar Datos Iniciales
En **Table Editor > plans** deberías ver los 4 planes creados:
- Free ($0/mes)
- Basic ($29/mes)
- Pro ($99/mes)
- Enterprise ($299/mes)

## 5. Configurar Autenticación

### 5.1 Configurar Providers
En **Authentication > Settings**:
- ✅ Enable email confirmations
- ✅ Enable secure email change
- ✅ Configure email templates (opcional)

### 5.2 Configurar Redirect URLs
En **Authentication > URL Configuration**:
```
Site URL: http://localhost:5173 (desarrollo)
Redirect URLs: 
- http://localhost:5173/auth/callback
- https://your-domain.com/auth/callback (producción)
```

## 6. Configurar Storage (Opcional)

### 6.1 Crear Buckets
En **Storage**:
```sql
-- Bucket para reportes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reports', 'reports', false);

-- Bucket para avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true);
```

### 6.2 Configurar Políticas de Storage
```sql
-- Política para reportes (solo organización)
CREATE POLICY "Users can access own organization reports" 
ON storage.objects FOR ALL 
USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Política para avatars (público)
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');
```

## 7. Configurar Edge Functions

### 7.1 Instalar Deno (requerido para Edge Functions)
```bash
# Windows
iwr https://deno.land/install.ps1 -useb | iex

# macOS/Linux
curl -fsSL https://deno.land/install.sh | sh
```

### 7.2 Deploy Functions
```bash
# Deploy todas las funciones
supabase functions deploy auth-middleware
supabase functions deploy organization-management
supabase functions deploy security-services
supabase functions deploy subscription-management
supabase functions deploy ai-reports

# O deploy todas a la vez
supabase functions deploy
```

### 7.3 Configurar Variables de Entorno para Functions
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set CF_API_TOKEN=your_token
supabase secrets set CF_ZONE_ID=your_zone_id
```

## 8. Testing de Configuración

### 8.1 Test de Conexión
```bash
# Test básico de conexión
curl https://your-project.supabase.co/rest/v1/plans \
  -H "apikey: your-anon-key" \
  -H "Authorization: Bearer your-anon-key"
```

### 8.2 Test de Edge Functions
```bash
# Test de función de organización
curl https://your-project.supabase.co/functions/v1/organization-management/profile \
  -H "Authorization: Bearer your-jwt-token"
```

## 9. Monitoreo y Logs

### 9.1 Configurar Logs
En **Logs** puedes monitorear:
- Database logs
- API logs
- Edge Function logs
- Auth logs

### 9.2 Configurar Alertas (Opcional)
En **Settings > Integrations** puedes configurar:
- Slack notifications
- Webhook notifications
- Email alerts

## 10. Backup y Seguridad

### 10.1 Configurar Backups
- Los backups automáticos están habilitados por defecto
- Para backups manuales: **Settings > Database > Backups**

### 10.2 Configurar Seguridad
- Rotar API keys regularmente
- Configurar IP allowlist si es necesario
- Habilitar 2FA en tu cuenta Supabase

## ✅ Checklist de Verificación

- [ ] Proyecto Supabase creado
- [ ] Variables de entorno configuradas
- [ ] Migración SQL ejecutada exitosamente
- [ ] Tablas creadas con datos iniciales
- [ ] RLS policies activas
- [ ] Autenticación configurada
- [ ] Edge Functions deployadas
- [ ] Storage configurado (opcional)
- [ ] Tests básicos pasando
- [ ] Logs y monitoreo activos

## 🚨 Troubleshooting

### Error: "relation does not exist"
- Verifica que la migración se ejecutó correctamente
- Revisa los logs en **Logs > Database**

### Error: "JWT expired"
- Regenera los tokens en **Settings > API**
- Actualiza las variables de entorno

### Error: "Function not found"
- Verifica que las Edge Functions se deployaron
- Revisa los logs en **Logs > Edge Functions**

### Error: "RLS policy violation"
- Verifica que las políticas RLS están activas
- Revisa que el usuario tiene los permisos correctos

## 📚 Recursos Adicionales

- [Supabase Documentation](https://supabase.com/docs)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)