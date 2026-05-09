-- =====================================================
-- CUBAN CAS - CLEAN SETUP MIGRATION
-- Ejecutar este archivo en Supabase SQL Editor
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ORGANIZATIONS
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    domain TEXT,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','basic','pro','enterprise')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','trial','canceled')),
    stripe_customer_id TEXT UNIQUE,
    billing_email TEXT,
    settings JSONB DEFAULT '{}',
    security_config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- USER_PROFILES (nombre usado en toda la app)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    phone TEXT,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    security_notifications BOOLEAN DEFAULT TRUE,
    timezone TEXT DEFAULT 'UTC',
    language TEXT DEFAULT 'es',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ORGANIZATION_MEMBERS
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin','manager','analyst','viewer')),
    permissions JSONB DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','invited','suspended')),
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMPTZ,
    invitation_token TEXT UNIQUE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (organization_id, user_id)
);

-- PLANS
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    price_monthly DECIMAL(10,2) DEFAULT 0,
    price_yearly DECIMAL(10,2) DEFAULT 0,
    max_domains INTEGER DEFAULT 1,
    max_scans_per_month INTEGER DEFAULT 10,
    max_reports_per_month INTEGER DEFAULT 5,
    max_users INTEGER DEFAULT 1,
    enabled_services JSONB DEFAULT '[]',
    features JSONB DEFAULT '{}',
    stripe_price_id_monthly TEXT,
    stripe_price_id_yearly TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id),
    status TEXT NOT NULL CHECK (status IN ('active','canceled','past_due','unpaid','trialing')),
    billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DOMAINS
CREATE TABLE IF NOT EXISTS domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    subdomain TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','pending','error')),
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','failed')),
    security_config JSONB DEFAULT '{}',
    cloudflare_zone_id TEXT,
    cloudflare_dns_record_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (organization_id, domain)
);

-- SECURITY_SERVICES
CREATE TABLE IF NOT EXISTS security_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    service_type TEXT NOT NULL CHECK (service_type IN ('perimeter','vulnerability','performance','security','compliance')),
    default_config JSONB DEFAULT '{}',
    required_permissions JSONB DEFAULT '[]',
    cost_per_execution DECIMAL(10,4) DEFAULT 0,
    execution_time_limit INTEGER DEFAULT 300,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SERVICE_EXECUTIONS
CREATE TABLE IF NOT EXISTS service_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES security_services(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','canceled')),
    config JSONB DEFAULT '{}',
    results JSONB,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    execution_time_seconds INTEGER,
    triggered_by TEXT NOT NULL DEFAULT 'manual' CHECK (triggered_by IN ('manual','schedule','api','retry')),
    triggered_by_user_id UUID REFERENCES auth.users(id),
    parent_execution_id UUID REFERENCES service_executions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- REPORTS
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    report_type TEXT NOT NULL CHECK (report_type IN ('security','vulnerability','performance','compliance','comprehensive')),
    format TEXT NOT NULL DEFAULT 'html' CHECK (format IN ('pdf','html','json')),
    summary TEXT,
    findings JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating','completed','failed')),
    generated_by_ai BOOLEAN DEFAULT TRUE,
    file_url TEXT,
    file_size INTEGER,
    generated_at TIMESTAMPTZ,
    regenerated_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- USAGE_RECORDS
CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    resource_type TEXT NOT NULL CHECK (resource_type IN ('scan','report','domain','user','api_call')),
    quantity INTEGER NOT NULL DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- INVOICES
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    stripe_invoice_id TEXT UNIQUE,
    invoice_number TEXT,
    amount_due INTEGER NOT NULL,
    amount_paid INTEGER DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL CHECK (status IN ('draft','open','paid','void','uncollectible')),
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('info','warning','error','success')),
    category TEXT CHECK (category IN ('security','billing','system','report')),
    delivery_method TEXT NOT NULL DEFAULT 'in_app' CHECK (delivery_method IN ('in_app','email','both')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','read','failed')),
    metadata JSONB DEFAULT '{}',
    read_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUDIT_LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    action_result TEXT NOT NULL DEFAULT 'success' CHECK (action_result IN ('success','failure','denied')),
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
    category TEXT NOT NULL DEFAULT 'system' CHECK (category IN ('auth','data','security','billing','admin','system')),
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SERVICE_REQUESTS (formulario público)
CREATE TABLE IF NOT EXISTS service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    urls TEXT[] NOT NULL DEFAULT '{}',
    comments TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_org_members_org_id    ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id   ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id  ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_domains_org_id        ON domains(organization_id);
CREATE INDEX IF NOT EXISTS idx_executions_org_id     ON service_executions(organization_id);
CREATE INDEX IF NOT EXISTS idx_reports_org_id        ON reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_org_id          ON usage_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_org_id          ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at      ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_severity        ON audit_logs(severity);

-- =====================================================
-- DATOS INICIALES
-- =====================================================
INSERT INTO plans (name,slug,description,price_monthly,price_yearly,max_domains,max_scans_per_month,max_reports_per_month,max_users,enabled_services,features)
VALUES
('Free','free','Basic security scanning',0,0,1,5,2,1,'["basic_scan"]','{"support":"community","data_retention_days":30}'),
('Basic','basic','Essential security features',29,290,5,50,10,3,'["basic_scan","cloudflare_protection","performance_tests"]','{"support":"email","sla":"48h","data_retention_days":90}'),
('Pro','pro','Professional security suite',99,990,25,200,50,10,'["basic_scan","cloudflare_protection","performance_tests","vulnerability_scan","security_tests"]','{"support":"priority","sla":"24h","custom_reports":true,"data_retention_days":365}'),
('Enterprise','enterprise','Enterprise-grade security',299,2990,100,1000,200,50,'["basic_scan","cloudflare_protection","performance_tests","vulnerability_scan","security_tests","compliance_scan","penetration_test"]','{"support":"dedicated","sla":"4h","custom_reports":true,"api_access":true,"sso":true,"data_retention_days":730}')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO security_services (name,slug,description,service_type,default_config,required_permissions)
VALUES
('Perimeter Protection','perimeter_protection','Cloudflare-based perimeter security','perimeter','{"waf":true,"ddos":true}','["execute_scans"]'),
('Vulnerability Scan','vulnerability_scan','Comprehensive vulnerability assessment','vulnerability','{"depth":"standard","timeout":300}','["execute_scans"]'),
('Performance Test','performance_test','Load and performance testing','performance','{"duration":60,"concurrent_users":10}','["execute_scans"]'),
('Security Test','security_test','Automated security testing suite','security','{"test_suite":"owasp_top10"}','["execute_scans"]'),
('Compliance Scan','compliance_scan','Regulatory compliance assessment','compliance','{"standards":["pci","gdpr"]}','["execute_scans","generate_reports"]')
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE organizations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans                ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains              ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_services    ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_executions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports              ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records        ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests     ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION is_active_member(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM organization_members WHERE user_id=p_user_id AND organization_id=p_org_id AND status='active');
$$;

CREATE OR REPLACE FUNCTION has_minimum_role(p_user_id UUID, p_org_id UUID, p_min_role TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id=p_user_id AND organization_id=p_org_id AND status='active'
    AND CASE p_min_role
      WHEN 'viewer'  THEN role IN ('viewer','analyst','manager','admin')
      WHEN 'analyst' THEN role IN ('analyst','manager','admin')
      WHEN 'manager' THEN role IN ('manager','admin')
      WHEN 'admin'   THEN role='admin'
      ELSE FALSE END
  );
$$;

-- RLS Policies
CREATE POLICY "own_profile_select"   ON user_profiles FOR SELECT TO authenticated USING (id=auth.uid());
CREATE POLICY "own_profile_update"   ON user_profiles FOR UPDATE TO authenticated USING (id=auth.uid()) WITH CHECK (id=auth.uid());
CREATE POLICY "own_membership"       ON organization_members FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY "manager_see_members"  ON organization_members FOR SELECT TO authenticated USING (has_minimum_role(auth.uid(),organization_id,'manager'));
CREATE POLICY "admin_manage_members" ON organization_members FOR ALL    TO authenticated USING (has_minimum_role(auth.uid(),organization_id,'admin'));
CREATE POLICY "org_select"           ON organizations FOR SELECT TO authenticated USING (is_active_member(auth.uid(),id));
CREATE POLICY "admin_update_org"     ON organizations FOR UPDATE TO authenticated USING (has_minimum_role(auth.uid(),id,'admin'));
CREATE POLICY "plans_public"         ON plans FOR SELECT TO anon, authenticated USING (active=TRUE);
CREATE POLICY "services_public"      ON security_services FOR SELECT TO authenticated USING (active=TRUE);
CREATE POLICY "subs_select"          ON subscriptions FOR SELECT TO authenticated USING (is_active_member(auth.uid(),organization_id));
CREATE POLICY "domains_select"       ON domains FOR SELECT TO authenticated USING (is_active_member(auth.uid(),organization_id));
CREATE POLICY "domains_write"        ON domains FOR ALL    TO authenticated USING (has_minimum_role(auth.uid(),organization_id,'manager'));
CREATE POLICY "exec_select"          ON service_executions FOR SELECT TO authenticated USING (is_active_member(auth.uid(),organization_id));
CREATE POLICY "exec_insert"          ON service_executions FOR INSERT TO authenticated WITH CHECK (has_minimum_role(auth.uid(),organization_id,'analyst'));
CREATE POLICY "reports_select"       ON reports FOR SELECT TO authenticated USING (is_active_member(auth.uid(),organization_id));
CREATE POLICY "reports_insert"       ON reports FOR INSERT TO authenticated WITH CHECK (has_minimum_role(auth.uid(),organization_id,'analyst'));
CREATE POLICY "usage_select"         ON usage_records FOR SELECT TO authenticated USING (is_active_member(auth.uid(),organization_id));
CREATE POLICY "invoices_select"      ON invoices FOR SELECT TO authenticated USING (has_minimum_role(auth.uid(),organization_id,'manager'));
CREATE POLICY "notif_select"         ON notifications FOR SELECT TO authenticated USING ((user_id=auth.uid()) OR (user_id IS NULL AND is_active_member(auth.uid(),organization_id)));
CREATE POLICY "notif_update"         ON notifications FOR UPDATE TO authenticated USING (user_id=auth.uid());
CREATE POLICY "audit_select"         ON audit_logs FOR SELECT TO authenticated USING (has_minimum_role(auth.uid(),organization_id,'manager'));
CREATE POLICY "sr_insert"            ON service_requests FOR INSERT TO anon, authenticated WITH CHECK (TRUE);

-- =====================================================
-- TRIGGER: nuevo usuario → crea org + perfil
-- =====================================================
CREATE OR REPLACE FUNCTION handle_new_user_registration()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_org_id UUID; v_slug TEXT;
BEGIN
  INSERT INTO user_profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name','New User'), NEW.email)
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', user_profiles.full_name),
    email = NEW.email, updated_at = NOW();

  v_slug := LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'company_name','org'),' ','-'))
            || '-' || SUBSTRING(NEW.id::text,1,8);

  IF NOT EXISTS (SELECT 1 FROM organization_members WHERE user_id=NEW.id AND status='invited') THEN
    INSERT INTO organizations (name, slug, plan)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name','My Organization'), v_slug, 'free')
    RETURNING id INTO v_org_id;

    INSERT INTO organization_members (organization_id, user_id, role, status, permissions)
    VALUES (v_org_id, NEW.id, 'admin', 'active',
      '["manage_organization","manage_users","manage_billing","manage_domains","view_domains","execute_scans","manage_services","generate_reports","view_reports","view_audit_logs","manage_notifications"]'::jsonb);
  ELSE
    UPDATE organization_members SET status='active', joined_at=NOW()
    WHERE user_id=NEW.id AND status='invited';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_registration();

-- =====================================================
-- FUNCIONES DE CONTEXTO Y PERMISOS
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_organization_context(user_uuid UUID)
RETURNS TABLE (organization_id UUID, organization_name TEXT, user_role TEXT, permissions JSONB, plan_slug TEXT, subscription_status TEXT, member_status TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT o.id, o.name, om.role, om.permissions,
         COALESCE(p.slug,'free'), COALESCE(s.status,'none'), om.status
  FROM organization_members om
  JOIN organizations o ON o.id=om.organization_id
  LEFT JOIN subscriptions s ON s.organization_id=o.id AND s.status='active'
  LEFT JOIN plans p ON p.id=s.plan_id
  WHERE om.user_id=user_uuid AND om.status='active';
END;
$$;

CREATE OR REPLACE FUNCTION user_has_permission(p_user_id UUID, p_org_id UUID, p_permission TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE v_role TEXT; v_perms JSONB;
BEGIN
  SELECT role, permissions INTO v_role, v_perms
  FROM organization_members
  WHERE user_id=p_user_id AND organization_id=p_org_id AND status='active' LIMIT 1;
  IF v_role='admin' THEN RETURN TRUE; END IF;
  RETURN v_perms ? p_permission;
END;
$$;

CREATE OR REPLACE FUNCTION check_organization_plan_limits(org_id UUID, resource_type TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE v_usage INT; v_limit INT;
BEGIN
  SELECT COALESCE(SUM(quantity),0) INTO v_usage FROM usage_records
  WHERE organization_id=org_id
    AND usage_records.resource_type=check_organization_plan_limits.resource_type
    AND recorded_at >= DATE_TRUNC('month', NOW());

  SELECT CASE check_organization_plan_limits.resource_type
    WHEN 'scan'   THEN p.max_scans_per_month
    WHEN 'report' THEN p.max_reports_per_month
    WHEN 'domain' THEN p.max_domains
    WHEN 'user'   THEN p.max_users
    ELSE 0 END
  INTO v_limit
  FROM subscriptions s JOIN plans p ON p.id=s.plan_id
  WHERE s.organization_id=org_id AND s.status='active' LIMIT 1;

  RETURN v_usage < COALESCE(v_limit, 5);
END;
$$;

-- Función de auditoría central
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID, p_org_id UUID, p_action TEXT, p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL, p_result TEXT DEFAULT 'success',
  p_severity TEXT DEFAULT 'info', p_category TEXT DEFAULT 'system',
  p_metadata JSONB DEFAULT '{}', p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL, p_session_id TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO audit_logs (organization_id,user_id,action,resource_type,resource_id,
    action_result,severity,category,ip_address,user_agent,session_id,metadata)
  VALUES (p_org_id,p_user_id,p_action,p_resource_type,p_resource_id,
    p_result,p_severity,p_category,p_ip_address::INET,p_user_agent,p_session_id,
    p_metadata || jsonb_build_object('logged_at',NOW()))
  RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'audit log failed: %', SQLERRM;
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_organization_context TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_permission TO authenticated;
GRANT EXECUTE ON FUNCTION check_organization_plan_limits TO authenticated;
GRANT EXECUTE ON FUNCTION log_audit_event TO service_role, authenticated;
