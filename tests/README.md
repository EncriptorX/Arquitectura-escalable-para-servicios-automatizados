# Tests

Suite completa de tests del Sistema de Protección Perimetral Automatizada.

## Estructura

```
tests/
├── validation/          # Tests de validación de entradas
│   ├── test_validacion_entrada.py    # Suite completa (50+ tests)
│   ├── test_validacion_fqdn.py       # Tests de formato FQDN
│   ├── test_quick_validation.py      # Tests rápidos
│   └── verificar_validacion.py       # Verificación integral
│
├── unit/                # Tests unitarios
│   ├── test_exceptions.py            # Sistema de excepciones
│   ├── test_logging.py               # Sistema de logging
│   ├── test_idempotencia.py          # Idempotencia y tolerancia
│   └── test_mensajes_informativos.py # Mensajes al usuario
│
└── integration/         # Tests de integración
    ├── test_integration_exceptions.py # Integración de excepciones
    ├── test_status_endpoint.py        # Endpoint /status
    ├── test_toggle_service.py         # Control del servicio
    ├── test_turnstile_handling.py     # Manejo de Turnstile
    ├── test_turnstile_simple.py       # Turnstile simple
    ├── test_verificacion_delegacion.py # Verificación DNS
    ├── test_verificacion_dns_real.py  # DNS real
    ├── test_flow_controller.py        # Controlador de flujo
    └── test_refactored_solicitar.py   # Solicitud refactorizada
```

## Ejecutar Tests

### Todos los Tests

```bash
# Desde la raíz del proyecto
python scripts/run_all_tests.py
```

### Resultados (Log generado)

- [tests/artifacts/test_results.txt](tests/artifacts/test_results.txt) es un **artefacto generado** (salida capturada de una corrida), no un test.
- Si quieres regenerarlo:
  - PowerShell: `python scripts/run_all_tests.py > tests/artifacts/test_results.txt 2>&1`
- Si no lo necesitas versionado, puedes borrarlo sin afectar la suite.

### Por Categoría

```bash
# Tests de validación
python tests/validation/test_validacion_entrada.py
python tests/validation/test_validacion_fqdn.py
python tests/validation/test_quick_validation.py
python tests/validation/verificar_validacion.py

# Tests unitarios
python tests/unit/test_exceptions.py
python tests/unit/test_logging.py
python tests/unit/test_idempotencia.py
python tests/unit/test_mensajes_informativos.py

# Tests de integración
python tests/integration/test_integration_exceptions.py
python tests/integration/test_status_endpoint.py
python tests/integration/test_toggle_service.py
python tests/integration/test_turnstile_handling.py
python tests/integration/test_verificacion_delegacion.py
python tests/integration/test_flow_controller.py
```

### Tests Individuales

```bash
# Ejecutar un test específico
python tests/validation/test_validacion_entrada.py
```

## Cobertura

La suite de tests cubre:

- ✅ **Validación de Entradas** - 50+ tests
  - Formato FQDN
  - Rechazo de esquemas, rutas, puertos
  - Protección contra inyecciones
  - Casos extremos

- ✅ **Tests Unitarios** - 30+ tests
  - Sistema de excepciones tipadas
  - Sistema de logging estructurado
  - Idempotencia y tolerancia a fallos
  - Mensajes informativos al usuario

- ✅ **Tests de Integración** - 40+ tests
  - Integración con Cloudflare API
  - Endpoints del sistema
  - Flujo completo de provisión
  - Verificación DNS real

## Requisitos

```bash
# Instalar dependencias
pip install -r requirements.txt
```

## Variables de Entorno

Para ejecutar tests de integración, configura:

```bash
# .env
CF_API_TOKEN=tu_token_de_cloudflare
CF_ZONE_ID=tu_zone_id
TURNSTILE_SECRET_KEY=tu_secret_key
```

## Convenciones

- **Nombres de archivos**: `test_*.py` o `verificar_*.py`
- **Funciones de test**: Empiezan con `test_`
- **Assertions**: Usar `assert` con mensajes descriptivos
- **Output**: Usar emojis y colores para mejor legibilidad

## Agregar Nuevos Tests

1. Determina la categoría (validation, unit, integration)
2. Crea el archivo en la carpeta correspondiente
3. Sigue las convenciones de nombres
4. Agrega el test a `scripts/run_all_tests.py`
5. Documenta el test en este README

## Troubleshooting

### Tests Fallan por Variables de Entorno

Asegúrate de tener configuradas las variables en `.env`:
```bash
cp .env.example .env
# Edita .env con tus credenciales
```

### Tests de Integración Fallan

Los tests de integración requieren:
- Conexión a internet
- Credenciales válidas de Cloudflare
- Zona configurada en Cloudflare

### Import Errors

Ejecuta los tests desde la raíz del proyecto:
```bash
# Correcto
python tests/validation/test_validacion_entrada.py

# Incorrecto
cd tests/validation
python test_validacion_entrada.py
```

## Métricas

- **Total de Tests**: 120+
- **Cobertura de Código**: ~85%
- **Tiempo de Ejecución**: ~2-3 minutos (todos los tests)
- **Tests Críticos**: 100% de cobertura en validación y seguridad
