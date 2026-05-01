#!/usr/bin/env node
/**
 * Simple connection test for Supabase database
 */

import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.migration') });

async function testConnection() {
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
        console.error('❌ DATABASE_URL not found in environment');
        return false;
    }

    console.log('🔍 Testing connection to Supabase...');
    console.log('📍 Host: db.mzdstzougpbxzehoscao.supabase.co');
    
    const client = new Client({
        connectionString: dbUrl,
        connectionTimeoutMillis: 30000,
        query_timeout: 30000,
        statement_timeout: 30000,
        idle_in_transaction_session_timeout: 30000
    });

    try {
        console.log('🔄 Attempting to connect...');
        await client.connect();
        console.log('✅ Connected successfully!');
        
        console.log('🔍 Testing basic query...');
        const result = await client.query('SELECT version(), current_database(), current_user');
        console.log('✅ Query successful!');
        console.log('📊 Database info:');
        console.log(`   Version: ${result.rows[0].version.split(' ').slice(0, 2).join(' ')}`);
        console.log(`   Database: ${result.rows[0].current_database}`);
        console.log(`   User: ${result.rows[0].current_user}`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Connection failed:');
        console.error(`   Error: ${error.message}`);
        console.error(`   Code: ${error.code}`);
        
        if (error.code === 'ETIMEDOUT') {
            console.log('\n💡 Troubleshooting tips:');
            console.log('   1. Check your internet connection');
            console.log('   2. Verify Supabase project is active');
            console.log('   3. Check if your IP is whitelisted in Supabase');
            console.log('   4. Try connecting from Supabase dashboard first');
        }
        
        return false;
        
    } finally {
        try {
            await client.end();
            console.log('🔌 Connection closed');
        } catch (e) {
            // Ignore cleanup errors
        }
    }
}

testConnection().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
});