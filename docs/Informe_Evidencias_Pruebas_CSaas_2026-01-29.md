# Informe de evidencias de pruebas (tesis)

**Proyecto:** Sistema de Protección Perimetral Automatizada con Cloudflare (CSaaS)  
**Fecha:** 29 de enero de 2026  
**Entorno de ejecución:** Windows, Python 3.13 (venv), ejecución local  
**Alcance:** backend serverless (APIs), validación de entradas, proxy CSaaS, control de protecciones y verificación DNS.

## 1. Resumen ejecutivo
Se ejecutó la suite completa de pruebas del proyecto para verificar la implementación del servicio de protección perimetral automatizado. El resultado final fue **14/14 tests pasados**, evidenciando que la plataforma:

- Valida entradas (dominios FQDN) de forma estricta.
- Automatiza la provisión y protección en Cloudflare.
- Aplica políticas de seguridad perimetral.
- Mantiene trazabilidad de eventos y errores.
- Controla el estado del servicio y de las protecciones.

## 2. Evidencia de ejecución
**Comando ejecutado:**

- `python scripts/run_all_tests.py`

**Resultado final:**

- **TOTAL: 14/14 tests pasaron**
- **Estado:** OK

## 3. Metodología de pruebas
La suite está organizada en tres niveles, alineados con prácticas de verificación para sistemas de seguridad:

1. **Validación:** garantiza que los datos de entrada cumplan reglas de seguridad (FQDN, sin esquemas ni rutas), evitando inyección o errores de configuración.
2. **Unitario:** verifica módulos críticos de seguridad, consistencia de mensajes y tolerancia a fallos.
3. **Integración:** confirma el flujo end‑to‑end del servicio y la correcta orquestación entre módulos (provisión, seguridad, logging, estado y control).

## 4. Cobertura por categoría (detalle)

### 4.1 Validación
- **Suite completa de validación:** asegura rechazo de entradas inválidas y manejo coherente de errores.
- **Formato FQDN:** confirma que solo se aceptan dominios válidos (sin esquemas, rutas, puertos o IPs).
- **Verificación integral:** valida escenarios combinados de error y éxito, con mensajes claros al usuario.

### 4.2 Unitario
- **Excepciones tipadas:** comprueba clasificación de errores, códigos HTTP y mensajes amigables.
- **Logging estructurado:** valida auditoría en formato JSON con timestamps y contexto.
- **Idempotencia:** garantiza que operaciones repetidas no generan duplicados ni fallos.
- **Mensajes informativos:** confirma claridad y orientación al usuario final ante fallos críticos y no críticos.

### 4.3 Integración
- **Excepciones Cloudflare:** valida mapeo correcto de errores de API y su respuesta consistente.
- **Endpoint /status:** verifica que el estado de zona, DNS y protecciones es consultable.
- **Toggle del servicio:** asegura activación/desactivación global idempotente.
- **Turnstile:** verifica flujo de seguridad de verificación anti‑bot.
- **Verificación DNS:** confirma delegación de nameservers y mensajes de estado.
- **Controlador de flujo:** valida la orquestación completa con pasos críticos y no críticos.

## 5. Evidencia funcional del servicio de protección perimetral
Las pruebas confirman que el backend automatiza, sin intervención manual, las siguientes acciones de seguridad:

- **Registro y configuración DNS** con proxy habilitado.
- **Activación de WAF** en la zona.
- **Redirección HTTPS** forzada.
- **Nivel de seguridad elevado**.
- **Bot Fight Mode**.
- **Browser Integrity Check**.
- **Reglas de firewall y rate limiting** con comportamiento idempotente.

Esto demuestra que, tras recibir el dominio del cliente, el sistema completa la provisión y aplica medidas perimetrales en Cloudflare de forma automática, cumpliendo los objetivos de CSaaS.

## 6. Trazabilidad y auditoría
El sistema registra eventos con logging estructurado (JSON), incluyendo:

- Solicitudes de protección.
- Cambios en configuraciones de seguridad.
- Errores técnicos y su clasificación.
- Verificaciones DNS y estado del servicio.

Esta trazabilidad facilita auditoría, depuración y evidencia verificable para la tesis.

## 7. Conclusión
La evidencia empírica indica que el sistema implementa correctamente el servicio de protección perimetral automatizado, con validación estricta, medidas de seguridad activas y control operacional completo. El resultado de la suite (14/14) respalda la confiabilidad del servicio en el contexto de la investigación.

---
**Estado final:** ✔️ Apto para adjuntar como evidencia formal en la tesis.
