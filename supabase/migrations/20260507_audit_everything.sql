-- =====================================================
-- CUBAN CAS - AUDIT EVERYTHING
-- Registro sistemático de acciones críticas
-- =====================================================
-- Principio: toda acción relevante debe quedar
-- registrada con suficiente contexto para reconstruir
-- qué pasó, quién lo hizo, cuándo y desde dónde.
-- =====================================================

-- =====================================================
-- 1. MEJORAR TABLA audit_logs
--    Agregar campos para auditoría completa
-- =====================================================

-- Severidad del evento
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS severity    TEXT NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info','warning','critical')),
  ADD COLUMN IF NOT EXISTS category    TEXT NOT NULL DEFAULT 'system'
    CHECK (category IN ('auth','data','security','billing','admin','system')),
  ADD COLUMN IF NOT EXISTS action_result TEXT NOT NULL DEFAULT 'success'
    CHECK (action_result IN ('success','failure','denied')),
  ADD COLUMN IF NOT EXISTS session_id  TEXT,
  ADD COLUMN IF NOT EXISTS request_id  TEXT;

-- Índices adicionales para consultas de auditoría
CREATE INDEX IF NOT EXISTS idx_audit_severity  ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_category  ON audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_action    ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_result    ON audit_logs(action_result);
CREATE INDEX IF NOT EXISTS idx_audit_composite
  ON audit_logs(organization_id, created_at DESC, category);

-- =====================================================
-- 2. FUNCIÓN CENTRAL DE AUDITORÍA
--    Un único punto de entrada para todos los eventos
-- =====================================================

CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id       UUID,
  p_org_id        UUID,
  p_action        TEXT,
  p_resource_type TEXT,
  p_resource_id   UUID        DEFAULT NULL,
  p_result        TEXT        DEFAULT 'success',
  p_severity      TEXT        DEFAULT 'info',
  p_category      TEXT        DEFAULT 'system',
  p_metadata      JSONB       DEFAULT '{}',
  p_ip_address    TEXT        DEFAULT NULL,
  p_user_agent    TEXT        DEFAULT NULL,
  p_session_id    TEXT        DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    organization_id,
    user_id,
    action,
    resource_type,
    resource_id,
    action_result,
    severity,
    category,
    ip_address,
    user_agent,
    session_id,
    metadata,
    created_at
  ) VALUES (
    p_org_id,
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_result,
    p_severity,
    p_category,
    p_ip_address::INET,
    p_user_agent,
    p_session_id,
    p_metadata || jsonb_build_object('logged_at', NOW()),
    NOW()
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
EXCEPTION WHEN OTHERS THEN
  -- La auditoría nunca debe romper la operación principal
  RAISE WARNING 'audit log failed: %', SQLERRM;
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION log_audit_event TO service_role, authenticated;

-- =====================================================
-- 3. TRIGGERS DE AUDITORÍA AUTOMÁTICA
--    Eventos críticos registrados sin intervención
-- =====================================================

-- ── Trigger genérico mejorado ─────────────────────
CREATE OR REPLACE FUNCTION audit_table_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id   UUID;
  v_severity TEXT := 'info';
  v_category TEXT := 'data';
  v_action   TEXT;
BEGIN
  -- Determinar acción
  v_action := TG_OP || '_' || TG_TABLE_NAME;

  -- Determinar org_id según tabla
  v_org_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.organization_id
    ELSE NEW.organization_id
  END;

  -- Escalar severidad para operaciones destructivas
  IF TG_OP = 'DELETE' THEN
    v_severity := 'warning';
  END IF;

  -- Categoría según tabla
  v_category := CASE TG_TABLE_NAME
    WHEN 'organization_members' THEN 'admin'
    WHEN 'subscriptions'        THEN 'billing'
    WHEN 'domains'              THEN 'data'
    WHEN 'reports'              THEN 'data'
    WHEN 'service_executions'   THEN 'security'
    ELSE 'system'
  END;

  PERFORM log_audit_event(
    p_user_id       := auth.uid(),
    p_org_id        := v_org_id,
    p_action        := v_action,
    p_resource_type := TG_TABLE_NAME,
    p_resource_id   := COALESCE(
                         CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
                         NULL
                       ),
    p_result        := 'success',
    p_severity      := v_severity,
    p_category      := v_category,
    p_metadata      := jsonb_build_object(
                         'old_data', CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
                         'new_data', CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
                       )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Aplicar a tablas críticas
DROP TRIGGER IF EXISTS trg_audit_org_members   ON organization_members;
DROP TRIGGER IF EXISTS trg_audit_subscriptions ON subscriptions;
DROP TRIGGER IF EXISTS trg_audit_domains       ON domains;
DROP TRIGGER IF EXISTS trg_audit_reports       ON reports;
DROP TRIGGER IF EXISTS trg_audit_executions    ON service_executions;

CREATE TRIGGER trg_audit_org_members
  AFTER INSERT OR UPDATE OR DELETE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION audit_table_change();

CREATE TRIGGER trg_audit_subscriptions
  AFTER INSERT OR UPDATE OR DELETE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION audit_table_change();

CREATE TRIGGER trg_audit_domains
  AFTER INSERT OR UPDATE OR DELETE ON domains
  FOR EACH ROW EXECUTE FUNCTION audit_table_change();

CREATE TRIGGER trg_audit_reports
  AFTER INSERT OR UPDATE OR DELETE ON reports
  FOR EACH ROW EXECUTE FUNCTION audit_table_change();

CREATE TRIGGER trg_audit_executions
  AFTER INSERT OR UPDATE OR DELETE ON service_executions
  FOR EACH ROW EXECUTE FUNCTION audit_table_change();

-- ── Auditoría de autenticación ────────────────────
-- Registra login/logout desde el trigger de auth.users
CREATE OR REPLACE FUNCTION audit_auth_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Obtener org del usuario
  SELECT organization_id INTO v_org_id
  FROM organization_members
  WHERE user_id = NEW.id AND status = 'active'
  LIMIT 1;

  PERFORM log_audit_event(
    p_user_id       := NEW.id,
    p_org_id        := v_org_id,
    p_action        := 'user_login',
    p_resource_type := 'auth',
    p_result        := 'success',
    p_severity      := 'info',
    p_category      := 'auth',
    p_metadata      := jsonb_build_object(
                         'email',      NEW.email,
                         'provider',   NEW.raw_app_meta_data->>'provider',
                         'last_sign_in', NEW.last_sign_in_at
                       )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_auth_login ON auth.users;
CREATE TRIGGER trg_audit_auth_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION audit_auth_event();

-- =====================================================
-- 4. VISTA DE AUDITORÍA ENRIQUECIDA
--    Joins con user_profiles y organizations para
--    mostrar nombres legibles en el viewer
-- =====================================================

CREATE OR REPLACE VIEW v_audit_log_full AS
SELECT
  al.id,
  al.created_at,
  al.action,
  al.resource_type,
  al.resource_id,
  al.action_result,
  al.severity,
  al.category,
  al.ip_address,
  al.user_agent,
  al.session_id,
  al.metadata,
  -- Usuario
  al.user_id,
  up.full_name   AS user_name,
  au.email       AS user_email,
  -- Organización
  al.organization_id,
  o.name         AS organization_name,
  -- Membresía del actor
  om.role        AS actor_role
FROM audit_logs al
LEFT JOIN user_profiles  up ON up.id = al.user_id
LEFT JOIN auth.users     au ON au.id = al.user_id
LEFT JOIN organizations  o  ON o.id  = al.organization_id
LEFT JOIN organization_members om
       ON om.user_id = al.user_id
      AND om.organization_id = al.organization_id
      AND om.status = 'active';

-- =====================================================
-- 5. FUNCIÓN DE CONSULTA PAGINADA
--    Para el AuditLogViewer del frontend
-- =====================================================

CREATE OR REPLACE FUNCTION get_audit_logs(
  p_org_id    UUID,
  p_limit     INT     DEFAULT 50,
  p_offset    INT     DEFAULT 0,
  p_category  TEXT    DEFAULT NULL,
  p_severity  TEXT    DEFAULT NULL,
  p_user_id   UUID    DEFAULT NULL,
  p_from_date TIMESTAMPTZ DEFAULT NULL,
  p_to_date   TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id            UUID,
  created_at    TIMESTAMPTZ,
  action        TEXT,
  resource_type TEXT,
  resource_id   UUID,
  action_result TEXT,
  severity      TEXT,
  category      TEXT,
  ip_address    INET,
  user_agent    TEXT,
  metadata      JSONB,
  user_id       UUID,
  user_name     TEXT,
  user_email    TEXT,
  actor_role    TEXT,
  total_count   BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que el solicitante es manager o admin de la org
  IF NOT has_minimum_role(auth.uid(), p_org_id, 'manager') THEN
    RAISE EXCEPTION 'Insufficient privileges to view audit logs';
  END IF;

  RETURN QUERY
  SELECT
    al.id,
    al.created_at,
    al.action,
    al.resource_type,
    al.resource_id,
    al.action_result,
    al.severity,
    al.category,
    al.ip_address,
    al.user_agent,
    al.metadata,
    al.user_id,
    up.full_name,
    au.email,
    om.role,
    COUNT(*) OVER() AS total_count
  FROM audit_logs al
  LEFT JOIN user_profiles up ON up.id = al.user_id
  LEFT JOIN auth.users    au ON au.id = al.user_id
  LEFT JOIN organization_members om
         ON om.user_id = al.user_id
        AND om.organization_id = al.organization_id
        AND om.status = 'active'
  WHERE al.organization_id = p_org_id
    AND (p_category  IS NULL OR al.category      = p_category)
    AND (p_severity  IS NULL OR al.severity      = p_severity)
    AND (p_user_id   IS NULL OR al.user_id       = p_user_id)
    AND (p_from_date IS NULL OR al.created_at   >= p_from_date)
    AND (p_to_date   IS NULL OR al.created_at   <= p_to_date)
  ORDER BY al.created_at DESC
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_audit_logs TO authenticated;

-- =====================================================
-- 6. RETENCIÓN AUTOMÁTICA
--    Eliminar logs antiguos según plan
-- =====================================================

CREATE OR REPLACE FUNCTION purge_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Free: 30 días | Basic: 90 días | Pro/Enterprise: 365 días
  DELETE FROM audit_logs al
  WHERE al.created_at < NOW() - INTERVAL '1 day' *
    COALESCE((
      SELECT CASE o.plan
               WHEN 'free'       THEN 30
               WHEN 'basic'      THEN 90
               WHEN 'pro'        THEN 365
               WHEN 'enterprise' THEN 730
               ELSE 30
             END
      FROM organizations o
      WHERE o.id = al.organization_id
    ), 30);
END;
$$;

COMMENT ON FUNCTION log_audit_event IS
  'Audit Everything: punto central de registro. SECURITY DEFINER para garantizar escritura incluso con RLS activo.';

COMMENT ON FUNCTION get_audit_logs IS
  'Audit Everything: consulta paginada con filtros. Verifica rol mínimo manager antes de retornar datos.';

COMMENT ON FUNCTION purge_old_audit_logs IS
  'Audit Everything: retención automática según plan. Ejecutar como cron job diario.';
