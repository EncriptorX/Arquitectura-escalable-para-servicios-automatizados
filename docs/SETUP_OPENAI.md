# 🤖 Configuración de OpenAI - Reportes con IA

## 1. Crear Cuenta en OpenAI

### 1.1 Registro
1. Ve a [platform.openai.com](https://platform.openai.com)
2. Crea una cuenta o inicia sesión
3. Verifica tu número de teléfono
4. Configura método de pago (requerido para API)

### 1.2 Obtener API Key
1. Ve a **API Keys** en el dashboard
2. Click en **Create new secret key**
3. Copia la key (empieza con `sk-...`)
4. ⚠️ **Importante**: Guarda la key de forma segura, no se puede ver de nuevo

## 2. Configurar Límites y Billing

### 2.1 Configurar Usage Limits
En **Settings > Limits**:
- **Monthly budget**: $50 (ajusta según necesidades)
- **Usage notifications**: Habilita alertas al 80% y 100%
- **Hard limit**: Habilita para evitar cargos excesivos

### 2.2 Monitorear Uso
En **Usage** puedes ver:
- Tokens utilizados por día
- Costo por modelo
- Requests por minuto

## 3. Configurar en Supabase

### 3.1 Agregar Variable de Entorno
```bash
supabase secrets set OPENAI_API_KEY=sk-your-openai-api-key
```

### 3.2 Verificar Configuración
```bash
# Test básico de la API
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer sk-your-openai-api-key"
```

## 4. Optimizar Prompts para Reportes

### 4.1 Prompt Templates
Los prompts están optimizados en `ai-reports/index.ts`:

```typescript
// Ejemplo de prompt optimizado
const buildReportPrompt = (reportData: any, reportType: string) => `
Eres un experto en ciberseguridad generando reportes profesionales.

CONTEXTO:
- Dominio: ${reportData.domain.domain}
- Tipo de reporte: ${reportType}
- Fecha: ${new Date().toISOString()}

DATOS DE ESCANEOS:
${reportData.executions.map(exec => `
Servicio: ${exec.service?.name}
Estado: ${exec.status}
Resultados: ${JSON.stringify(exec.results, null, 2)}
`).join('\n')}

INSTRUCCIONES:
1. Analiza los datos de seguridad proporcionados
2. Identifica vulnerabilidades y riesgos críticos
3. Proporciona recomendaciones accionables
4. Usa terminología técnica precisa
5. Prioriza hallazgos por nivel de riesgo

FORMATO DE RESPUESTA (JSON):
{
  "summary": "Resumen ejecutivo (máximo 300 palabras)",
  "findings": [
    {
      "title": "Título del hallazgo",
      "severity": "critical|high|medium|low|info",
      "description": "Descripción técnica detallada",
      "evidence": "Evidencia específica encontrada",
      "impact": "Impacto potencial en la seguridad",
      "cvss_score": 7.5,
      "affected_components": ["componente1", "componente2"]
    }
  ],
  "recommendations": [
    {
      "title": "Título de la recomendación",
      "priority": "high|medium|low",
      "description": "Descripción detallada de la acción",
      "implementation": "Pasos específicos para implementar",
      "timeline": "Tiempo estimado de implementación",
      "cost_impact": "low|medium|high",
      "resources_required": ["recurso1", "recurso2"]
    }
  ],
  "risk_score": 85,
  "compliance_status": {
    "owasp_top_10": "partial",
    "iso_27001": "compliant",
    "gdpr": "review_required"
  }
}

IMPORTANTE: Responde ÚNICAMENTE con JSON válido, sin texto adicional.
`
```

### 4.2 Configurar Parámetros del Modelo

```typescript
// Configuración optimizada para reportes
const openaiConfig = {
  model: 'gpt-4-turbo-preview', // Mejor para análisis técnico
  temperature: 0.3,             // Respuestas más consistentes
  max_tokens: 4000,             // Suficiente para reportes detallados
  top_p: 0.9,                   // Balance creatividad/precisión
  frequency_penalty: 0.1,       // Evita repeticiones
  presence_penalty: 0.1         // Fomenta variedad en recomendaciones
}
```

## 5. Implementar Rate Limiting

### 5.1 Configurar Límites por Organización
```typescript
// En ai-reports/index.ts
const RATE_LIMITS = {
  'free': { reports_per_day: 2, tokens_per_month: 10000 },
  'basic': { reports_per_day: 10, tokens_per_month: 50000 },
  'pro': { reports_per_day: 50, tokens_per_month: 200000 },
  'enterprise': { reports_per_day: 200, tokens_per_month: 1000000 }
}

async function checkAIUsageLimits(context: AuthContext) {
  const plan = context.subscription?.plan?.slug || 'free'
  const limits = RATE_LIMITS[plan]
  
  // Verificar uso diario
  const dailyUsage = await getDailyReportCount(context.organization.id)
  if (dailyUsage >= limits.reports_per_day) {
    throw new Error('Daily AI report limit exceeded')
  }
  
  // Verificar tokens mensuales
  const monthlyTokens = await getMonthlyTokenUsage(context.organization.id)
  if (monthlyTokens >= limits.tokens_per_month) {
    throw new Error('Monthly token limit exceeded')
  }
}
```

## 6. Monitorear Uso y Costos

### 6.1 Tracking de Tokens
```typescript
// Función para trackear uso de tokens
async function trackTokenUsage(organizationId: string, tokensUsed: number, cost: number) {
  await supabase
    .from('usage_records')
    .insert({
      organization_id: organizationId,
      resource_type: 'ai_tokens',
      quantity: tokensUsed,
      metadata: {
        cost_usd: cost,
        model: 'gpt-4-turbo-preview',
        timestamp: new Date().toISOString()
      }
    })
}
```

### 6.2 Dashboard de Uso
```sql
-- Query para dashboard de uso de IA
SELECT 
  DATE_TRUNC('day', recorded_at) as date,
  SUM(quantity) as total_tokens,
  SUM((metadata->>'cost_usd')::decimal) as total_cost,
  COUNT(*) as total_requests
FROM usage_records 
WHERE resource_type = 'ai_tokens'
  AND organization_id = $1
  AND recorded_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', recorded_at)
ORDER BY date DESC;
```

## 7. Optimizar Costos

### 7.1 Estrategias de Optimización
- **Caching**: Cachear reportes similares por 24 horas
- **Batch Processing**: Procesar múltiples dominios en una sola llamada
- **Model Selection**: Usar GPT-3.5 para reportes básicos, GPT-4 para análisis complejos
- **Prompt Optimization**: Prompts más específicos = menos tokens

### 7.2 Implementar Caching
```typescript
// Cache de reportes por hash de datos
async function getCachedReport(dataHash: string) {
  const { data } = await supabase
    .from('report_cache')
    .select('*')
    .eq('data_hash', dataHash)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .single()
    
  return data
}

async function cacheReport(dataHash: string, reportContent: any) {
  await supabase
    .from('report_cache')
    .upsert({
      data_hash: dataHash,
      content: reportContent,
      created_at: new Date().toISOString()
    })
}
```

## 8. Configurar Fallbacks

### 8.1 Fallback para Errores de API
```typescript
async function generateAIContentWithFallback(reportData: any, reportType: string) {
  try {
    // Intentar con OpenAI
    return await generateAIContent(reportData, reportType, true)
  } catch (error) {
    console.error('OpenAI API error:', error)
    
    // Fallback a reporte template
    return generateTemplateReport(reportData, reportType)
  }
}

function generateTemplateReport(reportData: any, reportType: string) {
  return {
    summary: `Automated ${reportType} report for ${reportData.domain.domain}. ${reportData.executions.length} security scans analyzed.`,
    findings: reportData.executions.map(exec => ({
      title: `${exec.service?.name} Analysis`,
      severity: exec.status === 'completed' ? 'info' : 'medium',
      description: `Service execution ${exec.status}`,
      evidence: JSON.stringify(exec.results),
      impact: 'Review required for detailed analysis'
    })),
    recommendations: [
      {
        title: 'Regular Security Monitoring',
        priority: 'medium',
        description: 'Continue regular security scans to maintain security posture',
        implementation: 'Schedule automated scans according to your security policy'
      }
    ]
  }
}
```

## 9. Testing de IA

### 9.1 Test de Generación de Reportes
```bash
# Test de generación de reporte
curl -X POST https://your-project.supabase.co/functions/v1/ai-reports/generate \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "domainId": "domain-uuid",
    "reportType": "security",
    "format": "pdf",
    "includeRecommendations": true
  }'
```

### 9.2 Test de Calidad de Prompts
```typescript
// Script para testear diferentes prompts
const testPrompts = [
  'basic_security_prompt',
  'detailed_security_prompt',
  'executive_summary_prompt'
]

for (const promptType of testPrompts) {
  const result = await testPromptQuality(promptType, sampleData)
  console.log(`${promptType}: ${result.score}/10`)
}
```

## 10. Compliance y Privacidad

### 10.1 Configurar Data Retention
```typescript
// Configurar retención de datos de IA
const AI_DATA_RETENTION = {
  report_cache: '30 days',
  usage_logs: '1 year',
  generated_content: '2 years'
}

// Job para limpiar datos antiguos
async function cleanupAIData() {
  await supabase
    .from('report_cache')
    .delete()
    .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
}
```

### 10.2 Configurar Privacy Settings
- No enviar datos sensibles a OpenAI
- Anonimizar información personal en prompts
- Configurar data processing agreements

## ✅ Checklist de OpenAI

- [ ] Cuenta OpenAI creada y verificada
- [ ] API Key obtenida y configurada
- [ ] Límites de uso configurados
- [ ] Variables de entorno en Supabase
- [ ] Prompts optimizados implementados
- [ ] Rate limiting configurado
- [ ] Monitoreo de uso activo
- [ ] Estrategias de optimización de costos
- [ ] Fallbacks implementados
- [ ] Tests de generación exitosos
- [ ] Compliance y privacidad configurados

## 🚨 Troubleshooting

### Error: "Insufficient quota"
- Verifica que tienes créditos en tu cuenta OpenAI
- Revisa los límites de uso configurados
- Considera upgrade de plan si es necesario

### Error: "Rate limit exceeded"
- Implementa exponential backoff
- Reduce frecuencia de requests
- Considera usar batch processing

### Error: "Invalid request format"
- Verifica que el prompt está bien formateado
- Revisa que el JSON de respuesta es válido
- Chequea los parámetros del modelo

## 📚 Recursos

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [GPT-4 Guide](https://platform.openai.com/docs/guides/gpt)
- [Prompt Engineering](https://platform.openai.com/docs/guides/prompt-engineering)
- [Rate Limits](https://platform.openai.com/docs/guides/rate-limits)