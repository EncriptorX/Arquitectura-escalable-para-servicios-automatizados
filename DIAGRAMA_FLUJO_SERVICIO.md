# Diagrama de Flujo del Servicio de Protección Perimetral

## 🔄 Flujo Completo de Ejecución

```
┌─────────────────────────────────────────────────────────────────┐
│                    USUARIO ENVÍA FORMULARIO                      │
│  URLs: ["https://app.midominio.com"]                            │
│  Turnstile Token: "abc123..."                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              PASO 1: VALIDACIÓN DE SEGURIDAD                     │
│  ✓ Verificar token de Turnstile con Cloudflare                 │
│  ✓ Validar que no es un bot                                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              PASO 2: VALIDACIÓN DE URLs                          │
│  ✓ Verificar formato de URLs                                   │
│  ✓ Extraer dominios: "app.midominio.com"                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         PASO 3: OBTENER INFORMACIÓN DE LA ZONA                   │
│  API: GET /zones/{zone_id}                                      │
│  ✓ Obtener nombre de zona: "midominio.com"                     │
│  ✓ Obtener nameservers: ["aron.ns.cloudflare.com", ...]        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         PASO 4: RESOLVER IP REAL DEL DOMINIO                     │
│  DNS Lookup: app.midominio.com                                  │
│  ✓ Resultado: 192.0.2.1 (IP del servidor del usuario)          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         PASO 5: VALIDAR DOMINIO EN ZONA                          │
│  ¿"app.midominio.com" pertenece a "midominio.com"?             │
│  ✓ SÍ → Continuar                                               │
│  ✗ NO → Error: "Dominio no válido para esta zona"              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│    PASO 6: CREAR/ACTUALIZAR REGISTRO DNS CON PROXY              │
│  API: POST/PUT /zones/{zone_id}/dns_records                     │
│  {                                                               │
│    "name": "app.midominio.com",                                 │
│    "content": "192.0.2.1",  ← IP REAL                           │
│    "proxied": true          ← ACTIVA PROTECCIÓN                 │
│  }                                                               │
│  ✓ Tráfico ahora pasa por Cloudflare                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         PASO 7: CONFIGURAR SSL/TLS STRICT                        │
│  API: PATCH /zones/{zone_id}/settings/ssl                       │
│  { "value": "strict" }                                          │
│  ✓ Cifrado end-to-end activado                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         PASO 8: FORZAR REDIRECCIÓN HTTPS                         │
│  API: PATCH /zones/{zone_id}/settings/always_use_https          │
│  { "value": "on" }                                              │
│  ✓ HTTP → HTTPS automático                                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         PASO 9: ACTIVAR WAF                                      │
│  API: PATCH /zones/{zone_id}/settings/waf                       │
│  { "value": "on" }                                              │
│  ✓ Protección contra ataques OWASP                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         PASO 10: CONFIGURAR PROTECCIÓN DDoS                      │
│  API: PATCH /zones/{zone_id}/settings/security_level            │
│  { "value": "high" }                                            │
│  ✓ Protección DDoS en nivel alto                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         PASO 11: CREAR REGLA DE FIREWALL                         │
│  API: POST /zones/{zone_id}/firewall/rules                      │
│  [{ "action": "block", "expression": "..." }]                   │
│  ✓ Bloqueo de tráfico malicioso                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              PASO 12: RETORNAR RESULTADO                         │
│  {                                                               │
│    "status": "ok",                                              │
│    "sitios": [{                                                 │
│      "dominio": "app.midominio.com",                            │
│      "estado": "Protección perimetral configurada",             │
│      "origin_ip": "192.0.2.1",                                  │
│      "nameservers": ["aron.ns.cloudflare.com", ...]             │
│    }],                                                          │
│    "logs": [...],                                               │
│    "simulation_mode": false                                     │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Detalle de Validaciones

### Validación 1: Dominio pertenece a la zona

```python
def validate_domain_in_zone(domain, zone_name):
    # Caso 1: Dominio exacto
    if domain == zone_name:
        return True  # "midominio.com" == "midominio.com" ✓
    
    # Caso 2: Subdominio
    if domain.endswith(f".{zone_name}"):
        return True  # "app.midominio.com".endswith(".midominio.com") ✓
    
    # Caso 3: Dominio diferente
    return False  # "otrodominio.com" ✗
```

**Ejemplos:**

| Zona | Dominio Ingresado | ¿Válido? | Razón |
|------|-------------------|----------|-------|
| `midominio.com` | `midominio.com` | ✅ | Dominio exacto |
| `midominio.com` | `app.midominio.com` | ✅ | Subdominio válido |
| `midominio.com` | `api.midominio.com` | ✅ | Subdominio válido |
| `midominio.com` | `sub.app.midominio.com` | ✅ | Subdominio multinivel |
| `midominio.com` | `otrodominio.com` | ❌ | Dominio diferente |
| `midominio.com` | `midominio.net` | ❌ | TLD diferente |

---

## 🎯 Flujo de Datos: Ejemplo Real

### Entrada del Usuario

```json
{
  "urls": ["https://app.midominio.com"],
  "turnstileToken": "0.abc123..."
}
```

### Variables de Entorno (Vercel)

```bash
CF_API_TOKEN=cftoken_abc123...
CF_ZONE_ID=zone_xyz789...
TURNSTILE_SECRET_KEY=turnstile_key...
```

### Procesamiento Interno

```
1. Extraer dominio: "app.midominio.com"
2. DNS Lookup: "app.midominio.com" → "192.0.2.1"
3. Obtener zona: "midominio.com"
4. Validar: "app.midominio.com" ∈ "midominio.com" ✓
5. Crear DNS: A app.midominio.com → 192.0.2.1 (proxied)
6. Configurar: SSL=strict, HTTPS=on, WAF=on, Security=high
7. Crear firewall rule
```

### Salida al Usuario

```json
{
  "status": "ok",
  "message": "Protección perimetral configurada exitosamente",
  "sitios": [
    {
      "dominio": "app.midominio.com",
      "estado": "Protección perimetral configurada",
      "origin_ip": "192.0.2.1",
      "nameservers": [
        "aron.ns.cloudflare.com",
        "june.ns.cloudflare.com"
      ]
    }
  ],
  "logs": [
    "Initializing protection setup...",
    "Processing 1 domain(s)...",
    "✓ Security verification successful",
    "✓ Zona configurada: midominio.com",
    "[1/1] Processing domain: app.midominio.com",
    "Resolving IP address for app.midominio.com...",
    "✓ Resolved app.midominio.com -> 192.0.2.1",
    "=== INICIANDO PROVISIÓN DE SEGURIDAD PERIMETRAL ===",
    "✓ Dominio 'app.midominio.com' validado para la zona 'midominio.com'",
    "Configurando DNS para app.midominio.com -> 192.0.2.1 (A)...",
    "✓ Registro DNS creado exitosamente con Proxy activado",
    "Configurando modo SSL a Full (Strict)...",
    "✓ Modo SSL configurado a Full (Strict)",
    "Activando 'Always Use HTTPS'...",
    "✓ Redirección HTTPS forzada activada",
    "Optimizando configuraciones de Seguridad y DDoS...",
    "✓ WAF y protecciones DDoS base configuradas",
    "Implementando Regla de Firewall Personalizada...",
    "✓ Regla de Firewall creada correctamente",
    "=== PROVISIÓN COMPLETADA EXITOSAMENTE ===",
    "✓ Protection setup completed for 1 domain(s)",
    "Next steps: Update nameservers at your domain registrar"
  ],
  "simulation_mode": false
}
```

---

## 🚨 Casos de Error

### Error 1: Dominio no pertenece a la zona

**Entrada:**
```json
{
  "urls": ["https://otrodominio.com"]
}
```

**Configuración:**
```bash
CF_ZONE_ID=zone_de_midominio.com
```

**Salida:**
```json
{
  "status": "ok",
  "sitios": [
    {
      "dominio": "otrodominio.com",
      "estado": "Error: Dominio no válido para esta zona. Use 'midominio.com' o subdominios.",
      "origin_ip": "192.0.2.5"
    }
  ],
  "logs": [
    "...",
    "ERROR: El dominio 'otrodominio.com' no pertenece a la zona 'midominio.com'",
    "Solo puede proteger dominios que sean 'midominio.com' o subdominios como 'app.midominio.com'"
  ]
}
```

### Error 2: No se puede resolver el dominio

**Entrada:**
```json
{
  "urls": ["https://noexiste.midominio.com"]
}
```

**Salida:**
```json
{
  "status": "ok",
  "sitios": [
    {
      "dominio": "noexiste.midominio.com",
      "estado": "Error: No se pudo resolver el dominio noexiste.midominio.com: [Errno -2] Name or service not known"
    }
  ],
  "logs": [
    "...",
    "Resolving IP address for noexiste.midominio.com...",
    "ERROR: No se pudo resolver el dominio noexiste.midominio.com: [Errno -2] Name or service not known",
    "Skipping noexiste.midominio.com - Cannot resolve IP address"
  ]
}
```

### Error 3: Credenciales no configuradas

**Configuración:**
```bash
# CF_API_TOKEN no configurado
# CF_ZONE_ID no configurado
```

**Salida:**
```json
{
  "status": "ok",
  "message": "Simulación completada - Configure credenciales de Cloudflare",
  "simulation_mode": true,
  "logs": [
    "WARNING: Cloudflare credentials not configured - running in simulation mode",
    "To enable real protection, configure CF_API_TOKEN and CF_ZONE_ID in Vercel"
  ]
}
```

---

## ✅ Resumen de Verificación

### El servicio SÍ implementa protección REAL porque:

1. ✅ **Obtiene la IP real** del servidor del usuario mediante DNS lookup
2. ✅ **Valida que el dominio pertenece** a la zona configurada
3. ✅ **Crea registros DNS reales** en Cloudflare con la IP correcta
4. ✅ **Activa el proxy** (`proxied: true`) para enrutar tráfico
5. ✅ **Configura 6 protecciones** de seguridad mediante API calls reales
6. ✅ **Maneja errores** cuando el dominio no es válido
7. ✅ **Retorna logs detallados** de cada operación

### Limitaciones conocidas:

1. ⚠️ **Un Zone ID = Un dominio** (y sus subdominios)
2. ⚠️ **Dominio debe existir en Cloudflare** previamente
3. ⚠️ **Usuario debe delegar nameservers** manualmente
4. ⚠️ **Algunas funciones requieren** planes superiores de Cloudflare

**El servicio es 100% funcional dentro de su diseño.**
