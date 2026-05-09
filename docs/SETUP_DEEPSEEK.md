# 🤖 Configuración de DeepSeek — Reportes con IA

## 1. Obtener API Key

1. Ve a → https://platform.deepseek.com/api_keys
2. Crea una cuenta o inicia sesión
3. Clic en **"Create new API key"**
4. Copia la key (empieza con `sk-...`)
5. ⚠️ Guárdala de forma segura — no se puede ver de nuevo

## 2. Configurar en Supabase (Edge Functions)

La Edge Function `ai-reports` lee la key desde las variables de entorno de Supabase:

```bash
supabase secrets set DEEPSEEK_API_KEY=sk-tu-api-key-aqui
```

Verificar que quedó configurada:
```bash
supabase secrets list
```

## 3. Configurar en Vercel (si usas el backend en Vercel)

Ve a → Vercel → tu proyecto → **Settings → Environment Variables**

| Variable | Valor |
|---|---|
| `DEEPSEEK_API_KEY` | `sk-tu-api-key-aqui` |

## 4. Modelo utilizado

El proyecto usa **`deepseek-chat`** con las siguientes configuraciones:

```json
{
  "model": "deepseek-chat",
  "temperature": 0.3,
  "max_tokens": 3000,
  "response_format": { "type": "json_object" }
}
```

- `temperature: 0.3` — respuestas consistentes y técnicas
- `response_format: json_object` — garantiza JSON válido en la respuesta
- `max_tokens: 3000` — suficiente para reportes detallados

## 5. Tipos de reportes soportados

| Tipo | Descripción |
|---|---|
| `security` | Análisis de seguridad perimetral |
| `vulnerability` | Escaneo de vulnerabilidades |
| `performance` | Pruebas de rendimiento |
| `compliance` | Cumplimiento normativo |
| `comprehensive` | Reporte completo de todos los servicios |

## 6. Costos estimados

DeepSeek es significativamente más económico que OpenAI:

| Modelo | Input | Output |
|---|---|---|
| deepseek-chat | $0.014 / 1M tokens | $0.28 / 1M tokens |

Un reporte típico usa ~1,500 tokens → costo aproximado **$0.0004 por reporte**.

## 7. Verificar funcionamiento

```bash
curl -X POST https://api.deepseek.com/chat/completions \
  -H "Authorization: Bearer sk-tu-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "Hola"}],
    "max_tokens": 10
  }'
```

## ✅ Checklist

- [ ] API Key obtenida en platform.deepseek.com
- [ ] `DEEPSEEK_API_KEY` configurada en Supabase secrets
- [ ] `DEEPSEEK_API_KEY` configurada en Vercel environment variables
- [ ] Test de generación de reporte exitoso
