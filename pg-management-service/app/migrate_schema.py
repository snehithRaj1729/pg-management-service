#!/usr/bin/env python3
"""
Schema Migration Helper for PG Management System

This script safely adds new columns to existing SQLite database tables
without losing any data.

New columns added in recent updates:
  - tenants.address (VARCHAR(300), nullable)
  - tenants.id_info (VARCHAR(300), nullable)
  - payments.due_date (DATE, nullable)

Usage:
  python3 migrate_schema.py

The script will:
  1. Check if the database file exists
  2. For each new column, check if it already exists
  3. If missing, add the column with default values (NULL for nullable columns)
  4. Report results and any errors

No data is lost or modified in existing rows.
"""

import sqlite3
import os
import sys
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database.db')

MIGRATIONS = [
    {
        'table': 'tenants',
        'column': 'address',
        'definition': 'VARCHAR(300)',
        'description': 'Tenant address (for admin view)'
    },
    {
        'table': 'tenants',
        'column': 'id_info',
        'definition': 'VARCHAR(300)',
        'description': 'Tenant ID information (for admin view)'
    },
    {
        'table': 'payments',
        'column': 'due_date',
        'definition': 'DATE',
        'description': 'Payment due date'
    },
]

def column_exists(conn, table, column):
    """Check if a column exists in a table."""
    cursor = conn.cursor()
    try:
        cursor.execute(f"PRAGMA table_info({table})")
        columns = [row[1] for row in cursor.fetchall()]
        return column in columns
    except Exception as e:
        print(f"  ⚠️  Error checking column: {e}")
        return False

def add_column(conn, table, column, definition):
    """Safely add a new column to a table."""
    cursor = conn.cursor()
    try:
        sql = f"ALTER TABLE {table} ADD COLUMN {column} {definition}"
        cursor.execute(sql)
        conn.commit()
        return True, "Column added successfully"
    except sqlite3.OperationalError as e:
        if 'already exists' in str(e):
            return True, "Column already exists (no action needed)"
        return False, str(e)
    except Exception as e:
        return False, str(e)

def main():
    """Run migration."""
    print("\n" + "=" * 70)
    print("PG Management System - Schema Migration Helper")
    print("=" * 70)
    print(f"Database: {DB_PATH}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70 + "\n")

    # Check if database exists
    if not os.path.exists(DB_PATH):
        print("❌ Database file not found at:", DB_PATH)
        print("   Please ensure the Flask app has been run at least once to create the DB.")
        sys.exit(1)

    print("✅ Database found\n")

    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Get existing tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        existing_tables = [row[0] for row in cursor.fetchall()]
        print(f"Found {len(existing_tables)} tables: {', '.join(existing_tables)}\n")

        total_migrations = len(MIGRATIONS)
        successful = 0
        skipped = 0

        print("Running migrations...\n")

        for i, migration in enumerate(MIGRATIONS, 1):
            table = migration['table']
            column = migration['column']
            definition = migration['definition']
            description = migration['description']

            print(f"[{i}/{total_migrations}] {table}.{column}")
            print(f"  Description: {description}")

            # Check if table exists
            if table not in existing_tables:
                print(f"  ⚠️  Table '{table}' does not exist (may be created on next app startup)")
                skipped += 1
                print()
                continue

            # Check if column already exists
            if column_exists(conn, table, column):
                print(f"  ✅ Column already exists (skipping)")
                skipped += 1
                print()
                continue

            # Add the column
            success, message = add_column(conn, table, column, definition)
            if success:
                print(f"  ✅ Success: {message}")
                successful += 1
            else:
                print(f"  ❌ Failed: {message}")

            print()

        conn.close()

        # Summary
        print("=" * 70)
        print(f"Migration Summary")
        print("=" * 70)
        print(f"Total migrations: {total_migrations}")
        print(f"Successful: {successful}")
        print(f"Skipped: {skipped}")
        print(f"Failed: {total_migrations - successful - skipped}")

        if total_migrations - successful - skipped > 0:
            print("\n⚠️  Some migrations failed. Please review the errors above.")
            sys.exit(1)
        else:
            print("\n✅ All migrations completed successfully!")
            print("\nNo data was modified. All new columns are nullable and will not affect")
            print("existing rows. Existing data remains unchanged.\n")
            sys.exit(0)

    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
