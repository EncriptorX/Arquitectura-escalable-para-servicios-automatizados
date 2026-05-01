#!/usr/bin/env python3
"""
Cuban CAS - Migration Runner
Executes SQL migrations directly against Supabase database
"""

import asyncio
import asyncpg
import os
import sys
from pathlib import Path
from datetime import datetime

class MigrationRunner:
    def __init__(self, db_url: str):
        self.db_url = db_url
        self.connection = None
        self.migrations_dir = Path(__file__).parent.parent / "supabase" / "migrations"
    
    async def connect(self):
        """Connect to the database"""
        try:
            self.connection = await asyncpg.connect(self.db_url)
            print("✅ Connected to Supabase database")
            return True
        except Exception as e:
            print(f"❌ Failed to connect to database: {e}")
            return False
    
    async def disconnect(self):
        """Disconnect from the database"""
        if self.connection:
            await self.connection.close()
            print("✅ Disconnected from database")
    
    async def create_migrations_table(self):
        """Create migrations tracking table if it doesn't exist"""
        try:
            await self.connection.execute("""
                CREATE TABLE IF NOT EXISTS _migrations (
                    id SERIAL PRIMARY KEY,
                    filename TEXT UNIQUE NOT NULL,
                    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    checksum TEXT
                )
            """)
            print("✅ Migrations tracking table ready")
        except Exception as e:
            print(f"❌ Failed to create migrations table: {e}")
            raise
    
    async def get_executed_migrations(self):
        """Get list of already executed migrations"""
        try:
            rows = await self.connection.fetch("SELECT filename FROM _migrations ORDER BY id")
            return [row['filename'] for row in rows]
        except Exception as e:
            print(f"❌ Failed to get executed migrations: {e}")
            return []
    
    async def execute_migration(self, migration_file: Path):
        """Execute a single migration file"""
        try:
            print(f"🔄 Executing migration: {migration_file.name}")
            
            # Read migration content
            with open(migration_file, 'r', encoding='utf-8') as f:
                sql_content = f.read()
            
            # Execute migration in a transaction
            async with self.connection.transaction():
                await self.connection.execute(sql_content)
                
                # Record migration as executed
                await self.connection.execute(
                    "INSERT INTO _migrations (filename) VALUES ($1)",
                    migration_file.name
                )
            
            print(f"✅ Migration completed: {migration_file.name}")
            return True
            
        except Exception as e:
            print(f"❌ Migration failed: {migration_file.name}")
            print(f"   Error: {e}")
            return False
    
    async def run_migrations(self):
        """Run all pending migrations"""
        if not await self.connect():
            return False
        
        try:
            await self.create_migrations_table()
            executed_migrations = await self.get_executed_migrations()
            
            # Get all migration files
            migration_files = sorted([
                f for f in self.migrations_dir.glob("*.sql")
                if f.is_file()
            ])
            
            if not migration_files:
                print("⚠️  No migration files found")
                return True
            
            print(f"📁 Found {len(migration_files)} migration files")
            print(f"📋 Already executed: {len(executed_migrations)} migrations")
            
            # Execute pending migrations
            pending_migrations = [
                f for f in migration_files 
                if f.name not in executed_migrations
            ]
            
            if not pending_migrations:
                print("✅ All migrations are up to date")
                return True
            
            print(f"🚀 Executing {len(pending_migrations)} pending migrations...")
            
            success_count = 0
            for migration_file in pending_migrations:
                if await self.execute_migration(migration_file):
                    success_count += 1
                else:
                    print(f"❌ Stopping migration process due to error")
                    break
            
            print(f"\n📊 Migration Summary:")
            print(f"   ✅ Successful: {success_count}")
            print(f"   ❌ Failed: {len(pending_migrations) - success_count}")
            
            if success_count == len(pending_migrations):
                print("🎉 All migrations completed successfully!")
                return True
            else:
                print("⚠️  Some migrations failed")
                return False
                
        finally:
            await self.disconnect()
    
    async def show_migration_status(self):
        """Show current migration status"""
        if not await self.connect():
            return False
        
        try:
            await self.create_migrations_table()
            executed_migrations = await self.get_executed_migrations()
            
            migration_files = sorted([
                f for f in self.migrations_dir.glob("*.sql")
                if f.is_file()
            ])
            
            print("📋 MIGRATION STATUS")
            print("=" * 50)
            
            for migration_file in migration_files:
                status = "✅ EXECUTED" if migration_file.name in executed_migrations else "⏳ PENDING"
                print(f"{status}: {migration_file.name}")
            
            print(f"\n📊 Summary:")
            print(f"   Total migrations: {len(migration_files)}")
            print(f"   Executed: {len(executed_migrations)}")
            print(f"   Pending: {len(migration_files) - len(executed_migrations)}")
            
            return True
            
        finally:
            await self.disconnect()

async def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python run_migrations.py migrate   - Run all pending migrations")
        print("  python run_migrations.py status    - Show migration status")
        return
    
    command = sys.argv[1]
    
    # Get database URL from environment
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("❌ ERROR: DATABASE_URL environment variable not set")
        print("   Set it to your Supabase database connection string")
        print("   Example: postgresql://postgres:[password]@[host]:5432/postgres")
        return
    
    runner = MigrationRunner(db_url)
    
    if command == "migrate":
        success = await runner.run_migrations()
        if success:
            print("\n🎉 MIGRATION COMPLETE!")
            print("Your database is now ready with the hardcore multi-tenant architecture!")
        else:
            print("\n❌ MIGRATION FAILED!")
            print("Please check the errors above and fix them before retrying.")
            sys.exit(1)
    
    elif command == "status":
        await runner.show_migration_status()
    
    else:
        print(f"❌ Unknown command: {command}")
        print("Available commands: migrate, status")

if __name__ == "__main__":
    asyncio.run(main())