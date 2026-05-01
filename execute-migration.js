#!/usr/bin/env node
/**
 * Execute Consolidated Migration
 */

import fs from 'fs/promises';
import pkg from 'pg';
const { Client } = pkg;

async function executeMigration() {
    const connectionString = "postgresql://postgres:EncryptorX2003%3F@db.mzdstzougpbxzehoscao.supabase.co:5432/postgres";
    
    console.log('🚀 Starting Cuban CAS Migration...');
    
    const client = new Client({ connectionString });
    
    try {
        // Connect to database
        console.log('🔌 Connecting to Supabase...');
        await client.connect();
        console.log('✅ Connected successfully!');
        
        // Read consolidated migration
        console.log('📖 Reading consolidated migration...');
        const migrationSQL = await fs.readFile('CONSOLIDATED_MIGRATION.sql', 'utf-8');
        
        // Execute migration
        console.log('⚡ Executing migration (this may take 1-2 minutes)...');
        await client.query(migrationSQL);
        
        console.log('✅ Migration executed successfully!');
        
        // Read and execute validation queries
        console.log('🔍 Running validation queries...');
        const validationSQL = await fs.readFile('VALIDATION_QUERIES.sql', 'utf-8');
        const result = await client.query(validationSQL);
        
        console.log('📊 Validation Results:');
        if (result.rows) {
            result.rows.forEach(row => {
                console.log(`   ${row.check_type}: ${row.results}`);
            });
        }
        
        console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
        console.log('🔥 HARDCORE MULTI-TENANT ARCHITECTURE IS NOW ACTIVE!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        
        // If it's a connection error, provide manual instructions
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            console.log('\n🔧 NETWORK CONNECTIVITY ISSUE DETECTED');
            console.log('Please execute the migration manually in Supabase SQL Editor:');
            console.log('1. Go to https://supabase.com/dashboard');
            console.log('2. Select your project: mzdstzougpbxzehoscao');
            console.log('3. Go to SQL Editor');
            console.log('4. Copy and paste the content of CONSOLIDATED_MIGRATION.sql');
            console.log('5. Click "Run" to execute');
            console.log('6. Then copy and paste VALIDATION_QUERIES.sql to validate');
        }
        
        throw error;
    } finally {
        await client.end();
        console.log('🔌 Database connection closed');
    }
}

executeMigration().catch(console.error);