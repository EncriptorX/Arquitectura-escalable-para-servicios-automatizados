#!/usr/bin/env node
/**
 * Cuban CAS - Migration Runner (Node.js)
 * Executes SQL migrations directly against Supabase database
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MigrationRunner {
    constructor(connectionString) {
        this.connectionString = connectionString;
        this.client = null;
        this.migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
    }

    async connect() {
        try {
            this.client = new Client({ connectionString: this.connectionString });
            await this.client.connect();
            console.log('✅ Connected to Supabase database');
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

    async createMigrationsTable() {
        try {
            await this.client.query(`
                CREATE TABLE IF NOT EXISTS _migrations (
                    id SERIAL PRIMARY KEY,
                    filename TEXT UNIQUE NOT NULL,
                    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    checksum TEXT
                )
            `);
            console.log('✅ Migrations tracking table ready');
        } catch (error) {
            console.error('❌ Failed to create migrations table:', error.message);
            throw error;
        }
    }

    async getExecutedMigrations() {
        try {
            const result = await this.client.query('SELECT filename FROM _migrations ORDER BY id');
            return result.rows.map(row => row.filename);
        } catch (error) {
            console.error('❌ Failed to get executed migrations:', error.message);
            return [];
        }
    }

    async executeMigration(migrationFile) {
        try {
            console.log(`🔄 Executing migration: ${path.basename(migrationFile)}`);
            
            // Read migration content
            const sqlContent = await fs.readFile(migrationFile, 'utf-8');
            
            // Execute migration in a transaction
            await this.client.query('BEGIN');
            
            try {
                await this.client.query(sqlContent);
                
                // Record migration as executed
                await this.client.query(
                    'INSERT INTO _migrations (filename) VALUES ($1)',
                    [path.basename(migrationFile)]
                );
                
                await this.client.query('COMMIT');
                console.log(`✅ Migration completed: ${path.basename(migrationFile)}`);
                return true;
                
            } catch (error) {
                await this.client.query('ROLLBACK');
                throw error;
            }
            
        } catch (error) {
            console.error(`❌ Migration failed: ${path.basename(migrationFile)}`);
            console.error(`   Error: ${error.message}`);
            return false;
        }
    }

    async runMigrations() {
        if (!await this.connect()) {
            return false;
        }

        try {
            await this.createMigrationsTable();
            const executedMigrations = await this.getExecutedMigrations();

            // Get all migration files
            const files = await fs.readdir(this.migrationsDir);
            const migrationFiles = files
                .filter(file => file.endsWith('.sql'))
                .sort()
                .map(file => path.join(this.migrationsDir, file));

            if (migrationFiles.length === 0) {
                console.log('⚠️  No migration files found');
                return true;
            }

            console.log(`📁 Found ${migrationFiles.length} migration files`);
            console.log(`📋 Already executed: ${executedMigrations.length} migrations`);

            // Execute pending migrations
            const pendingMigrations = migrationFiles.filter(file => 
                !executedMigrations.includes(path.basename(file))
            );

            if (pendingMigrations.length === 0) {
                console.log('✅ All migrations are up to date');
                return true;
            }

            console.log(`🚀 Executing ${pendingMigrations.length} pending migrations...`);

            let successCount = 0;
            for (const migrationFile of pendingMigrations) {
                if (await this.executeMigration(migrationFile)) {
                    successCount++;
                } else {
                    console.log('❌ Stopping migration process due to error');
                    break;
                }
            }

            console.log('\n📊 Migration Summary:');
            console.log(`   ✅ Successful: ${successCount}`);
            console.log(`   ❌ Failed: ${pendingMigrations.length - successCount}`);

            if (successCount === pendingMigrations.length) {
                console.log('🎉 All migrations completed successfully!');
                return true;
            } else {
                console.log('⚠️  Some migrations failed');
                return false;
            }

        } finally {
            await this.disconnect();
        }
    }

    async showMigrationStatus() {
        if (!await this.connect()) {
            return false;
        }

        try {
            await this.createMigrationsTable();
            const executedMigrations = await this.getExecutedMigrations();

            const files = await fs.readdir(this.migrationsDir);
            const migrationFiles = files
                .filter(file => file.endsWith('.sql'))
                .sort();

            console.log('📋 MIGRATION STATUS');
            console.log('='.repeat(50));

            for (const migrationFile of migrationFiles) {
                const status = executedMigrations.includes(migrationFile) ? '✅ EXECUTED' : '⏳ PENDING';
                console.log(`${status}: ${migrationFile}`);
            }

            console.log('\n📊 Summary:');
            console.log(`   Total migrations: ${migrationFiles.length}`);
            console.log(`   Executed: ${executedMigrations.length}`);
            console.log(`   Pending: ${migrationFiles.length - executedMigrations.length}`);

            return true;

        } finally {
            await this.disconnect();
        }
    }
}

async function main() {
    const command = process.argv[2];

    if (!command || !['migrate', 'status'].includes(command)) {
        console.log('Usage:');
        console.log('  node run-migrations.js migrate   - Run all pending migrations');
        console.log('  node run-migrations.js status    - Show migration status');
        return;
    }

    // Get database URL from environment
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('❌ ERROR: DATABASE_URL environment variable not set');
        console.error('   Set it to your Supabase database connection string');
        console.error('   Example: postgresql://postgres:[password]@[host]:5432/postgres');
        return;
    }

    const runner = new MigrationRunner(dbUrl);

    if (command === 'migrate') {
        const success = await runner.runMigrations();
        if (success) {
            console.log('\n🎉 MIGRATION COMPLETE!');
            console.log('Your database is now ready with the hardcore multi-tenant architecture!');
        } else {
            console.log('\n❌ MIGRATION FAILED!');
            console.log('Please check the errors above and fix them before retrying.');
            process.exit(1);
        }
    } else if (command === 'status') {
        await runner.showMigrationStatus();
    }
}

export default main;

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}