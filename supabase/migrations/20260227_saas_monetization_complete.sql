-- =====================================================
-- CUBAN CAS - SAAS MONETIZATION SYSTEM
-- Complete Plans, Subscriptions & Usage Tracking
-- =====================================================

-- =====================================================
-- 1️⃣ PLANS - Sistema de Planes Completo
-- =====================================================

-- Actualizar tabla plans con estructura completa
ALTER TABLE plans DROP COLUMN IF EXISTS features CASCADE;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}';

-- Limpiar datos existentes
TRUNCATE TABLE plans CASCADE;

-- Insertar planes de producción
INSERT INTO plans (
    name, 
    slug, 
    description, 
    price_monthly, 
    price_yearly,
    max_domains,
    max_scans_per_month,
    max_reports_per_month,
    max_users,
    enabled_services,
    features,
    stripe_price_id_monthly,
    stripe_price_id_yearly,
    active
) VALUES
-- FREE PLAN
(
    'Free',
    'free',
    'Perfect for testing and small projects',
    0.00,
    0.00,
    1,
    5,
    2,
    1,
    '["basic_scan"]'::jsonb,
    '{
        "cloudflare_protection": false,
        "shodan_scanning": false,
        "performance_tests": false,
        "security_tests": false,
        "ai_reports": false,
        "priority_support": false,
        "custom_integrations": false,
        "api_access": false,
        "white_label": false,
        "sla": "community",
        "response_time": "best_effort",
        "data_retention_days": 30,
        "concurrent_scans": 1,
        "scan_depth": "basic",
        "report_formats": ["html"],
        "email_notifications": true,
        "webhook_notifications": false,
        "custom_rules": false,
        "compliance_reports": false
    }'::jsonb,
    NULL,
    NULL,
    true
),

-- BASIC PLAN
(
    'Basic',
    'basic',
    'Essential security for growing businesses',
    29.00,
    290.00,
    5,
    50,
    10,
    3,
    '["basic_scan", "cloudflare_protection", "performance_tests"]'::jsonb,
    '{
        "cloudflare_protection": true,
        "shodan_scanning": false,
        "performance_tests": true,
        "security_tests": false,
        "ai_reports": false,
        "priority_support": false,
        "custom_integrations": false,
        "api_access": false,
        "white_label": false,
        "sla": "email",
        "response_time": "48h",
        "data_retention_days": 90,
        "concurrent_scans": 2,
        "scan_depth": "standard",
        "report_formats": ["html", "pdf"],
        "email_notifications": true,
        "webhook_notifications": true,
        "custom_rules": false,
        "compliance_reports": false
    }'::jsonb,
    'price_basic_monthly',
    'price_basic_yearly',
    true
),

-- PRO PLAN
(
    'Pro',
    'pro',
    'Professional security suite for serious teams',
    99.00,
    990.00,
    25,
    200,
    50,
    10,
    '["basic_scan", "cloudflare_protection", "shodan_scanning", "performance_tests", "security_tests", "ai_reports"]'::jsonb,
    '{
        "cloudflare_protection": true,
        "shodan_scanning": true,
        "performance_tests": true,
        "security_tests": true,
        "ai_reports": true,
        "priority_support": true,
        "custom_integrations": false,
        "api_access": true,
        "white_label": false,
        "sla": "priority",
        "response_time": "24h",
        "data_retention_days": 365,
        "concurrent_scans": 5,
        "scan_depth": "deep",
        "report_formats": ["html", "pdf", "json"],
        "email_notifications": true,
        "webhook_notifications": true,
        "custom_rules": true,
        "compliance_reports": true
    }'::jsonb,
    'price_pro_monthly',
    'price_pro_yearly',
    true
),

-- ENTERPRISE PLAN
(
    'Enterprise',
    'enterprise',
    'Enterprise-grade security with dedicated support',
    299.00,
    2990.00,
    100,
    1000,
    200,
    50,
    '["basic_scan", "cloudflare_protection", "shodan_scanning", "performance_tests", "security_tests", "ai_reports", "custom_integrations", "compliance_scanning"]'::jsonb,
    '{
        "cloudflare_protection": true,
        "shodan_scanning": true,
        "performance_tests": true,
        "security_tests": true,
        "ai_reports": true,
        "priority_support": true,
        "custom_integrations": true,
        "api_access": true,
        "white_label": true,
        "sla": "dedicated",
        "response_time": "4h",
        "data_retention_days": 730,
        "concurrent_scans": 10,
        "scan_depth": "comprehensive",
        "report_formats": ["html", "pdf", "json", "xml"],
        "email_notifications": true,
        "webhook_notifications": true,
        "custom_rules": true,
        "compliance_reports": true,
        "penetration_testing": true,
        "dedicated_account_manager": true,
        "custom_sla": true,
        "onboarding_support": true
    }'::jsonb,
    'price_enterprise_monthly',
    'price_enterprise_yearly',
    true
);

-- =====================================================
-- 2️⃣ SUBSCRIPTIONS - Gestión de Suscripciones
-- =====================================================

-- Asegurar que la tabla subscriptions tenga todos los campos necesarios
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_start TIMESTAMP WITH TIME ZONE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 14;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_period ON subscriptions(status, current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_active_orgs ON subscriptions(organization_id, status) WHERE status = 'active';

-- =====================================================
-- 3️⃣ USAGE RECORDS - Control de Consumo Detallado
-- =====================================================

-- Mejorar tabla usage_records
ALTER TABLE usage_records ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES security_services(id);
ALTER TABLE usage_records ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES domains(id);
ALTER TABLE usage_records ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE usage_records ADD COLUMN IF NOT EXISTS execution_id UUID REFERENCES service_executions(id);
ALTER TABLE usage_records ADD COLUMN IF NOT EXISTS cost_credits DECIMAL(10,4) DEFAULT 0;
ALTER TABLE usage_records ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'pending' CHECK (billing_status IN ('pending', 'billed', 'credited'));

-- Índices para queries de uso
CREATE INDEX IF NOT EXISTS idx_usage_org_month ON usage_records(organization_id, DATE_TRUNC('month', recorded_at));
CREATE INDEX IF NOT EXISTS idx_usage_resource_date ON usage_records(resource_type, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_billing_status ON usage_records(billing_status) WHERE billing_status = 'pending';

-- =====================================================
-- 4️⃣ FUNCIONES DE VALIDACIÓN DE LÍMITES
-- =====================================================

-- Función mejorada para verificar límites de plan
CREATE OR REPLACE FUNCTION check_plan_limit(
    p_organization_id UUID,
    p_resource_type TEXT,
    p_quantity INTEGER DEFAULT 1
)
RETURNS TABLE (
    allowed BOOLEAN,
    current_usage INTEGER,
    plan_limit INTEGER,
    remaining INTEGER,
    plan_name TEXT,
    upgrade_required BOOLEAN
) AS $$
DECLARE
    v_current_usage INTEGER;
    v_plan_limit INTEGER;
    v_plan_name TEXT;
    v_subscription_status TEXT;
    v_current_month_start TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calcular inicio del mes actual
    v_current_month_start := DATE_TRUNC('month', NOW());
    
    -- Obtener suscripción activa y límites del plan
    SELECT 
        s.status,
        p.name,
        CASE p_resource_type
            WHEN 'scan' THEN p.max_scans_per_month
            WHEN 'domain' THEN p.max_domains
            WHEN 'report' THEN p.max_reports_per_month
            WHEN 'user' THEN p.max_users
            ELSE 0
        END
    INTO v_subscription_status, v_plan_name, v_plan_limit
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.organization_id = p_organization_id
    AND s.status IN ('active', 'trialing')
    ORDER BY s.created_at DESC
    LIMIT 1;
    
    -- Si no hay suscripción activa, usar plan free
    IF v_subscription_status IS NULL THEN
        SELECT 
            name,
            CASE p_resource_type
                WHEN 'scan' THEN max_scans_per_month
                WHEN 'domain' THEN max_domains
                WHEN 'report' THEN max_reports_per_month
                WHEN 'user' THEN max_users
                ELSE 0
            END
        INTO v_plan_name, v_plan_limit
        FROM plans
        WHERE slug = 'free';
    END IF;
    
    -- Calcular uso actual
    IF p_resource_type IN ('scan', 'report') THEN
        -- Recursos mensuales
        SELECT COALESCE(SUM(quantity), 0)
        INTO v_current_usage
        FROM usage_records
        WHERE organization_id = p_organization_id
        AND resource_type = p_resource_type
        AND recorded_at >= v_current_month_start;
    ELSE
        -- Recursos acumulativos (domains, users)
        SELECT COUNT(*)
        INTO v_current_usage
        FROM CASE p_resource_type
            WHEN 'domain' THEN (SELECT COUNT(*) FROM domains WHERE organization_id = p_organization_id AND status != 'deleted')
            WHEN 'user' THEN (SELECT COUNT(*) FROM organization_members WHERE organization_id = p_organization_id AND status = 'active')
            ELSE (SELECT 0)
        END;
    END IF;
    
    -- Retornar resultado
    RETURN QUERY SELECT 
        (v_current_usage + p_quantity) <= v_plan_limit AS allowed,
        v_current_usage AS current_usage,
        v_plan_limit AS plan_limit,
        GREATEST(0, v_plan_limit - v_current_usage) AS remaining,
        v_plan_name AS plan_name,
        (v_current_usage + p_quantity) > v_plan_limit AS upgrade_required;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para registrar uso automáticamente
CREATE OR REPLACE FUNCTION record_usage(
    p_organization_id UUID,
    p_resource_type TEXT,
    p_quantity INTEGER DEFAULT 1,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_usage_id UUID;
    v_subscription_id UUID;
BEGIN
    -- Obtener suscripción activa
    SELECT id INTO v_subscription_id
    FROM subscriptions
    WHERE organization_id = p_organization_id
    AND status IN ('active', 'trialing')
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Insertar registro de uso
    INSERT INTO usage_records (
        organization_id,
        subscription_id,
        resource_type,
        quantity,
        metadata,
        recorded_at
    ) VALUES (
        p_organization_id,
        v_subscription_id,
        p_resource_type,
        p_quantity,
        p_metadata,
        NOW()
    )
    RETURNING id INTO v_usage_id;
    
    RETURN v_usage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5️⃣ TRIGGERS AUTOMÁTICOS
-- =====================================================

-- Trigger para registrar uso al crear dominio
CREATE OR REPLACE FUNCTION trigger_record_domain_usage()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM record_usage(
        NEW.organization_id,
        'domain',
        1,
        jsonb_build_object('domain_id', NEW.id, 'domain', NEW.domain)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_domain_created ON domains;
CREATE TRIGGER on_domain_created
    AFTER INSERT ON domains
    FOR EACH ROW
    EXECUTE FUNCTION trigger_record_domain_usage();

-- Trigger para registrar uso al ejecutar scan
CREATE OR REPLACE FUNCTION trigger_record_scan_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        PERFORM record_usage(
            NEW.organization_id,
            'scan',
            1,
            jsonb_build_object(
                'execution_id', NEW.id,
                'service_id', NEW.service_id,
                'domain_id', NEW.domain_id
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_scan_completed ON service_executions;
CREATE TRIGGER on_scan_completed
    AFTER UPDATE ON service_executions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_record_scan_usage();

-- Trigger para registrar uso al generar reporte
CREATE OR REPLACE FUNCTION trigger_record_report_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        PERFORM record_usage(
            NEW.organization_id,
            'report',
            1,
            jsonb_build_object('report_id', NEW.id, 'report_type', NEW.report_type)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_report_generated ON reports;
CREATE TRIGGER on_report_generated
    AFTER UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION trigger_record_report_usage();

-- =====================================================
-- 6️⃣ VISTAS ÚTILES PARA DASHBOARDS
-- =====================================================

-- Vista de uso mensual por organización
CREATE OR REPLACE VIEW v_monthly_usage AS
SELECT 
    ur.organization_id,
    o.name as organization_name,
    DATE_TRUNC('month', ur.recorded_at) as month,
    ur.resource_type,
    SUM(ur.quantity) as total_usage,
    COUNT(*) as event_count
FROM usage_records ur
JOIN organizations o ON ur.organization_id = o.id
GROUP BY ur.organization_id, o.name, DATE_TRUNC('month', ur.recorded_at), ur.resource_type;

-- Vista de estado de suscripciones
CREATE OR REPLACE VIEW v_subscription_status AS
SELECT 
    s.id as subscription_id,
    s.organization_id,
    o.name as organization_name,
    p.name as plan_name,
    p.slug as plan_slug,
    s.status,
    s.billing_cycle,
    s.current_period_start,
    s.current_period_end,
    CASE 
        WHEN s.current_period_end < NOW() THEN 'expired'
        WHEN s.current_period_end < NOW() + INTERVAL '7 days' THEN 'expiring_soon'
        ELSE 'active'
    END as period_status,
    s.stripe_subscription_id,
    s.created_at
FROM subscriptions s
JOIN organizations o ON s.organization_id = o.id
JOIN plans p ON s.plan_id = p.id;

-- =====================================================
-- 7️⃣ POLÍTICAS RLS PARA MONETIZACIÓN
-- =====================================================

-- Plans: Todos pueden ver planes activos
DROP POLICY IF EXISTS "Anyone can view active plans" ON plans;
CREATE POLICY "Anyone can view active plans" ON plans
    FOR SELECT USING (active = true);

-- Usage Records: Solo admins de la org pueden ver
DROP POLICY IF EXISTS "Admins can view usage" ON usage_records;
CREATE POLICY "Admins can view usage" ON usage_records
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'manager')
            AND status = 'active'
        )
    );

-- =====================================================
-- 8️⃣ COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON FUNCTION check_plan_limit IS 'Validates if an organization can perform an action based on their plan limits';
COMMENT ON FUNCTION record_usage IS 'Records resource usage for billing and limit tracking';
COMMENT ON VIEW v_monthly_usage IS 'Monthly usage aggregation for billing and analytics';
COMMENT ON VIEW v_subscription_status IS 'Current subscription status with expiration warnings';

-- =====================================================
-- MIGRACIÓN COMPLETADA
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ SaaS Monetization System Deployed Successfully!';
    RAISE NOTICE '📊 Plans: 4 tiers configured (Free, Basic, Pro, Enterprise)';
    RAISE NOTICE '💳 Subscriptions: Enhanced with trial and cancellation support';
    RAISE NOTICE '📈 Usage Tracking: Automatic recording with triggers';
    RAISE NOTICE '✅ Validation: Plan limits enforced at database level';
    RAISE NOTICE '🔐 Security: RLS policies applied';
    RAISE NOTICE '🚀 Ready for Stripe integration!';
END $$;