-- =====================================================
-- CAS (Cybersecurity as a Service) - Complete Schema
-- Multi-tenant SaaS Platform
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. ORGANIZATIONS & USERS
-- =====================================================

-- Organizations (Tenants)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255),
    plan_id UUID,
    subscription_status VARCHAR(50) DEFAULT 'trial',
    trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Billing info
    stripe_customer_id VARCHAR(255) UNIQUE,
    billing_email VARCHAR(255),
    
    -- Settings
    settings JSONB DEFAULT '{}',
    
    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'analyst',
    
    -- Permissions
    permissions JSONB DEFAULT '[]',
    
    -- Status
    status VARCHAR(50) DEFAULT 'active',
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. PLANS & SUBSCRIPTIONS
-- =====================================================

-- Service plans
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2),
    price_yearly DECIMAL(10,2),
    
    -- Limits
    max_domains INTEGER DEFAULT 1,
    max_scans_per_month INTEGER DEFAULT 10,
    scan_frequency_hours INTEGER DEFAULT 24,
    
    -- Features
    features JSONB DEFAULT '[]',
    enabled_services JSONB DEFAULT '[]',
    
    -- Stripe integration
    stripe_price_id_monthly VARCHAR(255),
    stripe_price_id_yearly VARCHAR(255),
    
    -- Status
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES plans(id),
    
    -- Stripe data
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255),
    
    -- Status
    status VARCHAR(50) DEFAULT 'active',
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    
    -- Dates
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    
    -- Usage tracking
    usage_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. DOMAINS & ASSETS
-- =====================================================

-- Monitored domains
CREATE TABLE domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    subdomain VARCHAR(255),
    
    -- Configuration
    monitoring_enabled BOOLEAN DEFAULT true,
    scan_frequency_hours INTEGER DEFAULT 24,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active',
    last_scan_at TIMESTAMP WITH TIME ZONE,
    next_scan_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    dns_records JSONB DEFAULT '{}',
    ssl_info JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, domain, subdomain)
);

-- =====================================================
-- 4. SECURITY SERVICES
-- =====================================================

-- Service definitions
CREATE TABLE security_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    service_type VARCHAR(50) NOT NULL, -- 'perimeter', 'vulnerability', 'performance', 'security_test'
    
    -- Configuration
    default_config JSONB DEFAULT '{}',
    required_plan_features JSONB DEFAULT '[]',
    
    -- Status
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service executions
CREATE TABLE service_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
    service_id UUID REFERENCES security_services(id),
    
    -- Execution details
    status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed, cancelled
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Configuration used
    config JSONB DEFAULT '{}',
    
    -- Results
    results JSONB DEFAULT '{}',
    error_message TEXT,
    
    -- Metadata
    execution_time_seconds INTEGER,
    triggered_by VARCHAR(50) DEFAULT 'scheduled', -- scheduled, manual, api
    triggered_by_user_id UUID REFERENCES user_profiles(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. REPORTS & ANALYTICS
-- =====================================================

-- Generated reports
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
    
    -- Report details
    title VARCHAR(255) NOT NULL,
    report_type VARCHAR(50) NOT NULL, -- 'security', 'performance', 'vulnerability', 'comprehensive'
    format VARCHAR(20) DEFAULT 'pdf', -- pdf, html, json
    
    -- Generation
    status VARCHAR(50) DEFAULT 'generating', -- generating, completed, failed
    generated_by_ai BOOLEAN DEFAULT true,
    
    -- Content
    summary TEXT,
    findings JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    
    -- Files
    file_url TEXT,
    file_size_bytes INTEGER,
    
    -- Sharing
    shared_publicly BOOLEAN DEFAULT false,
    share_token VARCHAR(255) UNIQUE,
    
    -- Metadata
    generated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. USAGE & BILLING
-- =====================================================

-- Usage tracking
CREATE TABLE usage_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    
    -- Usage details
    resource_type VARCHAR(50) NOT NULL, -- 'scan', 'report', 'api_call', 'storage'
    quantity INTEGER DEFAULT 1,
    unit VARCHAR(20) DEFAULT 'count',
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    billing_period_start TIMESTAMP WITH TIME ZONE,
    billing_period_end TIMESTAMP WITH TIME ZONE
);

-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    
    -- Stripe data
    stripe_invoice_id VARCHAR(255) UNIQUE,
    
    -- Invoice details
    invoice_number VARCHAR(100) UNIQUE,
    amount_due DECIMAL(10,2),
    amount_paid DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- draft, open, paid, void, uncollectible
    
    -- Dates
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. NOTIFICATIONS & ALERTS
-- =====================================================

-- Notification templates
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'email', 'webhook', 'in_app'
    trigger_event VARCHAR(100) NOT NULL,
    
    -- Template content
    subject VARCHAR(255),
    body_template TEXT,
    
    -- Configuration
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sent notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id),
    template_id UUID REFERENCES notification_templates(id),
    
    -- Content
    subject VARCHAR(255),
    body TEXT,
    type VARCHAR(50) NOT NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed, read
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. SYSTEM CONFIGURATION
-- =====================================================

-- System settings
CREATE TABLE system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES user_profiles(id)
);

-- API keys and integrations
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    service_name VARCHAR(100) NOT NULL,
    
    -- Credentials (encrypted)
    api_key_encrypted TEXT,
    config JSONB DEFAULT '{}',
    
    -- Status
    active BOOLEAN DEFAULT true,
    last_tested_at TIMESTAMP WITH TIME ZONE,
    test_status VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 9. INDEXES FOR PERFORMANCE
-- =====================================================

-- Organizations
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_stripe_customer ON organizations(stripe_customer_id);

-- User profiles
CREATE INDEX idx_user_profiles_org ON user_profiles(organization_id);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);

-- Subscriptions
CREATE INDEX idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Domains
CREATE INDEX idx_domains_org ON domains(organization_id);
CREATE INDEX idx_domains_domain ON domains(domain);
CREATE INDEX idx_domains_next_scan ON domains(next_scan_at) WHERE monitoring_enabled = true;

-- Service executions
CREATE INDEX idx_executions_org ON service_executions(organization_id);
CREATE INDEX idx_executions_domain ON service_executions(domain_id);
CREATE INDEX idx_executions_status ON service_executions(status);
CREATE INDEX idx_executions_created ON service_executions(created_at);

-- Reports
CREATE INDEX idx_reports_org ON reports(organization_id);
CREATE INDEX idx_reports_domain ON reports(domain_id);
CREATE INDEX idx_reports_type ON reports(report_type);
CREATE INDEX idx_reports_created ON reports(created_at);

-- Usage records
CREATE INDEX idx_usage_org ON usage_records(organization_id);
CREATE INDEX idx_usage_period ON usage_records(billing_period_start, billing_period_end);
CREATE INDEX idx_usage_recorded ON usage_records(recorded_at);

-- Notifications
CREATE INDEX idx_notifications_org ON notifications(organization_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);

-- =====================================================
-- 10. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tenant tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Organization members can view profiles" ON user_profiles
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    );

-- RLS Policies for organizations
CREATE POLICY "Users can view own organization" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    );

-- RLS Policies for domains
CREATE POLICY "Organization members can manage domains" ON domains
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    );

-- RLS Policies for service_executions
CREATE POLICY "Organization members can view executions" ON service_executions
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    );

-- RLS Policies for reports
CREATE POLICY "Organization members can view reports" ON reports
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    );

-- RLS Policies for usage_records
CREATE POLICY "Organization members can view usage" ON usage_records
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    );

-- =====================================================
-- 11. INITIAL DATA
-- =====================================================

-- Insert default plans
INSERT INTO plans (name, slug, description, price_monthly, price_yearly, max_domains, max_scans_per_month, features, enabled_services) VALUES
('Free', 'free', 'Basic security monitoring for small projects', 0, 0, 1, 5, 
 '["Basic vulnerability scan", "Monthly reports"]',
 '["perimeter_protection", "basic_vulnerability_scan"]'),
 
('Basic', 'basic', 'Essential security for growing businesses', 29, 290, 5, 50,
 '["Advanced vulnerability scan", "Weekly reports", "Email alerts"]',
 '["perimeter_protection", "vulnerability_scan", "performance_test"]'),
 
('Pro', 'pro', 'Comprehensive security for professional teams', 99, 990, 25, 200,
 '["Full security suite", "Daily reports", "API access", "Custom integrations"]',
 '["perimeter_protection", "vulnerability_scan", "performance_test", "security_test", "ai_reports"]'),
 
('Enterprise', 'enterprise', 'Advanced security for large organizations', 299, 2990, 100, 1000,
 '["White-label reports", "Dedicated support", "Custom SLA", "Advanced analytics"]',
 '["perimeter_protection", "vulnerability_scan", "performance_test", "security_test", "ai_reports", "custom_integrations"]');

-- Insert default security services
INSERT INTO security_services (name, slug, description, service_type, default_config) VALUES
('Perimeter Protection', 'perimeter_protection', 'Automated Cloudflare security configuration', 'perimeter', 
 '{"ssl_mode": "strict", "waf_enabled": true, "ddos_protection": true}'),
 
('Vulnerability Scan', 'vulnerability_scan', 'Comprehensive vulnerability assessment using Shodan', 'vulnerability',
 '{"scan_depth": "standard", "include_subdomains": true}'),
 
('Performance Test', 'performance_test', 'Automated performance and load testing', 'performance',
 '{"test_duration": 60, "concurrent_users": 10}'),
 
('Security Test', 'security_test', 'Automated security testing with Cypress', 'security_test',
 '{"test_suite": "standard", "include_owasp": true}');

-- Insert notification templates
INSERT INTO notification_templates (name, type, trigger_event, subject, body_template) VALUES
('Scan Completed', 'email', 'scan_completed', 'Security Scan Completed for {{domain}}', 
 'Your security scan for {{domain}} has been completed. {{findings_count}} findings were discovered.'),
 
('Vulnerability Alert', 'email', 'vulnerability_found', 'Critical Vulnerability Detected on {{domain}}',
 'A critical vulnerability has been detected on {{domain}}. Immediate attention required.'),
 
('Payment Failed', 'email', 'payment_failed', 'Payment Failed - Action Required',
 'Your payment for {{plan_name}} has failed. Please update your payment method.'),
 
('Trial Ending', 'email', 'trial_ending', 'Your Trial is Ending Soon',
 'Your trial period ends in {{days_remaining}} days. Upgrade now to continue service.');

-- Insert system settings
INSERT INTO system_settings (key, value, description) VALUES
('max_file_size_mb', '50', 'Maximum file size for uploads in MB'),
('report_retention_days', '365', 'Number of days to retain reports'),
('scan_timeout_minutes', '30', 'Maximum time for a scan to complete'),
('ai_report_enabled', 'true', 'Enable AI-generated reports'),
('email_notifications_enabled', 'true', 'Enable email notifications');

-- =====================================================
-- 12. FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_domains_updated_at BEFORE UPDATE ON domains
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate next scan time
CREATE OR REPLACE FUNCTION calculate_next_scan_time(frequency_hours INTEGER)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    RETURN NOW() + (frequency_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Function to check plan limits
CREATE OR REPLACE FUNCTION check_plan_limits(org_id UUID, resource_type VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    current_usage INTEGER;
    plan_limit INTEGER;
    current_month_start TIMESTAMP WITH TIME ZONE;
    current_month_end TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate current month boundaries
    current_month_start := DATE_TRUNC('month', NOW());
    current_month_end := current_month_start + INTERVAL '1 month';
    
    -- Get current usage for this month
    SELECT COUNT(*) INTO current_usage
    FROM usage_records ur
    JOIN subscriptions s ON ur.subscription_id = s.id
    WHERE ur.organization_id = org_id 
    AND ur.resource_type = resource_type
    AND ur.recorded_at >= current_month_start
    AND ur.recorded_at < current_month_end;
    
    -- Get plan limit
    SELECT 
        CASE 
            WHEN resource_type = 'scan' THEN p.max_scans_per_month
            WHEN resource_type = 'domain' THEN p.max_domains
            WHEN resource_type = 'report' THEN COALESCE((p.features->>'max_reports_per_month')::INTEGER, 50)
            ELSE 999999
        END INTO plan_limit
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.organization_id = org_id
    AND s.status = 'active'
    LIMIT 1;
    
    -- If no active subscription, use free plan limits
    IF plan_limit IS NULL THEN
        CASE 
            WHEN resource_type = 'scan' THEN plan_limit := 5;
            WHEN resource_type = 'domain' THEN plan_limit := 1;
            WHEN resource_type = 'report' THEN plan_limit := 2;
            ELSE plan_limit := 10;
        END CASE;
    END IF;
    
    RETURN current_usage < plan_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON DATABASE postgres IS 'CAS (Cybersecurity as a Service) - Complete SaaS Platform Schema';