# ☁️ Configuración de Cloudflare - Protección Perimetral

## 1. Configurar Cuenta Cloudflare

### 1.1 Crear Cuenta
1. Ve a [cloudflare.com](https://cloudflare.com)
2. Crea una cuenta gratuita
3. Verifica tu email

### 1.2 Agregar Dominio
1. Click en **Add a Site**
2. Ingresa tu dominio (ej: `tudominio.com`)
3. Selecciona plan **Free** (suficiente para desarrollo)
4. Cloudflare escaneará tus registros DNS existentes

### 1.3 Configurar Nameservers
Cloudflare te dará 2 nameservers:
- `ns1.cloudflare.com`
- `ns2.cloudflare.com`

Ve a tu registrador de dominios y actualiza los nameservers.

## 2. Obtener Credenciales API

### 2.1 Crear API Token
1. Ve a **My Profile > API Tokens**
2. Click en **Create Token**
3. Usa la plantilla **Edit zone DNS** o crea uno personalizado

#### Permisos Requeridos:
```
Zone:Read - All zones
Zone Settings:Edit - Specific zone
DNS:Edit - Specific zone
Firewall Services:Edit - Specific zone (si tienes plan Pro+)
```

### 2.2 Obtener Zone ID
1. Ve a tu dominio en el dashboard
2. En la barra lateral derecha, copia el **Zone ID**

### 2.3 Configurar en Supabase
```bash
supabase secrets set CF_API_TOKEN=your_cloudflare_api_token
supabase secrets set CF_ZONE_ID=your_cloudflare_zone_id
```

## 3. Configurar Protecciones Básicas

### 3.1 SSL/TLS Settings
En **SSL/TLS > Overview**:
- **Encryption mode**: Full (strict)
- **Edge Certificates**: Habilitado
- **Always Use HTTPS**: On

### 3.2 Security Settings
En **Security > Settings**:
- **Security Level**: Medium (se puede cambiar via API)
- **Challenge Passage**: 30 minutes
- **Browser Integrity Check**: On

### 3.3 Firewall Settings
En **Security > WAF**:
- **Web Application Firewall**: On (si tienes plan Pro+)
- **OWASP Core Ruleset**: Habilitado

## 4. Integrar con la Plataforma CAS

### 4.1 Servicios Disponibles por Plan

| Función | Free | Pro | Business | Enterprise |
|---------|------|-----|----------|------------|
| DNS Proxy | ✅ | ✅ | ✅ | ✅ |
| SSL/TLS | ✅ | ✅ | ✅ | ✅ |
| Basic DDoS | ✅ | ✅ | ✅ | ✅ |
| WAF | ❌ | ✅ | ✅ | ✅ |
| Firewall Rules | 5 | 20 | 100 | 1000 |
| Rate Limiting | ❌ | ✅ | ✅ | ✅ |

### 4.2 Actualizar Configuración de Servicios
```sql
-- Actualizar servicios según plan Cloudflare
UPDATE security_services 
SET default_config = jsonb_set(
  default_config, 
  '{available_in_free_plan}', 
  'true'
) 
WHERE slug = 'perimeter_protection';
```

## 5. Implementar Protección Perimetral

### 5.1 Función de Protección Actualizada
```typescript
// En security-services/index.ts
async function executePerimeterProtection(execution: any) {
  const results = {
    protections_applied: [],
    warnings: [],
    errors: []
  }

  try {
    // 1. DNS con Proxy (Disponible en plan Free)
    const dnsResult = await configureDNSProxy(execution.domain)
    if (dnsResult.success) {
      results.protections_applied.push('dns_proxy')
    }

    // 2. SSL/TLS Strict (Disponible en plan Free)
    const sslResult = await configureSSL(execution.domain)
    if (sslResult.success) {
      results.protections_applied.push('ssl_strict')
    }

    // 3. Force HTTPS (Disponible en plan Free)
    const httpsResult = await configureForceHTTPS(execution.domain)
    if (httpsResult.success) {
      results.protections_applied.push('force_https')
    }

    // 4. Security Level (Disponible en plan Free)
    const securityResult = await configureSecurityLevel(execution.domain)
    if (securityResult.success) {
      results.protections_applied.push('security_level_high')
    }

    // 5. WAF (Solo Pro+)
    try {
      const wafResult = await configureWAF(execution.domain)
      if (wafResult.success) {
        results.protections_applied.push('waf')
      }
    } catch (error) {
      if (error.message.includes('plan')) {
        results.warnings.push('WAF requires Pro plan or higher')
      } else {
        results.errors.push(`WAF configuration failed: ${error.message}`)
      }
    }

    // 6. Firewall Rules (Limitado por plan)
    try {
      const firewallResult = await configureFirewallRules(execution.domain)
      if (firewallResult.success) {
        results.protections_applied.push('firewall_rules')
      }
    } catch (error) {
      if (error.message.includes('limit')) {
        results.warnings.push('Firewall rules limit reached for current plan')
      } else {
        results.errors.push(`Firewall configuration failed: ${error.message}`)
      }
    }

    return {
      status: 'success',
      protections_count: results.protections_applied.length,
      details: results
    }

  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      details: results
    }
  }
}
```

### 5.2 Funciones de Configuración Individual
```typescript
async function configureDNSProxy(domain: string) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'A',
      name: domain,
      content: await resolveDomainIP(domain),
      proxied: true,
      ttl: 1
    })
  })

  const result = await response.json()
  return { success: response.ok, data: result }
}

async function configureSSL(domain: string) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/settings/ssl`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      value: 'strict'
    })
  })

  const result = await response.json()
  return { success: response.ok, data: result }
}

async function configureWAF(domain: string) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/settings/waf`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      value: 'on'
    })
  })

  if (!response.ok) {
    const error = await response.json()
    if (error.errors?.[0]?.code === 1003) {
      throw new Error('WAF requires Pro plan or higher')
    }
    throw new Error(`WAF configuration failed: ${error.errors?.[0]?.message}`)
  }

  const result = await response.json()
  return { success: true, data: result }
}
```

## 6. Configurar Monitoreo

### 6.1 Analytics API
```typescript
// Obtener métricas de Cloudflare
async function getCloudflareAnalytics(domain: string, timeframe: string = '24h') {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/analytics/dashboard?since=-${timeframe}`,
    {
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  )

  const data = await response.json()
  return {
    requests: data.result.totals.requests.all,
    bandwidth: data.result.totals.bandwidth.all,
    threats: data.result.totals.threats.all,
    pageviews: data.result.totals.pageviews.all
  }
}
```

### 6.2 Security Events
```typescript
// Obtener eventos de seguridad
async function getSecurityEvents(domain: string) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/security/events`,
    {
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  )

  const data = await response.json()
  return data.result.map(event => ({
    timestamp: event.occurred_at,
    action: event.action,
    source: event.source,
    country: event.country,
    threat_score: event.threat_score
  }))
}
```

## 7. Testing de Configuración

### 7.1 Test de API Connection
```bash
# Test básico de conexión
curl -X GET "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json"
```

### 7.2 Test de Protección
```bash
# Test de configuración SSL
curl -X GET "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/settings/ssl" \
  -H "Authorization: Bearer ${CF_API_TOKEN}"

# Test de WAF (si tienes plan Pro+)
curl -X GET "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/settings/waf" \
  -H "Authorization: Bearer ${CF_API_TOKEN}"
```

### 7.3 Test de DNS
```bash
# Verificar que el dominio está proxied
dig +short tudominio.com
# Debería retornar IPs de Cloudflare (no tu IP original)

# Test de SSL
curl -I https://tudominio.com
# Debería incluir headers de Cloudflare
```

## 8. Configurar Alertas

### 8.1 Notification Webhooks
En **Notifications**:
- **DDoS Attack**: Webhook a tu sistema
- **SSL Certificate**: Email notifications
- **Zone Configuration Changes**: Webhook

### 8.2 Implementar Webhook Handler
```typescript
// En notifications/index.ts
async function handleCloudflareWebhook(req: Request) {
  const webhook = await req.json()
  
  switch (webhook.type) {
    case 'ddos_attack':
      await createSecurityAlert({
        type: 'ddos_attack',
        severity: 'high',
        domain: webhook.data.zone_name,
        details: webhook.data
      })
      break
      
    case 'ssl_certificate':
      await createMaintenanceAlert({
        type: 'ssl_renewal',
        domain: webhook.data.zone_name,
        expires_at: webhook.data.expires_on
      })
      break
  }
}
```

## 9. Optimización de Performance

### 9.1 Configurar Caching
```typescript
// Configurar Page Rules para caching
async function configurePageRules(domain: string) {
  const rules = [
    {
      targets: [{ target: 'url', constraint: { operator: 'matches', value: `${domain}/static/*` }}],
      actions: [
        { id: 'cache_level', value: 'cache_everything' },
        { id: 'edge_cache_ttl', value: 2592000 } // 30 días
      ]
    }
  ]

  for (const rule of rules) {
    await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/pagerules`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(rule)
    })
  }
}
```

### 9.2 Configurar Compression
```typescript
// Habilitar Brotli compression
async function enableCompression() {
  await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/settings/brotli`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ value: 'on' })
  })
}
```

## 10. Troubleshooting

### 10.1 Errores Comunes

#### Error 1003: "Access Denied"
- Verificar que el API token tiene los permisos correctos
- Verificar que el Zone ID es correcto

#### Error 1004: "DNS Record Already Exists"
- Implementar lógica idempotente (buscar antes de crear)
- Usar PATCH en lugar de POST para actualizar

#### Error 1014: "CNAME Cross-User Banned"
- Verificar que el dominio está en la misma cuenta
- Usar registros A en lugar de CNAME

### 10.2 Debug de Configuración
```typescript
// Función para debug de configuración
async function debugCloudflareConfig(domain: string) {
  const checks = {
    dns_proxy: await checkDNSProxy(domain),
    ssl_config: await checkSSLConfig(),
    waf_status: await checkWAFStatus(),
    security_level: await checkSecurityLevel()
  }

  console.log('Cloudflare Configuration Debug:', checks)
  return checks
}
```

## ✅ Checklist de Cloudflare

- [ ] Cuenta Cloudflare creada
- [ ] Dominio agregado y nameservers configurados
- [ ] API Token creado con permisos correctos
- [ ] Zone ID obtenido
- [ ] Variables de entorno configuradas en Supabase
- [ ] Protecciones básicas configuradas
- [ ] Funciones de protección implementadas
- [ ] Tests de API exitosos
- [ ] Monitoreo y alertas configurados
- [ ] Performance optimizada

## 📚 Recursos

- [Cloudflare API Documentation](https://developers.cloudflare.com/api/)
- [DNS Management](https://developers.cloudflare.com/dns/)
- [SSL/TLS Configuration](https://developers.cloudflare.com/ssl/)
- [WAF Configuration](https://developers.cloudflare.com/waf/)
- [Security Settings](https://developers.cloudflare.com/security/)