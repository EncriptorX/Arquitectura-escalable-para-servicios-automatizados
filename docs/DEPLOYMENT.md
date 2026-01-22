# Guía de Deployment en Vercel

## Configuración Requerida

### Variables de Entorno en Vercel

Debes configurar las siguientes variables de entorno en tu proyecto de Vercel:

1. **CF_API_TOKEN**: Token de API de Cloudflare
2. **CF_ACCOUNT_ID**: ID de cuenta de Cloudflare
3. **TURNSTILE_SECRET_KEY**: Clave secreta de Cloudflare Turnstile
4. **VITE_TURNSTILE_SITE_KEY**: Clave pública de Turnstile (para el frontend)

### Cómo agregar variables de entorno en Vercel:

1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Agrega cada variable con su valor correspondiente
4. Asegúrate de seleccionar los entornos apropiados (Production, Preview, Development)

## Estructura del Proyecto

```
.
├── api/
│   └── solicitar-proteccion.py  # Serverless Function (Python)
├── src/                          # Frontend React
├── dist/                         # Build output
├── requirements.txt              # Dependencias Python
├── package.json                  # Dependencias Node.js
└── vercel.json                   # Configuración de Vercel
```

## Deployment

### Automático (Recomendado)

Cada push a la rama `main` desplegará automáticamente en Vercel.

### Manual

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## Desarrollo Local

### Frontend

```bash
npm install
npm run dev
```

El frontend estará disponible en `http://localhost:5173`

### Backend (Flask - Opcional para desarrollo)

```bash
pip install -r requirements.txt
python app.py
```

El backend estará disponible en `http://localhost:5000`

**Nota**: En desarrollo local, el frontend usa un proxy para redirigir `/api/*` al backend Flask.

## Troubleshooting

### Error: "entorno gestionado externamente"

Este error ocurre cuando Vercel intenta instalar dependencias Python con pip en un entorno gestionado por `uv`. 

**Solución**: Asegúrate de que `requirements.txt` solo contenga las dependencias necesarias para las Serverless Functions (no Flask).

### Error: "Module not found"

Verifica que todas las dependencias estén en `package.json` y `requirements.txt`.

```bash
# Reinstalar dependencias
npm install
```

### Error de CORS

Las Serverless Functions en `api/` ya incluyen headers CORS. Si tienes problemas:

1. Verifica que la función maneje `OPTIONS` requests
2. Asegúrate de que los headers `Access-Control-Allow-Origin` estén configurados

## Arquitectura

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Vercel Serverless Functions (Python 3.9)
- **Hosting**: Vercel Edge Network
- **API**: `/api/solicitar-proteccion` (POST, GET, OPTIONS)

## Endpoints

### POST /api/solicitar-proteccion

Solicita protección perimetral para dominios.

**Request Body:**
```json
{
  "company": "Nombre de la empresa",
  "email": "email@ejemplo.com",
  "urls": ["https://ejemplo.com"],
  "turnstileToken": "token-de-verificacion"
}
```

**Response (Success):**
```json
{
  "status": "ok",
  "message": "Protección perimetral en proceso",
  "urls": ["https://ejemplo.com"],
  "sitios": [
    {
      "dominio": "ejemplo.com",
      "estado": "Protección perimetral iniciada"
    }
  ]
}
```

**Response (Error):**
```json
{
  "status": "error",
  "message": "Descripción del error"
}
```

### GET /api/solicitar-proteccion

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "API funcionando correctamente"
}
```

## Formato de Serverless Functions

Las funciones en `api/` deben seguir el formato de Vercel:

```python
def handler(event, context):
    # event contiene:
    # - httpMethod: GET, POST, etc.
    # - body: Request body (string o dict)
    # - headers: Request headers
    # - queryStringParameters: Query params
    
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps({"message": "OK"})
    }
```

## Monitoreo

Puedes ver los logs de las Serverless Functions en:
- Vercel Dashboard → Tu Proyecto → Functions → Logs
