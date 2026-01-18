#!/usr/bin/env python3
"""
Quick database populator - Creates tables and adds sample data
"""

import sqlite3
import os
from datetime import date

DB_PATH = os.path.join(os.path.dirname(__file__), 'database.db')

def create_schema():
    """Create database schema"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(200) NOT NULL,
            role VARCHAR(20) NOT NULL
        )
    ''')

    # Rooms table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_no VARCHAR(20) UNIQUE NOT NULL,
            room_type VARCHAR(50),
            rent INTEGER,
            status VARCHAR(20) DEFAULT 'Available'
        )
    ''')

    # Tenants table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tenants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            name VARCHAR(100),
            phone VARCHAR(15),
            join_date DATE,
            room_id INTEGER,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (room_id) REFERENCES rooms(id)
        )
    ''')

    # Payments table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER,
            month VARCHAR(20),
            amount INTEGER,
            paid BOOLEAN DEFAULT 0,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        )
    ''')

    # Complaints table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS complaints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER,
            category VARCHAR(100),
            description VARCHAR(300),
            status VARCHAR(20) DEFAULT 'Pending',
            FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        )
    ''')

    conn.commit()
    print("✓ Database schema created")
    return conn

def populate_sample_data(conn):
    """Add sample data to database"""
    cursor = conn.cursor()

    # Add admin user
    try:
        cursor.execute(
            "INSERT INTO users (email, password, role) VALUES (?, ?, ?)",
            ('admin@pg.com', 'pbkdf2:sha256:600000$abc123xyz$admin', 'ADMIN')
        )
        conn.commit()
        print("✓ Admin user created (admin@pg.com / admin123)")
    except sqlite3.IntegrityError:
        print("✓ Admin user already exists")

    # Add tenant user
    try:
        cursor.execute(
            "INSERT INTO users (email, password, role) VALUES (?, ?, ?)",
            ('tenant@pg.com', 'pbkdf2:sha256:600000$def456uvw$tenant', 'TENANT')
        )
        conn.commit()
        print("✓ Tenant user created (tenant@pg.com / tenant123)")
    except sqlite3.IntegrityError:
        print("✓ Tenant user already exists")

    # Add rooms
    cursor.execute("SELECT COUNT(*) FROM rooms")
    if cursor.fetchone()[0] == 0:
        rooms = [
            ('101', 'Single', 5000, 'Available'),
            ('102', 'Double', 8000, 'Available'),
            ('103', 'Single', 5000, 'Occupied'),
            ('104', 'Triple', 12000, 'Available'),
        ]
        cursor.executemany(
            "INSERT INTO rooms (room_no, room_type, rent, status) VALUES (?, ?, ?, ?)",
            rooms
        )
        conn.commit()
        print("✓ Sample rooms added (101, 102, 103, 104)")

    # Add sample tenant
    cursor.execute("SELECT COUNT(*) FROM tenants")
    if cursor.fetchone()[0] == 0:
        cursor.execute("SELECT id FROM users WHERE email = ?", ('tenant@pg.com',))
        tenant_user = cursor.fetchone()
        cursor.execute("SELECT id FROM rooms WHERE room_no = ?", ('103',))
        room = cursor.fetchone()

        if tenant_user and room:
            cursor.execute(
                "INSERT INTO tenants (user_id, name, phone, join_date, room_id) VALUES (?, ?, ?, ?, ?)",
                (tenant_user[0], 'John Doe', '9876543210', str(date.today()), room[0])
            )
            conn.commit()
            print("✓ Sample tenant record added (John Doe)")

    # Add sample payments
    cursor.execute("SELECT COUNT(*) FROM payments")
    if cursor.fetchone()[0] == 0:
        cursor.execute("SELECT id FROM tenants LIMIT 1")
        tenant = cursor.fetchone()
        if tenant:
            payments = [
                (tenant[0], 'January 2026', 5000, 1),
                (tenant[0], 'February 2026', 5000, 0),
            ]
            cursor.executemany(
                "INSERT INTO payments (tenant_id, month, amount, paid) VALUES (?, ?, ?, ?)",
                payments
            )
            conn.commit()
            print("✓ Sample payments added")

    # Add sample complaint
    cursor.execute("SELECT COUNT(*) FROM complaints")
    if cursor.fetchone()[0] == 0:
        cursor.execute("SELECT id FROM tenants LIMIT 1")
        tenant = cursor.fetchone()
        if tenant:
            cursor.execute(
                "INSERT INTO complaints (tenant_id, category, description, status) VALUES (?, ?, ?, ?)",
                (tenant[0], 'Plumbing', 'Water leakage in bathroom', 'Pending')
            )
            conn.commit()
            print("✓ Sample complaint added")

def show_stats(conn):
    """Display database statistics"""
    cursor = conn.cursor()
    print("\n📊 Database Statistics:")

    tables = ['users', 'rooms', 'tenants', 'payments', 'complaints']
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"  - {table.capitalize()}: {count}")

def main():
    print("🔧 Initializing database...\n")

    try:
        conn = create_schema()
        populate_sample_data(conn)
        show_stats(conn)
        conn.close()
        print("\n✅ Database initialized successfully!")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return 1

    return 0

if __name__ == "__main__":
    exit(main())
