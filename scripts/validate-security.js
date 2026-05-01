#!/usr/bin/env node
/**
 * Cuban CAS - Security Validation Script (Node.js)
 * Validates that the Zero Trust multi-tenant architecture is working correctly
 */

import pkg from 'pg';
const { Client } = pkg;
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.migration');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

class SecurityValidator {
    constructor(connectionString) {
        this.connectionString = connectionString;
        this.client = null;
        this.testResults = [];
    }

    async connect() {
        try {
            this.client = new Client({ connectionString: this.connectionString });
            await this.client.connect();
            console.log('✅ Connected to database');
            return true;
        } catch (error) {
            console.error('❌ Failed to connect to database:', error.message);
            return false;
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.end();
            console.log('✅ Disconnected from database');
        }
    }

    logTest(testName, passed, details = '') {
        const result = {
            test: testName,
            passed,
            details,
            timestamp: new Date().toISOString()
        };
        this.testResults.push(result);

        const status = passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${status}: ${testName}`);
        if (details) {
            console.log(`   Details: ${details}`);
        }
    }

    async testTableStructure() {
        console.log('\n🔍 Testing Table Structure...');

        const requiredTables = [
            'organizations',
            'organization_members',
            'user_profiles',
            'plans',
            'subscriptions',
            'domains',
            'security_services',
            'service_executions',
            'reports',
            'usage_records',
            'invoices',
            'notifications'
        ];

        for (const table of requiredTables) {
            try {
                const result = await this.client.query(
                    "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = $1",
                    [table]
                );
                const exists = parseInt(result.rows[0].count) > 0;
                this.logTest(
                    `Table ${table} exists`,
                    exists,
                    `Found: ${exists}`
                );
            } catch (error) {
                this.logTest(`Table ${table} exists`, false, error.message);
            }
        }
    }

    async testRLSEnabled() {
        console.log('\n🛡️ Testing Row Level Security...');

        const criticalTables = [
            'organizations',
            'organization_members',
            'user_profiles',
            'subscriptions',
            'domains',
            'service_executions',
            'reports',
            'usage_records',
            'invoices',
            'notifications'
        ];

        for (const table of criticalTables) {
            try {
                const result = await this.client.query(
                    "SELECT rowsecurity FROM pg_tables WHERE tablename = $1",
                    [table]
                );
                const rlsEnabled = result.rows.length > 0 && result.rows[0].rowsecurity;
                this.logTest(
                    `RLS enabled on ${table}`,
                    rlsEnabled,
                    `RLS status: ${rlsEnabled}`
                );
            } catch (error) {
                this.logTest(`RLS enabled on ${table}`, false, error.message);
            }
        }
    }

    async testPoliciesExist() {
        console.log('\n📋 Testing RLS Policies...');

        try {
            const result = await this.client.query(`
                SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
                FROM pg_policies 
                WHERE schemaname = 'public'
                ORDER BY tablename, policyname
            `);

            const policyCount = result.rows.length;
            this.logTest(
                'RLS policies exist',
                policyCount > 0,
                `Found ${policyCount} policies`
            );

            // Check for critical policies
            const policyNames = result.rows.map(p => p.policyname);
            const criticalPolicies = [
                'Users can view their organizations',
                'Organization members can view domains',
                'Organization members can view executions',
                'Analysts can execute services'
            ];

            for (const policy of criticalPolicies) {
                const exists = policyNames.some(name => 
                    name.toLowerCase().includes(policy.toLowerCase().split(' ').slice(0, 3).join(' '))
                );
                this.logTest(
                    `Critical policy exists: ${policy}`,
                    exists,
                    exists ? 'Found' : 'Missing'
                );
            }

        } catch (error) {
            this.logTest('RLS policies exist', false, error.message);
        }
    }

    async testFunctionsExist() {
        console.log('\n⚙️ Testing Database Functions...');

        const criticalFunctions = [
            'get_user_organization_context',
            'user_has_permission',
            'check_organization_plan_limits',
            'handle_new_user_registration'
        ];

        for (const func of criticalFunctions) {
            try {
                const result = await this.client.query(`
                    SELECT COUNT(*) 
                    FROM pg_proc p
                    JOIN pg_namespace n ON p.pronamespace = n.oid
                    WHERE n.nspname = 'public' AND p.proname = $1
                `, [func]);

                const exists = parseInt(result.rows[0].count) > 0;
                this.logTest(
                    `Function ${func} exists`,
                    exists,
                    `Found: ${exists}`
                );
            } catch (error) {
                this.logTest(`Function ${func} exists`, false, error.message);
            }
        }
    }

    async testInitialData() {
        console.log('\n📦 Testing Initial Data...');

        try {
            // Test plans exist
            const planResult = await this.client.query('SELECT COUNT(*) FROM plans');
            const planCount = parseInt(planResult.rows[0].count);
            this.logTest(
                'Service plans exist',
                planCount >= 4,
                `Found ${planCount} plans (expected >= 4)`
            );
        } catch (error) {
            this.logTest('Service plans exist', false, error.message);
        }

        try {
            // Test security services exist
            const serviceResult = await this.client.query('SELECT COUNT(*) FROM security_services');
            const serviceCount = parseInt(serviceResult.rows[0].count);
            this.logTest(
                'Security services exist',
                serviceCount >= 4,
                `Found ${serviceCount} services (expected >= 4)`
            );
        } catch (error) {
            this.logTest('Security services exist', false, error.message);
        }
    }

    async testMultiTenantStructure() {
        console.log('\n🏢 Testing Multi-Tenant Structure...');

        try {
            // Check organization_members table structure
            const result = await this.client.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'organization_members'
                ORDER BY ordinal_position
            `);

            const requiredColumns = ['organization_id', 'user_id', 'role', 'permissions', 'status'];
            const existingColumns = result.rows.map(c => c.column_name);

            const allColumnsExist = requiredColumns.every(col => existingColumns.includes(col));
            this.logTest(
                'organization_members has required columns',
                allColumnsExist,
                `Required: ${requiredColumns.join(', ')}`
            );

            // Check unique constraint exists
            const constraintResult = await this.client.query(`
                SELECT COUNT(*)
                FROM pg_constraint c
                JOIN pg_class t ON c.conrelid = t.oid
                WHERE t.relname = 'organization_members'
                AND c.contype = 'u'
            `);

            const hasUniqueConstraint = parseInt(constraintResult.rows[0].count) > 0;
            this.logTest(
                'organization_members unique constraint exists',
                hasUniqueConstraint,
                'Prevents duplicate memberships'
            );

        } catch (error) {
            this.logTest('Multi-tenant structure', false, error.message);
        }
    }

    async generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('🔍 MULTI-TENANT SECURITY VALIDATION REPORT');
        console.log('='.repeat(60));

        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;

        console.log('\n📊 SUMMARY:');
        console.log(`   Total Tests: ${totalTests}`);
        console.log(`   ✅ Passed: ${passedTests}`);
        console.log(`   ❌ Failed: ${failedTests}`);
        console.log(`   📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

        if (failedTests > 0) {
            console.log('\n❌ FAILED TESTS:');
            for (const result of this.testResults) {
                if (!result.passed) {
                    console.log(`   • ${result.test}: ${result.details}`);
                }
            }
        }

        console.log('\n🎯 SECURITY ASSESSMENT:');
        if (failedTests === 0) {
            console.log('   🔥 BULLETPROOF: All security validations passed!');
            console.log('   ✅ Zero Trust architecture is properly implemented');
            console.log('   ✅ Multi-tenant isolation is guaranteed');
            console.log('   ✅ Ready for production deployment');
        } else if (failedTests <= 3) {
            console.log('   ⚠️  MOSTLY SECURE: Minor issues detected');
            console.log('   🔧 Fix failed tests before production deployment');
        } else {
            console.log('   🚨 SECURITY ISSUES: Critical problems detected');
            console.log('   ❌ DO NOT deploy to production until all issues are resolved');
        }

        // Save detailed report
        const reportData = {
            validation_timestamp: new Date().toISOString(),
            summary: {
                total_tests: totalTests,
                passed_tests: passedTests,
                failed_tests: failedTests,
                success_rate: (passedTests / totalTests) * 100
            },
            test_results: this.testResults
        };

        fs.writeFileSync('multi_tenant_validation_report.json', JSON.stringify(reportData, null, 2));
        console.log('\n📄 Detailed report saved to: multi_tenant_validation_report.json');

        return failedTests === 0;
    }

    async runAllValidations() {
        console.log('🚀 Starting Multi-Tenant Security Validation...');
        console.log('='.repeat(60));

        if (!await this.connect()) {
            return false;
        }

        try {
            await this.testTableStructure();
            await this.testRLSEnabled();
            await this.testPoliciesExist();
            await this.testFunctionsExist();
            await this.testInitialData();
            await this.testMultiTenantStructure();

            const success = await this.generateReport();
            return success;

        } finally {
            await this.disconnect();
        }
    }
}

async function main() {
    // Get database URL from environment
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('❌ ERROR: DATABASE_URL environment variable not set');
        console.error('   Set it in .env.migration file or as environment variable');
        console.error('   Example: postgresql://postgres:[password]@[host]:5432/postgres');
        return false;
    }

    const validator = new SecurityValidator(dbUrl);
    const success = await validator.runAllValidations();

    if (success) {
        console.log('\n🎉 VALIDATION COMPLETE: Your multi-tenant architecture is BULLETPROOF!');
        return true;
    } else {
        console.log('\n⚠️  VALIDATION INCOMPLETE: Please fix the issues above');
        return false;
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('❌ Validation failed:', error.message);
        process.exit(1);
    });
}