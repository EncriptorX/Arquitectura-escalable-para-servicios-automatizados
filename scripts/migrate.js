#!/usr/bin/env node
/**
 * Cuban CAS - Migration Script with Environment Loading
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.migration if it exists
const envPath = path.join(__dirname, '..', '.env.migration');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('✅ Loaded environment from .env.migration');
} else {
    console.log('⚠️  .env.migration not found, using system environment variables');
    console.log('   Create .env.migration from .env.migration.example if needed');
}

// Import and run the migration script
const { default: runMigrations } = await import('./run-migrations.js');
await runMigrations();