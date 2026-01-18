#!/usr/bin/env python3
"""
Initialize database and log to file
"""

import sqlite3
import os
from datetime import date
from werkzeug.security import generate_password_hash

DB_PATH = '/Users/snehithraj/PycharmProjects/PythonProject/pg-management-service/app/database.db'
LOG_FILE = '/Users/snehithraj/PycharmProjects/PythonProject/pg-management-service/app/init.log'

def log(msg):
    with open(LOG_FILE, 'a') as f:
        f.write(msg + '\n')
    print(msg)

try:
    log("Starting database initialization...")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create tables
    log("Creating tables...")

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(200) NOT NULL,
            role VARCHAR(20) NOT NULL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS room (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_no VARCHAR(20) UNIQUE NOT NULL,
            room_type VARCHAR(50),
            rent INTEGER,
            status VARCHAR(20) DEFAULT 'Available'
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tenant (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            name VARCHAR(100),
            phone VARCHAR(15),
            join_date DATE,
            room_id INTEGER,
            FOREIGN KEY (user_id) REFERENCES user(id),
            FOREIGN KEY (room_id) REFERENCES room(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS payment (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER,
            month VARCHAR(20),
            amount INTEGER,
            paid BOOLEAN DEFAULT 0,
            FOREIGN KEY (tenant_id) REFERENCES tenant(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS complaint (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER,
            category VARCHAR(100),
            description VARCHAR(300),
            status VARCHAR(20) DEFAULT 'Pending',
            FOREIGN KEY (tenant_id) REFERENCES tenant(id)
        )
    ''')

    conn.commit()
    log("Tables created successfully!")

    # Add sample data
    log("Adding sample data...")

    # Add admin
    cursor.execute(
        "INSERT OR IGNORE INTO user (email, password, role) VALUES (?, ?, ?)",
        ('admin@pg.com', generate_password_hash('admin123'), 'ADMIN')
    )
    conn.commit()
    log("✓ Admin user added")

    # Add tenant user
    cursor.execute(
        "INSERT OR IGNORE INTO user (email, password, role) VALUES (?, ?, ?)",
        ('tenant@pg.com', generate_password_hash('tenant123'), 'TENANT')
    )
    conn.commit()
    log("✓ Tenant user added")

    # Add rooms
    cursor.execute("SELECT COUNT(*) FROM room")
    if cursor.fetchone()[0] == 0:
        rooms = [
            ('101', 'Single', 5000, 'Available'),
            ('102', 'Double', 8000, 'Available'),
            ('103', 'Single', 5000, 'Occupied'),
            ('104', 'Triple', 12000, 'Available'),
        ]
        cursor.executemany(
            "INSERT INTO room (room_no, room_type, rent, status) VALUES (?, ?, ?, ?)",
            rooms
        )
        conn.commit()
        log("✓ Sample rooms added")

    # Add tenant record
    cursor.execute("SELECT COUNT(*) FROM tenant")
    if cursor.fetchone()[0] == 0:
        cursor.execute("SELECT id FROM user WHERE email = ?", ('tenant@pg.com',))
        tenant_user = cursor.fetchone()
        cursor.execute("SELECT id FROM room WHERE room_no = ?", ('103',))
        room = cursor.fetchone()

        if tenant_user and room:
            cursor.execute(
                "INSERT INTO tenant (user_id, name, phone, join_date, room_id) VALUES (?, ?, ?, ?, ?)",
                (tenant_user[0], 'John Doe', '9876543210', str(date.today()), room[0])
            )
            conn.commit()
            log("✓ Tenant record added")

    # Add payments
    cursor.execute("SELECT COUNT(*) FROM payment")
    if cursor.fetchone()[0] == 0:
        cursor.execute("SELECT id FROM tenant LIMIT 1")
        tenant = cursor.fetchone()
        if tenant:
            payments = [
                (tenant[0], 'January 2026', 5000, 1),
                (tenant[0], 'February 2026', 5000, 0),
            ]
            cursor.executemany(
                "INSERT INTO payment (tenant_id, month, amount, paid) VALUES (?, ?, ?, ?)",
                payments
            )
            conn.commit()
            log("✓ Sample payments added")

    # Add complaint
    cursor.execute("SELECT COUNT(*) FROM complaint")
    if cursor.fetchone()[0] == 0:
        cursor.execute("SELECT id FROM tenant LIMIT 1")
        tenant = cursor.fetchone()
        if tenant:
            cursor.execute(
                "INSERT INTO complaint (tenant_id, category, description, status) VALUES (?, ?, ?, ?)",
                (tenant[0], 'Plumbing', 'Water leakage in bathroom', 'Pending')
            )
            conn.commit()
            log("✓ Sample complaint added")

    # Show stats
    log("\n📊 Database Statistics:")
    for table in ['user', 'room', 'tenant', 'payment', 'complaint']:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        log(f"  - {table.capitalize()}s: {count}")

    conn.close()
    log("\n✅ Database initialization complete!")

except Exception as e:
    log(f"❌ Error: {str(e)}")
    import traceback
    log(traceback.format_exc())
