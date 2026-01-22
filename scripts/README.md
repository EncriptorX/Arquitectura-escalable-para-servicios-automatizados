# Scripts de Utilidad

Scripts auxiliares para verificación y testing del sistema.

## Verificación de Protección

### `verificar_proteccion_aplicada.py`

Script para verificar que todas las protecciones de Cloudflare estén activas.

**Uso:**
```bash
python scripts/verificar_proteccion_aplicada.py
```

**Verifica:**
- ✅ Registros DNS con proxy activo
- ✅ Configuración SSL/TLS
- ✅ Force HTTPS
- ✅ WAF
- ✅ DDoS Protection
- ✅ Firewall Rules

**Requisitos:**
- Variables de entorno configuradas en `.env`
- `CF_API_TOKEN`
- `CF_ZONE_ID`

## Testing de Delegación DNS

### `test_verificacion_delegacion.py`

Script para probar la verificación de delegación DNS.

**Uso:**
```bash
python scripts/test_verificacion_delegacion.py
```

## Ejecutar desde npm

También puedes ejecutar el script de verificación usando npm:

```bash
npm run verify
```
