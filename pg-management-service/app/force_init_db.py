#!/usr/bin/env python3
"""
Force initialize the database with tables and data
"""

import sqlite3
import os
from datetime import date
from werkzeug.security import generate_password_hash

# Define database path
db_path = '/Users/snehithraj/PycharmProjects/PythonProject/pg-management-service/app/database.db'

# Remove old empty database if it exists
if os.path.exists(db_path):
    os.remove(db_path)
    print("✓ Removed old empty database")

# Create connection
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("✓ Creating tables...")

# Create users table
cursor.execute('''
    CREATE TABLE user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(200) NOT NULL,
        role VARCHAR(20) NOT NULL
    )
''')

# Create rooms table
cursor.execute('''
    CREATE TABLE room (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_no VARCHAR(20) UNIQUE NOT NULL,
        room_type VARCHAR(50),
        rent INTEGER,
        status VARCHAR(20) DEFAULT 'Available'
    )
''')

# Create tenants table
cursor.execute('''
    CREATE TABLE tenant (
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

# Create payments table
cursor.execute('''
    CREATE TABLE payment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER,
        month VARCHAR(20),
        amount INTEGER,
        paid BOOLEAN DEFAULT 0,
        FOREIGN KEY (tenant_id) REFERENCES tenant(id)
    )
''')

# Create complaints table
cursor.execute('''
    CREATE TABLE complaint (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER,
        category VARCHAR(100),
        description VARCHAR(300),
        status VARCHAR(20) DEFAULT 'Pending',
        FOREIGN KEY (tenant_id) REFERENCES tenant(id)
    )
''')

conn.commit()
print("✓ Tables created")

# Insert users
print("✓ Adding users...")
cursor.execute(
    "INSERT INTO user (email, password, role) VALUES (?, ?, ?)",
    ('admin@pg.com', generate_password_hash('admin123'), 'ADMIN')
)
cursor.execute(
    "INSERT INTO user (email, password, role) VALUES (?, ?, ?)",
    ('tenant@pg.com', generate_password_hash('tenant123'), 'TENANT')
)
conn.commit()

# Insert rooms
print("✓ Adding rooms...")
cursor.executemany(
    "INSERT INTO room (room_no, room_type, rent, status) VALUES (?, ?, ?, ?)",
    [
        ('101', 'Single', 5000, 'Available'),
        ('102', 'Double', 8000, 'Available'),
        ('103', 'Single', 5000, 'Occupied'),
        ('104', 'Triple', 12000, 'Available'),
    ]
)
conn.commit()

# Insert tenants
print("✓ Adding tenants...")
cursor.execute(
    "INSERT INTO tenant (user_id, name, phone, join_date, room_id) VALUES (?, ?, ?, ?, ?)",
    (2, 'John Doe', '9876543210', str(date.today()), 3)
)
conn.commit()

# Insert payments
print("✓ Adding payments...")
cursor.executemany(
    "INSERT INTO payment (tenant_id, month, amount, paid) VALUES (?, ?, ?, ?)",
    [
        (1, 'January 2026', 5000, 1),
        (1, 'February 2026', 5000, 0),
    ]
)
conn.commit()

# Insert complaints
print("✓ Adding complaints...")
cursor.execute(
    "INSERT INTO complaint (tenant_id, category, description, status) VALUES (?, ?, ?, ?)",
    (1, 'Plumbing', 'Water leakage in bathroom', 'Pending')
)
conn.commit()

# Verify
print("\n✓ Database Statistics:")
cursor.execute("SELECT COUNT(*) FROM user")
users = cursor.fetchone()[0]
cursor.execute("SELECT COUNT(*) FROM room")
rooms = cursor.fetchone()[0]
cursor.execute("SELECT COUNT(*) FROM tenant")
tenants = cursor.fetchone()[0]
cursor.execute("SELECT COUNT(*) FROM payment")
payments = cursor.fetchone()[0]
cursor.execute("SELECT COUNT(*) FROM complaint")
complaints = cursor.fetchone()[0]

print(f"  - Users: {users}")
print(f"  - Rooms: {rooms}")
print(f"  - Tenants: {tenants}")
print(f"  - Payments: {payments}")
print(f"  - Complaints: {complaints}")

conn.close()

# Verify file size
file_size = os.path.getsize(db_path)
print(f"\n✓ Database file size: {file_size} bytes")
print(f"✓ Database initialized successfully at {db_path}")
