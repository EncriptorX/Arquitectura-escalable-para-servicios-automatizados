-- =====================================================
-- CUBAN CAS - HARDCORE SECURITY ARCHITECTURE
-- Multi-tenant SaaS with Row Level Security
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. ORGANIZATIONS (Core Multi-tenant Entity)
-- =====================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    domain TEXT,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro', 'enterprise')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'canceled')),
    
    -- Billing info
    stripe_customer_id TEXT UNIQUE,
    billing_email TEXT,
    
    -- Security settings
    settings JSONB DEFAULT '{}',
    security_config JSONB DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_stripe ON organizations(stripe_customer_id);

-- =====================================================
-- 2. PROFILES (Extends auth.users)
-- =====================================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    
    -- Security preferences
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    security_notifications BOOLEAN DEFAULT TRUE,
    
    -- Audit fields
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. ORGANIZATION_MEMBERS (Multi-tenant Access Control)
-- =====================================================

CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Role-based access control
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'analyst', 'viewer')),
    
    -- Granular permissions (JSON array)
    permissions JSONB DEFAULT '[]',
    
    -- Member status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'invited')),
    
    -- Invitation tracking
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique membership per organization
    UNIQUE (organization_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX idx_org_members_role ON organization_members(role);

-- =====================================================
-- 4. PLANS (Service Plans Definition)
-- =====================================================

CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    
    -- Pricing
    price_monthly DECIMAL(10,2) DEFAULT 0,
    price_yearly DECIMAL(10,2) DEFAULT 0,
    
    -- Limits and features
    max_domains INTEGER DEFAULT 1,
    max_scans_per_month INTEGER DEFAULT 10,
    max_reports_per_month INTEGER DEFAULT 5,
    max_users INTEGER DEFAULT 1,
    
    -- Available services (JSON array)
    enabled_services JSONB DEFAULT '[]',
    
    -- Plan features
    features JSONB DEFAULT '{}',
    
    -- Stripe integration
    stripe_price_id_monthly TEXT,
    stripe_price_id_yearly TEXT,
    
    -- Status
    active BOOLEAN DEFAULT TRUE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default plans
INSERT INTO plans (name, slug, description, price_monthly, price_yearly, max_domains, max_scans_per_month, max_reports_per_month, max_users, enabled_services, features) VALUES
('Free', 'free', 'Basic security scanning', 0, 0, 1, 5, 2, 1, '["basic_scan"]', '{"support": "community"}'),
('Basic', 'basic', 'Enhanced security features', 29, 290, 5, 50, 10, 5, '["basic_scan", "vulnerability_scan"]', '{"support": "email", "sla": "48h"}'),
('Pro', 'pro', 'Professional security suite', 99, 990, 25, 200, 50, 25, '["basic_scan", "vulnerability_scan", "performance_test", "security_test"]', '{"support": "priority", "sla": "24h", "custom_reports": true}'),
('Enterprise', 'enterprise', 'Enterprise-grade security', 299, 2990, 100, 1000, 200, 100, '["basic_scan", "vulnerability_scan", "performance_test", "security_test", "compliance_scan", "penetration_test"]', '{"support": "dedicated", "sla": "4h", "custom_reports": true, "api_access": true, "sso": true}');

-- =====================================================
-- 5. SUBSCRIPTIONS (Billing Management)
-- =====================================================

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id),
    
    -- Subscription details
    status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing')),
    billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    
    -- Stripe integration
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    
    -- Billing periods
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_subscriptions_org_id ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

-- =====================================================
-- 6. DOMAINS (Customer Assets)
-- =====================================================

CREATE TABLE domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Domain info
    domain TEXT NOT NULL,
    subdomain TEXT,
    
    -- Status and configuration
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'error')),
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
    
    -- Security configuration
    security_config JSONB DEFAULT '{}',
    
    -- Cloudflare integration
    cloudflare_zone_id TEXT,
    cloudflare_dns_record_id TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique domain per organization
    UNIQUE (organization_id, domain, subdomain)
);

-- Indexes
CREATE INDEX idx_domains_org_id ON domains(organization_id);
CREATE INDEX idx_domains_domain ON domains(domain);
CREATE INDEX idx_domains_status ON domains(status);

-- =====================================================
-- 7. SECURITY_SERVICES (Available Services)
-- =====================================================

CREATE TABLE security_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Service definition
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    service_type TEXT NOT NULL CHECK (service_type IN ('perimeter', 'vulnerability', 'performance', 'security', 'compliance')),
    
    -- Configuration
    default_config JSONB DEFAULT '{}',
    required_permissions JSONB DEFAULT '[]',
    
    -- Pricing and limits
    cost_per_execution DECIMAL(10,4) DEFAULT 0,
    execution_time_limit INTEGER DEFAULT 300, -- seconds
    
    -- Status
    active BOOLEAN DEFAULT TRUE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default services
INSERT INTO security_services (name, slug, description, service_type, default_config, required_permissions) VALUES
('Perimeter Protection', 'perimeter_protection', 'Cloudflare-based perimeter security', 'perimeter', '{"waf": true, "ddos": true}', '["execute_scans"]'),
('Vulnerability Scan', 'vulnerability_scan', 'Comprehensive vulnerability assessment', 'vulnerability', '{"depth": "standard", "timeout": 300}', '["execute_scans"]'),
('Performance Test', 'performance_test', 'Load and performance testing', 'performance', '{"duration": 60, "concurrent_users": 10}', '["execute_scans"]'),
('Security Test', 'security_test', 'Automated security testing suite', 'security', '{"test_suite": "owasp_top10"}', '["execute_scans"]'),
('Compliance Scan', 'compliance_scan', 'Regulatory compliance assessment', 'compliance', '{"standards": ["pci", "gdpr"]}', '["execute_scans", "generate_reports"]');

-- =====================================================
-- 8. SERVICE_EXECUTIONS (Execution History)
-- =====================================================

CREATE TABLE service_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES security_services(id),
    
    -- Execution details
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'canceled')),
    config JSONB DEFAULT '{}',
    results JSONB,
    error_message TEXT,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    execution_time_seconds INTEGER,
    
    -- Triggering info
    triggered_by TEXT NOT NULL CHECK (triggered_by IN ('manual', 'schedule', 'api', 'retry')),
    triggered_by_user_id UUID REFERENCES auth.users(id),
    parent_execution_id UUID REFERENCES service_executions(id),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_executions_org_id ON service_executions(organization_id);
CREATE INDEX idx_executions_domain_id ON service_executions(domain_id);
CREATE INDEX idx_executions_status ON service_executions(status);
CREATE INDEX idx_executions_created_at ON service_executions(created_at DESC);

-- =====================================================
-- 9. REPORTS (AI-Generated Reports)
-- =====================================================

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
    
    -- Report details
    title TEXT NOT NULL,
    report_type TEXT NOT NULL CHECK (report_type IN ('security', 'vulnerability', 'performance', 'compliance', 'comprehensive')),
    format TEXT NOT NULL DEFAULT 'pdf' CHECK (format IN ('pdf', 'html', 'json')),
    
    -- Content
    summary TEXT,
    findings JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    
    -- Generation info
    status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
    generated_by_ai BOOLEAN DEFAULT TRUE,
    file_url TEXT,
    file_size INTEGER,
    
    -- Timing
    generated_at TIMESTAMP WITH TIME ZONE,
    regenerated_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reports_org_id ON reports(organization_id);
CREATE INDEX idx_reports_domain_id ON reports(domain_id);
CREATE INDEX idx_reports_type ON reports(report_type);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);

-- =====================================================
-- 10. USAGE_RECORDS (Billing and Limits Tracking)
-- =====================================================

CREATE TABLE usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    
    -- Usage details
    resource_type TEXT NOT NULL CHECK (resource_type IN ('scan', 'report', 'domain', 'user', 'api_call')),
    quantity INTEGER NOT NULL DEFAULT 1,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timing
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for billing queries
CREATE INDEX idx_usage_org_id ON usage_records(organization_id);
CREATE INDEX idx_usage_recorded_at ON usage_records(recorded_at);
CREATE INDEX idx_usage_resource_type ON usage_records(resource_type);

-- =====================================================
-- 11. INVOICES (Billing History)
-- =====================================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    
    -- Invoice details
    stripe_invoice_id TEXT UNIQUE,
    invoice_number TEXT,
    
    -- Amounts (in cents)
    amount_due INTEGER NOT NULL,
    amount_paid INTEGER DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    
    -- Status
    status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
    
    -- Periods
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    
    -- Payment info
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_invoices_org_id ON invoices(organization_id);
CREATE INDEX idx_invoices_stripe_id ON invoices(stripe_invoice_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- =====================================================
-- 12. NOTIFICATIONS (System Notifications)
-- =====================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = org-wide
    
    -- Notification content
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
    category TEXT CHECK (category IN ('security', 'billing', 'system', 'report')),
    
    -- Delivery
    delivery_method TEXT NOT NULL DEFAULT 'in_app' CHECK (delivery_method IN ('in_app', 'email', 'both')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'read', 'failed')),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timing
    read_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_org_id ON notifications(organization_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) - HARDCORE SECURITY 🔐
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - BULLETPROOF SECURITY 🛡️
-- =====================================================

-- PROFILES: Users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- ORGANIZATION_MEMBERS: Users can only see their own memberships
CREATE POLICY "Users can view their memberships" ON organization_members
    FOR SELECT USING (user_id = auth.uid());

-- ORGANIZATIONS: Users can only see organizations they belong to
CREATE POLICY "Users can view their organizations" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Admins can update their organizations" ON organizations
    FOR UPDATE USING (
        id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND role = 'admin' 
            AND status = 'active'
        )
    );

-- PLANS: Everyone can view active plans (for pricing page)
CREATE POLICY "Anyone can view active plans" ON plans
    FOR SELECT USING (active = true);

-- SUBSCRIPTIONS: Organization members can view, admins can manage
CREATE POLICY "Organization members can view subscriptions" ON subscriptions
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Admins can manage subscriptions" ON subscriptions
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'manager') 
            AND status = 'active'
        )
    );

-- DOMAINS: Organization members can view, admins/managers can manage
CREATE POLICY "Organization members can view domains" ON domains
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Admins can manage domains" ON domains
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'manager') 
            AND status = 'active'
        )
    );

-- SECURITY_SERVICES: Everyone can view active services
CREATE POLICY "Anyone can view active services" ON security_services
    FOR SELECT USING (active = true);

-- SERVICE_EXECUTIONS: Organization members can view, analysts+ can execute
CREATE POLICY "Organization members can view executions" ON service_executions
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Analysts can execute services" ON service_executions
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'manager', 'analyst') 
            AND status = 'active'
        )
    );

-- REPORTS: Organization members can view, analysts+ can generate
CREATE POLICY "Organization members can view reports" ON reports
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Analysts can generate reports" ON reports
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'manager', 'analyst') 
            AND status = 'active'
        )
    );

-- USAGE_RECORDS: Organization members can view their usage
CREATE POLICY "Organization members can view usage" ON usage_records
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- INVOICES: Organization members can view invoices
CREATE POLICY "Organization members can view invoices" ON invoices
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- NOTIFICATIONS: Users can view their notifications
CREATE POLICY "Users can view their notifications" ON notifications
    FOR SELECT USING (
        (user_id = auth.uid()) OR 
        (user_id IS NULL AND organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        ))
    );

CREATE POLICY "Users can update their notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- =====================================================
-- TRIGGERS AND FUNCTIONS 🔧
-- =====================================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    org_id UUID;
BEGIN
    -- Create user profile
    INSERT INTO profiles (id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'));
    
    -- Create organization for new user
    INSERT INTO organizations (name, slug)
    VALUES (
        COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Organization'),
        LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'company_name', 'org-' || SUBSTRING(NEW.id::text, 1, 8)), ' ', '-'))
    )
    RETURNING id INTO org_id;
    
    -- Add user as admin of their organization
    INSERT INTO organization_members (organization_id, user_id, role, status)
    VALUES (org_id, NEW.id, 'admin', 'active');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all relevant tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON organization_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_domains_updated_at BEFORE UPDATE ON domains
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_executions_updated_at BEFORE UPDATE ON service_executions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- UTILITY FUNCTIONS 🛠️
-- =====================================================

-- Function to check plan limits
CREATE OR REPLACE FUNCTION check_plan_limits(
    org_id UUID,
    resource_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    current_usage INTEGER;
    plan_limit INTEGER;
    current_month_start DATE;
BEGIN
    -- Get current month start
    current_month_start := DATE_TRUNC('month', NOW());
    
    -- Get current usage for this month
    SELECT COALESCE(SUM(quantity), 0)
    INTO current_usage
    FROM usage_records
    WHERE organization_id = org_id
    AND resource_type = check_plan_limits.resource_type
    AND recorded_at >= current_month_start;
    
    -- Get plan limit
    SELECT 
        CASE check_plan_limits.resource_type
            WHEN 'scan' THEN p.max_scans_per_month
            WHEN 'report' THEN p.max_reports_per_month
            WHEN 'domain' THEN p.max_domains
            WHEN 'user' THEN p.max_users
            ELSE 0
        END
    INTO plan_limit
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.organization_id = org_id
    AND s.status = 'active';
    
    -- Return true if under limit
    RETURN current_usage < COALESCE(plan_limit, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's organization context
CREATE OR REPLACE FUNCTION get_user_organization_context(user_uuid UUID)
RETURNS TABLE (
    organization_id UUID,
    organization_name TEXT,
    user_role TEXT,
    permissions JSONB,
    plan_slug TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        om.role,
        om.permissions,
        p.slug
    FROM organization_members om
    JOIN organizations o ON om.organization_id = o.id
    LEFT JOIN subscriptions s ON o.id = s.organization_id AND s.status = 'active'
    LEFT JOIN plans p ON s.plan_id = p.id
    WHERE om.user_id = user_uuid
    AND om.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INITIAL DATA SETUP 📊
-- =====================================================

-- Create system notification for new organizations
CREATE OR REPLACE FUNCTION create_welcome_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (
        organization_id,
        subject,
        body,
        type,
        category,
        delivery_method
    ) VALUES (
        NEW.id,
        'Welcome to Cuban CAS Platform!',
        'Your organization has been successfully created. Start by adding your first domain and running a security scan.',
        'success',
        'system',
        'in_app'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for welcome notification
CREATE TRIGGER on_organization_created
    AFTER INSERT ON organizations
    FOR EACH ROW EXECUTE FUNCTION create_welcome_notification();

-- =====================================================
-- SECURITY AUDIT LOG 📋
-- =====================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES auth.users(id),
    
    -- Action details
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for audit queries
CREATE INDEX idx_audit_logs_org_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Enable RLS on audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit logs policy - only admins can view
CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND role = 'admin' 
            AND status = 'active'
        )
    );

-- =====================================================
-- PERFORMANCE OPTIMIZATIONS 🚀
-- =====================================================

-- Composite indexes for common queries
CREATE INDEX idx_org_members_org_user ON organization_members(organization_id, user_id);
CREATE INDEX idx_executions_org_status ON service_executions(organization_id, status);
CREATE INDEX idx_reports_org_type ON reports(organization_id, report_type);
CREATE INDEX idx_usage_org_month ON usage_records(organization_id, recorded_at);

-- Partial indexes for active records
CREATE INDEX idx_active_subscriptions ON subscriptions(organization_id) WHERE status = 'active';
CREATE INDEX idx_active_domains ON domains(organization_id) WHERE status = 'active';
CREATE INDEX idx_pending_executions ON service_executions(organization_id) WHERE status IN ('pending', 'running');

-- =====================================================
-- MIGRATION COMPLETE ✅
-- =====================================================

-- Add comment to track migration
COMMENT ON SCHEMA public IS 'Cuban CAS Platform - Hardcore Security Architecture v1.0';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '🔥 HARDCORE SECURITY ARCHITECTURE DEPLOYED SUCCESSFULLY! 🔥';
    RAISE NOTICE '✅ Multi-tenant structure created';
    RAISE NOTICE '✅ Row Level Security enabled';
    RAISE NOTICE '✅ Bulletproof policies implemented';
    RAISE NOTICE '✅ Audit logging configured';
    RAISE NOTICE '✅ Performance optimizations applied';
    RAISE NOTICE '🚀 Ready for enterprise-grade cybersecurity operations!';
END $$;