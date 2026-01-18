#!/usr/bin/env python3
"""Test database and show all data"""

import sqlite3
import sys

db_path = '/Users/snehithraj/PycharmProjects/PythonProject/pg-management-service/app/database.db'

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("="*70)
    print("DATABASE VERIFICATION")
    print("="*70)

    # Check tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()

    print(f"\n✓ Tables Found: {len(tables)}")
    for table in tables:
        table_name = table[0]
        cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
        count = cursor.fetchone()[0]
        print(f"  - {table_name}: {count} records")

    # Show actual data
    print("\n" + "="*70)
    print("USERS")
    print("="*70)
    cursor.execute("SELECT * FROM user;")
    for row in cursor.fetchall():
        print(row)

    print("\n" + "="*70)
    print("ROOMS")
    print("="*70)
    cursor.execute("SELECT * FROM room;")
    for row in cursor.fetchall():
        print(row)

    print("\n" + "="*70)
    print("TENANTS")
    print("="*70)
    cursor.execute("SELECT * FROM tenant;")
    for row in cursor.fetchall():
        print(row)

    print("\n" + "="*70)
    print("PAYMENTS")
    print("="*70)
    cursor.execute("SELECT * FROM payment;")
    for row in cursor.fetchall():
        print(row)

    print("\n" + "="*70)
    print("COMPLAINTS")
    print("="*70)
    cursor.execute("SELECT * FROM complaint;")
    for row in cursor.fetchall():
        print(row)

    print("\n" + "="*70)
    print("✅ DATABASE IS READY!")
    print("="*70)

    conn.close()

except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
