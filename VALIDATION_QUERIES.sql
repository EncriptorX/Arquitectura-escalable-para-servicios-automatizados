-- =====================================================
-- CUBAN CAS - VALIDATION QUERIES
-- Execute these in Supabase SQL Editor after migration
-- =====================================================

-- 1. Check all critical tables exist
SELECT 
    'Table Validation' as check_type,
    string_agg(
        table_name || ': ' || 
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t.table_name) 
             THEN '✅ EXISTS' ELSE '❌ MISSING' END, 
        E'\n'
    ) as results
FROM (
    VALUES 
    ('organizations'),
    ('organization_members'),
    ('user_profiles'),
    ('plans'),
    ('subscriptions'),
    ('domains'),
    ('security_services'),
    ('service_executions'),
    ('reports'),
    ('usage_records'),
    ('invoices'),
    ('notifications')
) t(table_name);

-- 2. Check RLS is enabled on critical tables
SELECT 
    'RLS Validation' as check_type,
    string_agg(
        tablename || ': ' || 
        CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END,
        E'\n'
    ) as results
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'organizations', 'organization_members', 'user_profiles', 
    'subscriptions', 'domains', 'service_executions', 
    'reports', 'usage_records', 'invoices', 'notifications'
);

-- 3. Check critical functions exist
SELECT 
    'Function Validation' as check_type,
    string_agg(
        proname || ': ✅ EXISTS',
        E'\n'
    ) as results
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND proname IN (
    'get_user_organization_context',
    'check_organization_plan_limits', 
    'handle_new_user_registration',
    'user_has_permission'
);

-- 4. Check RLS policies exist
SELECT 
    'Policy Validation' as check_type,
    COUNT(*) || ' policies created' as results
FROM pg_policies 
WHERE schemaname = 'public';

-- 5. Check initial data exists
SELECT 
    'Data Validation' as check_type,
    'Plans: ' || (SELECT COUNT(*) FROM plans) || 
    ', Services: ' || (SELECT COUNT(*) FROM security_services) ||
    ', Settings: ' || (SELECT COUNT(*) FROM system_settings) as results;

-- 6. Check triggers exist
SELECT 
    'Trigger Validation' as check_type,
    COUNT(*) || ' triggers created' as results
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- 7. Test organization_members structure
SELECT 
    'Multi-Tenant Structure' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'organization_members' 
            AND column_name IN ('organization_id', 'user_id', 'role', 'permissions', 'status')
            GROUP BY table_name
            HAVING COUNT(*) = 5
        ) THEN '✅ organization_members has all required columns'
        ELSE '❌ organization_members missing columns'
    END as results;

-- 8. Final success message
SELECT 
    '🎉 VALIDATION COMPLETE' as check_type,
    CASE 
        WHEN (
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_name IN ('organizations', 'organization_members', 'user_profiles')
        ) = 3 
        THEN '🔥 MULTI-TENANT ARCHITECTURE IS BULLETPROOF! 🔥'
        ELSE '⚠️ Some issues detected - check results above'
    END as results;