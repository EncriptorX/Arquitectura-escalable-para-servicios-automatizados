#!/usr/bin/env node
/**
 * Generate consolidated migration SQL for manual execution
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateConsolidatedSQL() {
    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
    const outputFile = path.join(__dirname, '..', 'CONSOLIDATED_MIGRATION.sql');
    
    try {
        console.log('🔍 Reading migration files...');
        
        const files = await fs.readdir(migrationsDir);
        const migrationFiles = files
            .filter(file => file.endsWith('.sql'))
            .sort();
        
        if (migrationFiles.length === 0) {
            console.log('❌ No migration files found');
            return false;
        }
        
        console.log(`📁 Found ${migrationFiles.length} migration files:`);
        migrationFiles.forEach(file => console.log(`   - ${file}`));
        
        let consolidatedSQL = `-- =====================================================
-- CUBAN CAS - CONSOLIDATED MIGRATION SQL
-- Generated: ${new Date().toISOString()}
-- Execute this in Supabase SQL Editor
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

`;
        
        for (const file of migrationFiles) {
            const filePath = path.join(migrationsDir, file);
            const content = await fs.readFile(filePath, 'utf-8');
            
            consolidatedSQL += `
-- =====================================================
-- MIGRATION: ${file}
-- =====================================================

${content}

`;
        }
        
        // Add migration tracking
        consolidatedSQL += `
-- =====================================================
-- MIGRATION TRACKING
-- =====================================================

-- Create migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    filename TEXT UNIQUE NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checksum TEXT
);

-- Record executed migrations
`;
        
        for (const file of migrationFiles) {
            consolidatedSQL += `INSERT INTO _migrations (filename) VALUES ('${file}') ON CONFLICT (filename) DO NOTHING;\n`;
        }
        
        consolidatedSQL += `
-- =====================================================
-- VALIDATION QUERIES
-- =====================================================

-- Check that all tables were created
SELECT 
    'organizations' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
    'organization_members' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_members') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
    'user_profiles' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
    'plans' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plans') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
    'subscriptions' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check RLS is enabled
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN '✅ RLS ENABLED' ELSE '❌ RLS DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('organizations', 'organization_members', 'user_profiles', 'subscriptions', 'domains')
ORDER BY tablename;

-- Check functions exist
SELECT 
    proname as function_name,
    '✅ EXISTS' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND proname IN ('get_user_organization_context', 'check_organization_plan_limits', 'handle_new_user_registration')
ORDER BY proname;

-- Success message
SELECT '🎉 MIGRATION COMPLETED SUCCESSFULLY! 🎉' as result;
`;
        
        await fs.writeFile(outputFile, consolidatedSQL);
        
        console.log('\n✅ Consolidated migration SQL generated!');
        console.log(`📄 File: ${outputFile}`);
        console.log('\n🚀 NEXT STEPS:');
        console.log('1. Open Supabase Dashboard > SQL Editor');
        console.log('2. Copy and paste the content of CONSOLIDATED_MIGRATION.sql');
        console.log('3. Execute the SQL');
        console.log('4. Check the validation queries at the end');
        
        return true;
        
    } catch (error) {
        console.error('❌ Error generating consolidated SQL:', error.message);
        return false;
    }
}

generateConsolidatedSQL().then(success => {
    if (success) {
        console.log('\n🔥 Ready to execute in Supabase SQL Editor!');
    }
    process.exit(success ? 0 : 1);
});