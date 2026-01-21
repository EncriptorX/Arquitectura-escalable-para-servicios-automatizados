# Implementación Multi-Tenant Real

## 🎯 Objetivo

Permitir que cada usuario proteja su propio dominio usando sus propias credenciales de Cloudflare.

---

## 📋 Cambios Necesarios

### 1. Modificar el Formulario

Agregar campos para credenciales del usuario:

```typescript
// src/components/ServiceRequestForm.tsx

const [formData, setFormData] = useState({
  company_name: '',
  contact_name: '',
  email: '',
  phone: '',
  comments: '',
  // NUEVOS CAMPOS
  cf_api_token: '',
  cf_zone_id: '',
});

// En el JSX, agregar:
<div>
  <label className="block text-sm font-medium text-gray-300 mb-2">
    Cloudflare API Token *
    <a href="https://dash.cloudflare.com/profile/api-tokens" 
       target="_blank" 
       className="text-cyan-400 ml-2">
      ¿Cómo obtenerlo?
    </a>
  </label>
  <input
    type="password"
    value={formData.cf_api_token}
    onChange={(e) => setFormData({ ...formData, cf_api_token: e.target.value })}
    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
    placeholder="Tu Cloudflare API Token"
  />
</div>

<div>
  <label className="block text-sm font-medium text-gray-300 mb-2">
    Cloudflare Zone ID *
    <a href="https://dash.cloudflare.com" 
       target="_blank" 
       className="text-cyan-400 ml-2">
      ¿Cómo obtenerlo?
    </a>
  </label>
  <input
    type="text"
    value={formData.cf_zone_id}
    onChange={(e) => setFormData({ ...formData, cf_zone_id: e.target.value })}
    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
    placeholder="Tu Cloudflare Zone ID"
  />
</div>
```

### 2. Modificar el Envío del Formulario

```typescript
// En handleSubmit, incluir las credenciales:

const response = await fetch('/api/solicitar-proteccion', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    company: formData.company_name,
    email: formData.email,
    urls: validUrls,
    turnstileToken,
    // NUEVOS CAMPOS
    cf_api_token: formData.cf_api_token,
    cf_zone_id: formData.cf_zone_id,
  })
});
```

### 3. Modificar el API Backend

```python
# api/solicitar-proteccion.py

def do_POST(self):
    try:
        # ... código existente ...
        
        # Obtener credenciales del usuario
        user_cf_token = data.get("cf_api_token", "")
        user_cf_zone_id = data.get("cf_zone_id", "")
        
        # Validar que el usuario proporcionó credenciales
        if not user_cf_token or not user_cf_zone_id:
            self._send_json({
                "status": "error",
                "message": "Debe proporcionar sus credenciales de Cloudflare (API Token y Zone ID)"
            }, 400)
            return
        
        # Validar formato básico
        if len(user_cf_token) < 20:
            self._send_json({
                "status": "error",
                "message": "API Token inválido (muy corto)"
            }, 400)
            return
        
        if len(user_cf_zone_id) != 32:
            self._send_json({
                "status": "error",
                "message": "Zone ID inválido (debe tener 32 caracteres)"
            }, 400)
            return
        
        # ... resto del código de validación ...
        
        # USAR LAS CREDENCIALES DEL USUARIO en lugar de las del servidor
        logs.append("Using user-provided Cloudflare credentials...")
        logs.append(f"Zone ID: {user_cf_zone_id[:8]}...")
        
        # Obtener información de la zona con las credenciales del usuario
        temp_protector = CloudflareEdgeProtector(user_cf_token, user_cf_zone_id)
        zone_info = temp_protector.fetch_zone_info()
        
        if not zone_info:
            self._send_json({
                "status": "error",
                "message": "No se pudo acceder a la zona de Cloudflare. Verifica tus credenciales.",
                "logs": logs + temp_protector.logs
            }, 500)
            return
        
        # ... resto del código usando user_cf_token y user_cf_zone_id ...
        
        for idx, url in enumerate(urls, 1):
            # ...
            protector = CloudflareEdgeProtector(user_cf_token, user_cf_zone_id)
            result = protector.run_provisioning(dominio, origin_ip, zone_name)
            # ...
```

### 4. Agregar Instrucciones en la UI

```typescript
// Componente de ayuda para el usuario

<div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-6">
  <h3 className="text-blue-200 font-bold mb-2">
    📘 ¿Cómo obtener tus credenciales de Cloudflare?
  </h3>
  <ol className="text-blue-300 text-sm space-y-2 ml-4">
    <li>
      <strong>1. API Token:</strong>
      <ul className="ml-4 mt-1">
        <li>• Ve a <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" className="underline">Cloudflare API Tokens</a></li>
        <li>• Click en "Create Token"</li>
        <li>• Usa la plantilla "Edit zone DNS"</li>
        <li>• Copia el token generado</li>
      </ul>
    </li>
    <li>
      <strong>2. Zone ID:</strong>
      <ul className="ml-4 mt-1">
        <li>• Ve a <a href="https://dash.cloudflare.com" target="_blank" className="underline">Cloudflare Dashboard</a></li>
        <li>• Selecciona tu dominio</li>
        <li>• En la barra lateral derecha, busca "Zone ID"</li>
        <li>• Copia el Zone ID</li>
      </ul>
    </li>
  </ol>
  <p className="text-blue-300 text-xs mt-3">
    ⚠️ Tus credenciales se usan solo para esta solicitud y no se almacenan.
  </p>
</div>
```

---

## 🔒 Consideraciones de Seguridad

### 1. No Almacenar Credenciales

```python
# NUNCA hagas esto:
# db.save(user_cf_token)  ❌

# Las credenciales solo deben usarse durante la petición
# y descartarse inmediatamente después
```

### 2. Validar Credenciales

```python
# Validar que las credenciales funcionan antes de usarlas
def validar_credenciales(token, zone_id):
    try:
        protector = CloudflareEdgeProtector(token, zone_id)
        zone_info = protector.fetch_zone_info()
        return zone_info is not None
    except:
        return False
```

### 3. Rate Limiting

```python
# Limitar peticiones por IP para evitar abuso
# Usar Redis o similar para tracking
```

### 4. HTTPS Obligatorio

```python
# Asegurar que las credenciales solo se transmitan por HTTPS
if not request.is_secure():
    return error("HTTPS requerido")
```

---

## 📊 Flujo Completo

```
1. Usuario tiene dominio en Cloudflare
   ↓
2. Usuario obtiene API Token y Zone ID
   ↓
3. Usuario ingresa:
   - Su dominio
   - Su API Token
   - Su Zone ID
   ↓
4. Tu script valida las credenciales
   ↓
5. Tu script usa las credenciales del usuario
   ↓
6. Cloudflare API aplica protección al dominio del usuario
   ↓
7. Usuario ve los resultados
   ↓
8. Credenciales se descartan (no se almacenan)
```

---

## ✅ Ventajas de Este Enfoque

1. ✅ **Seguro:** No almacenas credenciales de usuarios
2. ✅ **Escalable:** Funciona con infinitos usuarios
3. ✅ **Sin costos:** No necesitas plan premium de Cloudflare
4. ✅ **Privacidad:** Cada usuario controla su propia zona
5. ✅ **Flexible:** Usuario puede revocar acceso cuando quiera

---

## ❌ Desventajas

1. ❌ **Complejidad:** Usuario debe obtener credenciales
2. ❌ **Fricción:** Más pasos para el usuario
3. ❌ **Soporte:** Debes ayudar a usuarios a obtener credenciales
4. ❌ **Confianza:** Usuario debe confiar en tu servicio con sus credenciales

---

## 🎯 Alternativa Simplificada para Tesis

Si solo necesitas demostrar el concepto:

### Usa Subdominios de Tu Dominio

```
Tu dominio: miservicio.com
           ↓
Subdominios para "clientes":
- cliente1.miservicio.com
- cliente2.miservicio.com
- cliente3.miservicio.com
```

**Ventajas:**
- ✅ Una sola zona de Cloudflare
- ✅ Gratis
- ✅ Suficiente para demostración
- ✅ Muestra que el concepto funciona

**En tu tesis documenta:**
```
"Para la demostración se utilizan subdominios de un dominio principal.
En producción, el sistema puede adaptarse para usar credenciales del
usuario (modelo SaaS) o gestionar múltiples zonas (modelo reseller)."
```

---

## 📝 Conclusión

**No puedes proteger dominios de otros usuarios con tu zona de Cloudflare.**

Tus opciones son:
1. **Multi-tenant:** Usuario proporciona sus credenciales
2. **Reseller:** Tú agregas dominios a tu cuenta (requiere plan premium)
3. **Demo:** Usa subdominios de tu dominio para demostración

Para una tesis, la **Opción 3** es la más práctica y suficiente.
