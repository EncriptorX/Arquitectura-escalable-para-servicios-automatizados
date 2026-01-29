# Implementación CSaaS (Cloudflare as a Service)

## 1. Objetivo
Implementar un servicio CSaaS que permita proteger dominios de clientes sin que estos tengan que gestionar cuentas de Cloudflare. La plataforma automatiza la provisión, activa protecciones perimetrales y entrega una URL protegida basada en un subdominio propio.

## 2. Componentes Clave

**Backend (Python):**
- `api/csaas-provision.py`: orquesta el provisionamiento y aplica reglas de seguridad.
- `api/proxy.py`: proxy reverso que enruta solicitudes al dominio real del cliente.
- `api/csaas-list.py`: listado de clientes provisionados y estado actual.

**Frontend (React):**
- `CSaaSRequestForm.tsx`: solicitud de protección.
- `CSaaSResultPage.tsx`: resultado e instrucciones DNS.
- `CSaaSClientsPage.tsx`: visualización de clientes provisionados.

## 3. Flujo de Provisión
1. Cliente envía `client_name`, `client_id` y `urls`.
2. El backend genera un subdominio único bajo `CSAAS_ZONE`.
3. Se crea un registro CNAME proxied hacia `CSAAS_CNAME_TARGET`.
4. Se crea el Custom Hostname con SSL DV HTTP (sin `custom_origin_*`).
5. Se espera activación SSL (polling) y se aplica seguridad perimetral.
6. Se almacena el cliente y se configura el mapa del proxy (`subdomain → origin`).

## 4. Endpoints CSaaS

**Provisionar cliente**: `POST /api/csaas-provision`
- Crea subdominio y aplica protección

**Listar clientes**: `GET /api/csaas-list`
- Retorna `hostname`, `status`, `ssl_status` y `created_at`

## 5. Seguridad Aplicada
La provisión aplica de forma automática:

- WAF activado
- Redirección HTTPS
- Nivel de seguridad alto
- Bot Fight Mode
- Browser Integrity Check
- Regla de rate limiting (CAS)

## 6. Persistencia y Estado
El estado de clientes se almacena en memoria (`CSaaSConfig.PROVISIONED_CLIENTS`).
Esto permite trazabilidad inmediata, pero se reinicia al reiniciar el backend.

## 7. Limitaciones y Trabajo Futuro
- Persistencia: migrar a base de datos (Supabase/PostgreSQL).
- Escalabilidad: métricas y cache en el proxy.
- Multi‑tenant: aislamiento y credenciales por cliente.

## 8. Evidencia de Pruebas
La verificación completa se encuentra en:
- `docs/Informe_Evidencias_Pruebas_CSaas_2026-01-29.md`
