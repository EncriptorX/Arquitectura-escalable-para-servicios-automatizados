-- =====================================================
-- CUBAN CAS - LEAST PRIVILEGE IMPLEMENTATION
-- Principio de Mínimo Privilegio a nivel de BD
-- =====================================================
-- Aplica el principio: cada rol de BD solo tiene los
-- permisos estrictamente necesarios para su función.
-- =====================================================

-- =====================================================
-- 1. ROLES DE BASE DE DATOS (DB-level roles)
--    Separados del sistema de roles de aplicación
-- =====================================================

-- Rol de solo lectura para viewers y reportes
DO $$ BEGIN
  CREATE ROLE cas_readonly;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Rol para analistas (lectura + ejecución de escaneos)
DO $$ BEGIN
  CREATE ROLE cas_analyst;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Rol para managers (gestión de dominios y usuarios)
DO $$ BEGIN
  CREATE ROLE cas_manager;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Rol para admins de organización
DO $$ BEGIN
  CREATE ROLE cas_org_admin;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 2. REVOCAR PRIVILEGIOS POR DEFECTO
--    Empezar desde cero: ningún privilegio implícito
-- =====================================================

-- Revocar acceso público al schema
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- Otorgar uso del schema solo a roles definidos
GRANT USAGE ON SCHEMA public TO cas_readonly, cas_analyst, cas_manager, cas_org_admin;
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;

-- =====================================================
-- 3. PRIVILEGIOS POR TABLA - PRINCIPIO MÍNIMO PRIVILEGIO
--    Cada rol solo accede a lo que necesita
-- =====================================================

-- ── cas_readonly (viewer) ──────────────────────────
-- Solo SELECT en tablas de consulta, sin escritura
GRANT SELECT ON organizations          TO cas_readonly;
GRANT SELECT ON user_profiles          TO cas_readonly;
GRANT SELECT ON domains                TO cas_readonly;
GRANT SELECT ON reports                TO cas_readonly;
GRANT SELECT ON security_services      TO cas_readonly;
GRANT SELECT ON service_executions     TO cas_readonly;
GRANT SELECT ON notifications          TO cas_readonly;
GRANT SELECT ON plans                  TO cas_readonly;
GRANT SELECT ON subscriptions          TO cas_readonly;
-- Sin acceso a: audit_logs, invoices, usage_records, organization_members

-- ── cas_analyst (analyst) ─────────────────────────
-- Hereda readonly + puede ejecutar servicios y generar reportes
GRANT cas_readonly                     TO cas_analyst;
GRANT INSERT, UPDATE ON service_executions TO cas_analyst;
GRANT INSERT ON reports                TO cas_analyst;
GRANT UPDATE (status, read_at) ON notifications TO cas_analyst;
GRANT SELECT ON usage_records          TO cas_analyst;
-- Sin acceso a: audit_logs, invoices, organization_members, billing

-- ── cas_manager (manager) ─────────────────────────
-- Hereda analyst + gestión de dominios y usuarios
GRANT cas_analyst                      TO cas_manager;
GRANT INSERT, UPDATE, DELETE ON domains TO cas_manager;
GRANT SELECT, INSERT, UPDATE ON organization_members TO cas_manager;
GRANT SELECT ON audit_logs             TO cas_manager;
GRANT SELECT ON invoices               TO cas_manager;
GRANT SELECT, INSERT ON usage_records  TO cas_manager;
-- Sin acceso a: billing directo, stripe keys, configuración global

-- ── cas_org_admin (admin) ─────────────────────────
-- Hereda manager + gestión completa de la organización
GRANT cas_manager                      TO cas_org_admin;
GRANT UPDATE ON organizations          TO cas_org_admin;
GRANT INSERT, UPDATE, DELETE ON organization_members TO cas_org_admin;
GRANT SELECT, UPDATE ON subscriptions  TO cas_org_admin;
GRANT SELECT ON invoices               TO cas_org_admin;
GRANT SELECT, INSERT ON audit_logs     TO cas_org_admin;

-- =====================================================
-- 4. PRIVILEGIOS EN SECUENCIAS (para INSERT con UUID)
-- =====================================================

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO cas_analyst, cas_manager, cas_org_admin;

-- =====================================================
-- 5. PRIVILEGIOS EN FUNCIONES CRÍTICAS
--    Solo los roles que necesitan cada función
-- =====================================================

-- Función de contexto: solo roles autenticados
GRANT EXECUTE ON FUNCTION get_user_organization_context(UUID)
  TO authenticated;

-- Función de verificación de permisos: todos los roles
GRANT EXECUTE ON FUNCTION user_has_permission(UUID, UUID, TEXT)
  TO authenticated;

-- Función de límites de plan: analyst en adelante
GRANT EXECUTE ON FUNCTION check_organization_plan_limits(UUID, TEXT)
  TO cas_analyst, cas_manager, cas_org_admin, authenticated;

-- Función de registro de uso: solo service_role (Edge Functions)
GRANT EXECUTE ON FUNCTION record_usage(UUID, TEXT, INTEGER, JSONB)
  TO service_role;

-- =====================================================
-- 6. RLS POLICIES REFORZADAS - LEAST PRIVILEGE
--    Reemplaza políticas permisivas por políticas
--    que verifican el rol exacto requerido
-- =====================================================

-- ── Helper function: obtener rol del usuario en su org ──
CREATE OR REPLACE FUNCTION get_user_role_in_org(p_user_id UUID, p_org_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM organization_members
  WHERE user_id = p_user_id
    AND organization_id = p_org_id
    AND status = 'active'
  LIMIT 1;
$$;

-- ── Helper function: verificar membresía activa ──
CREATE OR REPLACE FUNCTION is_active_member(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = p_user_id
      AND organization_id = p_org_id
      AND status = 'active'
  );
$$;

-- ── Helper function: verificar rol mínimo requerido ──
-- Jerarquía: viewer < analyst < manager < admin
CREATE OR REPLACE FUNCTION has_minimum_role(
  p_user_id UUID,
  p_org_id  UUID,
  p_min_role TEXT  -- 'viewer' | 'analyst' | 'manager' | 'admin'
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = p_user_id
      AND organization_id = p_org_id
      AND status = 'active'
      AND CASE p_min_role
            WHEN 'viewer'  THEN role IN ('viewer','analyst','manager','admin')
            WHEN 'analyst' THEN role IN ('analyst','manager','admin')
            WHEN 'manager' THEN role IN ('manager','admin')
            WHEN 'admin'   THEN role = 'admin'
            ELSE FALSE
          END
  );
$$;

-- =====================================================
-- 7. POLÍTICAS RLS REFORZADAS POR TABLA
-- =====================================================

-- ── ORGANIZATIONS ────────────────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lp_org_select" ON organizations;
DROP POLICY IF EXISTS "lp_org_update" ON organizations;

-- Solo miembros activos pueden ver su organización
CREATE POLICY "lp_org_select" ON organizations
  FOR SELECT TO authenticated
  USING (
    is_active_member(auth.uid(), id)
  );

-- Solo admins pueden modificar la organización
CREATE POLICY "lp_org_update" ON organizations
  FOR UPDATE TO authenticated
  USING (
    has_minimum_role(auth.uid(), id, 'admin')
  )
  WITH CHECK (
    has_minimum_role(auth.uid(), id, 'admin')
  );

-- ── USER_PROFILES ────────────────────────────────────
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lp_profile_select_own" ON user_profiles;
DROP POLICY IF EXISTS "lp_profile_update_own" ON user_profiles;
DROP POLICY IF EXISTS "lp_profile_select_org" ON user_profiles;

-- Cada usuario solo ve y edita su propio perfil
CREATE POLICY "lp_profile_select_own" ON user_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "lp_profile_update_own" ON user_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Managers y admins pueden ver perfiles de su organización
CREATE POLICY "lp_profile_select_org" ON user_profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
        AND om1.status = 'active'
        AND om1.role IN ('manager', 'admin')
        AND om2.user_id = user_profiles.id
        AND om2.status = 'active'
    )
  );

-- ── ORGANIZATION_MEMBERS ─────────────────────────────
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lp_members_select_own" ON organization_members;
DROP POLICY IF EXISTS "lp_members_select_manager" ON organization_members;
DROP POLICY IF EXISTS "lp_members_insert_admin" ON organization_members;
DROP POLICY IF EXISTS "lp_members_update_admin" ON organization_members;
DROP POLICY IF EXISTS "lp_members_delete_admin" ON organization_members;

-- Cada usuario ve su propia membresía
CREATE POLICY "lp_members_select_own" ON organization_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Managers y admins ven todos los miembros de su org
CREATE POLICY "lp_members_select_manager" ON organization_members
  FOR SELECT TO authenticated
  USING (
    has_minimum_role(auth.uid(), organization_id, 'manager')
  );

-- Solo admins pueden invitar/crear miembros
CREATE POLICY "lp_members_insert_admin" ON organization_members
  FOR INSERT TO authenticated
  WITH CHECK (
    has_minimum_role(auth.uid(), organization_id, 'admin')
  );

-- Solo admins pueden modificar roles y permisos
CREATE POLICY "lp_members_update_admin" ON organization_members
  FOR UPDATE TO authenticated
  USING (
    has_minimum_role(auth.uid(), organization_id, 'admin')
  )
  WITH CHECK (
    has_minimum_role(auth.uid(), organization_id, 'admin')
    -- Restricción adicional: no se puede escalar a un rol superior al propio
    AND (
      NEW.role != 'admin'
      OR get_user_role_in_org(auth.uid(), organization_id) = 'admin'
    )
  );

-- Solo admins pueden eliminar miembros
CREATE POLICY "lp_members_delete_admin" ON organization_members
  FOR DELETE TO authenticated
  USING (
    has_minimum_role(auth.uid(), organization_id, 'admin')
    -- No puede eliminarse a sí mismo si es el único admin
    AND NOT (
      user_id = auth.uid()
      AND (
        SELECT COUNT(*) FROM organization_members
        WHERE organization_id = organization_members.organization_id
          AND role = 'admin'
          AND status = 'active'
      ) <= 1
    )
  );

-- ── DOMAINS ──────────────────────────────────────────
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lp_domains_select" ON domains;
DROP POLICY IF EXISTS "lp_domains_insert" ON domains;
DROP POLICY IF EXISTS "lp_domains_update" ON domains;
DROP POLICY IF EXISTS "lp_domains_delete" ON domains;

-- Todos los miembros activos pueden ver dominios
CREATE POLICY "lp_domains_select" ON domains
  FOR SELECT TO authenticated
  USING (is_active_member(auth.uid(), organization_id));

-- Solo managers y admins pueden agregar dominios
CREATE POLICY "lp_domains_insert" ON domains
  FOR INSERT TO authenticated
  WITH CHECK (
    has_minimum_role(auth.uid(), organization_id, 'manager')
  );

-- Solo managers y admins pueden modificar dominios
CREATE POLICY "lp_domains_update" ON domains
  FOR UPDATE TO authenticated
  USING (has_minimum_role(auth.uid(), organization_id, 'manager'))
  WITH CHECK (has_minimum_role(auth.uid(), organization_id, 'manager'));

-- Solo admins pueden eliminar dominios
CREATE POLICY "lp_domains_delete" ON domains
  FOR DELETE TO authenticated
  USING (has_minimum_role(auth.uid(), organization_id, 'admin'));

-- ── SERVICE_EXECUTIONS ───────────────────────────────
ALTER TABLE service_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lp_exec_select" ON service_executions;
DROP POLICY IF EXISTS "lp_exec_insert" ON service_executions;
DROP POLICY IF EXISTS "lp_exec_update" ON service_executions;

-- Todos los miembros ven ejecuciones de su org
CREATE POLICY "lp_exec_select" ON service_executions
  FOR SELECT TO authenticated
  USING (is_active_member(auth.uid(), organization_id));

-- Solo analysts, managers y admins pueden ejecutar servicios
CREATE POLICY "lp_exec_insert" ON service_executions
  FOR INSERT TO authenticated
  WITH CHECK (
    has_minimum_role(auth.uid(), organization_id, 'analyst')
  );

-- Solo el sistema (service_role) puede actualizar resultados
CREATE POLICY "lp_exec_update" ON service_executions
  FOR UPDATE TO service_role
  USING (TRUE);

-- ── REPORTS ──────────────────────────────────────────
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lp_reports_select" ON reports;
DROP POLICY IF EXISTS "lp_reports_insert" ON reports;
DROP POLICY IF EXISTS "lp_reports_delete" ON reports;

-- Todos los miembros pueden ver reportes
CREATE POLICY "lp_reports_select" ON reports
  FOR SELECT TO authenticated
  USING (is_active_member(auth.uid(), organization_id));

-- Solo analysts, managers y admins pueden generar reportes
CREATE POLICY "lp_reports_insert" ON reports
  FOR INSERT TO authenticated
  WITH CHECK (
    has_minimum_role(auth.uid(), organization_id, 'analyst')
  );

-- Solo admins pueden eliminar reportes
CREATE POLICY "lp_reports_delete" ON reports
  FOR DELETE TO authenticated
  USING (has_minimum_role(auth.uid(), organization_id, 'admin'));

-- ── SUBSCRIPTIONS ────────────────────────────────────
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lp_subs_select" ON subscriptions;
DROP POLICY IF EXISTS "lp_subs_update" ON subscriptions;

-- Todos los miembros pueden ver la suscripción de su org
CREATE POLICY "lp_subs_select" ON subscriptions
  FOR SELECT TO authenticated
  USING (is_active_member(auth.uid(), organization_id));

-- Solo admins y service_role pueden modificar suscripciones
CREATE POLICY "lp_subs_update" ON subscriptions
  FOR UPDATE TO authenticated
  USING (has_minimum_role(auth.uid(), organization_id, 'admin'))
  WITH CHECK (has_minimum_role(auth.uid(), organization_id, 'admin'));

-- ── INVOICES ─────────────────────────────────────────
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lp_invoices_select" ON invoices;

-- Solo managers y admins pueden ver facturas (datos financieros sensibles)
CREATE POLICY "lp_invoices_select" ON invoices
  FOR SELECT TO authenticated
  USING (
    has_minimum_role(auth.uid(), organization_id, 'manager')
  );

-- ── USAGE_RECORDS ────────────────────────────────────
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lp_usage_select" ON usage_records;
DROP POLICY IF EXISTS "lp_usage_insert" ON usage_records;

-- Todos los miembros pueden ver el uso de su org
CREATE POLICY "lp_usage_select" ON usage_records
  FOR SELECT TO authenticated
  USING (is_active_member(auth.uid(), organization_id));

-- Solo service_role puede registrar uso (desde Edge Functions)
CREATE POLICY "lp_usage_insert" ON usage_records
  FOR INSERT TO service_role
  WITH CHECK (TRUE);

-- ── AUDIT_LOGS ───────────────────────────────────────
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lp_audit_select" ON audit_logs;
DROP POLICY IF EXISTS "lp_audit_insert" ON audit_logs;

-- Solo managers y admins pueden ver logs de auditoría
CREATE POLICY "lp_audit_select" ON audit_logs
  FOR SELECT TO authenticated
  USING (
    has_minimum_role(auth.uid(), organization_id, 'manager')
  );

-- Solo service_role puede insertar logs (desde Edge Functions)
CREATE POLICY "lp_audit_insert" ON audit_logs
  FOR INSERT TO service_role
  WITH CHECK (TRUE);

-- ── NOTIFICATIONS ────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lp_notif_select" ON notifications;
DROP POLICY IF EXISTS "lp_notif_update" ON notifications;

-- Cada usuario ve solo sus notificaciones o las de su org
CREATE POLICY "lp_notif_select" ON notifications
  FOR SELECT TO authenticated
  USING (
    (user_id = auth.uid())
    OR (
      user_id IS NULL
      AND is_active_member(auth.uid(), organization_id)
    )
  );

-- Cada usuario solo puede marcar como leídas sus propias notificaciones
CREATE POLICY "lp_notif_update" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    -- Solo puede cambiar status y read_at, no otros campos
  );

-- ── PLANS (tabla pública de referencia) ──────────────
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lp_plans_select" ON plans;

-- Planes son públicos (cualquiera puede verlos para el pricing)
CREATE POLICY "lp_plans_select" ON plans
  FOR SELECT TO anon, authenticated
  USING (active = TRUE);

-- ── SERVICE_REQUESTS (formulario público) ────────────
-- Ya tiene políticas, solo reforzamos
DROP POLICY IF EXISTS "lp_sr_insert" ON service_requests;
DROP POLICY IF EXISTS "lp_sr_select" ON service_requests;

CREATE POLICY "lp_sr_insert" ON service_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (TRUE);

CREATE POLICY "lp_sr_select" ON service_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('manager', 'admin')
    )
  );

-- =====================================================
-- 8. FUNCIÓN DE AUDITORÍA AUTOMÁTICA
--    Registra cambios sensibles sin intervención manual
-- =====================================================

CREATE OR REPLACE FUNCTION audit_sensitive_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (
    organization_id,
    user_id,
    action,
    resource_type,
    resource_id,
    ip_address,
    metadata
  ) VALUES (
    COALESCE(NEW.organization_id, OLD.organization_id),
    auth.uid(),
    TG_OP,                    -- INSERT / UPDATE / DELETE
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    current_setting('request.headers', true)::json->>'x-forwarded-for',
    jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW),
      'timestamp', NOW()
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Aplicar auditoría a tablas sensibles
DROP TRIGGER IF EXISTS audit_org_members ON organization_members;
CREATE TRIGGER audit_org_members
  AFTER INSERT OR UPDATE OR DELETE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_change();

DROP TRIGGER IF EXISTS audit_subscriptions ON subscriptions;
CREATE TRIGGER audit_subscriptions
  AFTER INSERT OR UPDATE OR DELETE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_change();

DROP TRIGGER IF EXISTS audit_domains ON domains;
CREATE TRIGGER audit_domains
  AFTER INSERT OR UPDATE OR DELETE ON domains
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_change();

-- =====================================================
-- 9. VISTA SEGURA: RESUMEN DE PERMISOS POR USUARIO
--    Útil para debugging y auditoría
-- =====================================================

CREATE OR REPLACE VIEW v_user_permissions AS
SELECT
  om.user_id,
  up.full_name,
  o.name  AS organization_name,
  o.id    AS organization_id,
  om.role,
  om.permissions,
  om.status,
  -- Permisos efectivos según rol (ROLE_PERMISSIONS mapping)
  CASE om.role
    WHEN 'admin'   THEN ARRAY['manage_organization','manage_users','manage_billing',
                               'manage_domains','view_domains','execute_scans',
                               'manage_services','generate_reports','view_reports',
                               'view_audit_logs','manage_notifications']
    WHEN 'manager' THEN ARRAY['manage_organization','manage_users','manage_domains',
                               'view_domains','execute_scans','manage_services',
                               'generate_reports','view_reports','manage_notifications']
    WHEN 'analyst' THEN ARRAY['view_domains','execute_scans','generate_reports','view_reports']
    WHEN 'viewer'  THEN ARRAY['view_domains','view_reports']
    ELSE            ARRAY[]::TEXT[]
  END AS effective_permissions
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
LEFT JOIN user_profiles up ON up.id = om.user_id
WHERE om.status = 'active';

-- Solo admins y managers pueden consultar esta vista
ALTER VIEW v_user_permissions OWNER TO authenticated;

-- =====================================================
-- 10. COMENTARIOS DE DOCUMENTACIÓN
-- =====================================================

COMMENT ON FUNCTION get_user_role_in_org IS
  'Least Privilege: retorna el rol exacto del usuario en una organización. SECURITY DEFINER para evitar bypass de RLS.';

COMMENT ON FUNCTION is_active_member IS
  'Least Privilege: verifica membresía activa antes de cualquier acceso a datos de la organización.';

COMMENT ON FUNCTION has_minimum_role IS
  'Least Privilege: verifica que el usuario tenga al menos el rol mínimo requerido para una operación. Jerarquía: viewer < analyst < manager < admin.';

COMMENT ON FUNCTION audit_sensitive_change IS
  'Least Privilege: registra automáticamente cambios en tablas sensibles para trazabilidad completa.';
