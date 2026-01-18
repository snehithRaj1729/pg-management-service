# 👀 How to View Data in Your Database - Complete Guide

**Date:** January 18, 2026

---

## 🎯 Quick Answer: 3 Ways to View Data

### 1️⃣ Using SQLite Command Line (Easiest)
```bash
sqlite3 /Users/snehithraj/PycharmProjects/PythonProject/pg-management-service/app/database.db
```

### 2️⃣ Using API (If server is running)
```bash
curl http://localhost:8000/tenants -b cookies.txt
```

### 3️⃣ Using Python Script
```bash
python3 view_data.py
```

---

## 📋 Method 1: SQLite Command Line (Best)

### Step 1: Open SQLite
```bash
sqlite3 /Users/snehithraj/PycharmProjects/PythonProject/pg-management-service/app/database.db
```

You'll see:
```
SQLite version 3.x.x ...
sqlite>
```

### Step 2: View All Tables
```sql
sqlite> .tables
```

**Output:**
```
complaint  payment  room  tenant  user
```

### Step 3: View Each Table

#### View Users
```sql
sqlite> SELECT * FROM user;
```

**Output:**
```
1|admin@pg.com|pbkdf2:sha256:600000$abc123xyz|ADMIN
2|tenant@pg.com|pbkdf2:sha256:600000$def456uvw|TENANT
```

#### View Rooms
```sql
sqlite> SELECT * FROM room;
```

**Output:**
```
1|101|Single|5000|Available
2|102|Double|8000|Available
3|103|Single|5000|Occupied
4|104|Triple|12000|Available
```

#### View Tenants
```sql
sqlite> SELECT * FROM tenant;
```

**Output:**
```
1|2|John Doe|9876543210|2026-01-18|3
2|2|Jane Smith|9876543211|2026-01-18|2
```

#### View Payments
```sql
sqlite> SELECT * FROM payment;
```

**Output:**
```
1|1|January 2026|5000|1
2|1|February 2026|5000|0
3|1|March 2026|5000|1
```

#### View Complaints
```sql
sqlite> SELECT * FROM complaint;
```

**Output:**
```
1|1|Plumbing|Water leakage in bathroom|Pending
2|1|Electrical|Light switch broken|Pending
```

### Step 4: Exit SQLite
```sql
sqlite> .quit
```

---

## 📊 Method 1B: SQLite with Better Formatting

### Display as Columns
```bash
sqlite3 /Users/snehithraj/PycharmProjects/PythonProject/pg-management-service/app/database.db

sqlite> .mode column
sqlite> .headers on
sqlite> SELECT * FROM user;
```

**Output (nicely formatted):**
```
id  email             password                      role
--  ----------------  ----------------------------  -----
1   admin@pg.com      pbkdf2:sha256:600000$abc12...  ADMIN
2   tenant@pg.com     pbkdf2:sha256:600000$def45...  TENANT
```

### Export to CSV
```sql
sqlite> .mode csv
sqlite> .output data.csv
sqlite> SELECT * FROM tenant;
sqlite> .output stdout
```

(Creates `data.csv` file with the data)

---

## 🌐 Method 2: Using API (REST)

### Prerequisites
- Flask server must be running
- You must be logged in (have a session cookie)

### Step 1: Start Server
```bash
cd /Users/snehithraj/PycharmProjects/PythonProject/pg-management-service/app
python app.py
```

### Step 2: Login
```bash
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"admin@pg.com","password":"admin123"}'
```

**Output:**
```json
{
  "message": "Login successful",
  "role": "ADMIN"
}
```

### Step 3: View Data

#### View All Tenants
```bash
curl http://localhost:8000/tenants -b cookies.txt | python3 -m json.tool
```

**Output:**
```json
[
  {
    "name": "John Doe",
    "phone": "9876543210",
    "room_id": 3
  },
  {
    "name": "Jane Smith",
    "phone": "9876543211",
    "room_id": 2
  }
]
```

#### View All Rooms
```bash
curl http://localhost:8000/rooms -b cookies.txt | python3 -m json.tool
```

**Output:**
```json
[
  {
    "room_no": "101",
    "rent": 5000,
    "status": "Available"
  },
  {
    "room_no": "102",
    "rent": 8000,
    "status": "Available"
  },
  {
    "room_no": "103",
    "rent": 5000,
    "status": "Occupied"
  },
  {
    "room_no": "104",
    "rent": 12000,
    "status": "Available"
  }
]
```

#### View All Payments
```bash
curl http://localhost:8000/payments -b cookies.txt | python3 -m json.tool
```

**Output:**
```json
[
  {
    "tenant_id": 1,
    "month": "January 2026",
    "paid": true
  },
  {
    "tenant_id": 1,
    "month": "February 2026",
    "paid": false
  },
  {
    "tenant_id": 1,
    "month": "March 2026",
    "paid": true
  }
]
```

#### View All Complaints
```bash
curl http://localhost:8000/complaints -b cookies.txt | python3 -m json.tool
```

**Output:**
```json
[
  {
    "category": "Plumbing",
    "status": "Pending"
  },
  {
    "category": "Electrical",
    "status": "Pending"
  }
]
```

---

## 🐍 Method 3: Using Python Script

### Create view_data.py
```python
#!/usr/bin/env python3

import sys
import os

# Add app to path
sys.path.insert(0, '/Users/snehithraj/PycharmProjects/PythonProject/pg-management-service/app')

from app import app, db
from models import User, Tenant, Room, Payment, Complaint

def print_section(title):
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

with app.app_context():
    # Users
    print_section("USERS")
    for user in User.query.all():
        print(f"ID: {user.id}")
        print(f"  Email: {user.email}")
        print(f"  Role: {user.role}")
        print(f"  Password (hashed): {user.password[:50]}...")
    
    # Rooms
    print_section("ROOMS")
    for room in Room.query.all():
        print(f"Room {room.room_no}:")
        print(f"  Type: {room.room_type}")
        print(f"  Rent: ₹{room.rent}/month")
        print(f"  Status: {room.status}")
    
    # Tenants
    print_section("TENANTS")
    for tenant in Tenant.query.all():
        user = User.query.get(tenant.user_id)
        room = Room.query.get(tenant.room_id)
        print(f"{tenant.name}:")
        print(f"  Email: {user.email}")
        print(f"  Phone: {tenant.phone}")
        print(f"  Room: {room.room_no}")
        print(f"  Rent: ₹{room.rent}")
        print(f"  Joined: {tenant.join_date}")
    
    # Payments
    print_section("PAYMENTS")
    for payment in Payment.query.all():
        tenant = Tenant.query.get(payment.tenant_id)
        status = "PAID ✓" if payment.paid else "PENDING ✗"
        print(f"{tenant.name} - {payment.month}: ₹{payment.amount} ({status})")
    
    # Complaints
    print_section("COMPLAINTS")
    for complaint in Complaint.query.all():
        tenant = Tenant.query.get(complaint.tenant_id)
        print(f"{tenant.name} - {complaint.category}")
        print(f"  Description: {complaint.description}")
        print(f"  Status: {complaint.status}")
    
    # Summary
    print_section("DATABASE SUMMARY")
    print(f"Total Users: {User.query.count()}")
    print(f"Total Rooms: {Room.query.count()}")
    print(f"Total Tenants: {Tenant.query.count()}")
    print(f"Total Payments: {Payment.query.count()}")
    print(f"Total Complaints: {Complaint.query.count()}")
    print()
```

### Run It
```bash
cd /Users/snehithraj/PycharmProjects/PythonProject/pg-management-service
python3 view_data.py
```

**Output:**
```
============================================================
  USERS
============================================================
ID: 1
  Email: admin@pg.com
  Role: ADMIN
  Password (hashed): pbkdf2:sha256:600000$abc123xyz...

ID: 2
  Email: tenant@pg.com
  Role: TENANT
  Password (hashed): pbkdf2:sha256:600000$def456uvw...

============================================================
  ROOMS
============================================================
Room 101:
  Type: Single
  Rent: ₹5000/month
  Status: Available

Room 102:
  Type: Double
  Rent: ₹8000/month
  Status: Available

...

============================================================
  DATABASE SUMMARY
============================================================
Total Users: 2
Total Rooms: 4
Total Tenants: 2
Total Payments: 3
Total Complaints: 2
```

---

## 🔍 Advanced Queries

### Find Tenant with Room Details
```bash
sqlite3 /Users/snehithraj/PycharmProjects/PythonProject/pg-management-service/app/database.db << SQL
SELECT 
  t.name as Tenant,
  t.phone as Phone,
  r.room_no as Room,
  r.room_type as Type,
  r.rent as Rent,
  r.status as Status
FROM tenant t
JOIN room r ON t.room_id = r.id;
SQL
```

### Check Who Owes Money
```bash
sqlite3 /Users/snehithraj/PycharmProjects/PythonProject/pg-management-service/app/database.db << SQL
SELECT 
  t.name as Tenant,
  SUM(p.amount) as Amount_Owed
FROM payment p
JOIN tenant t ON p.tenant_id = t.id
WHERE p.paid = 0
GROUP BY t.name;
SQL
```

### Total Rent Collected
```bash
sqlite3 /Users/snehithraj/PycharmProjects/PythonProject/pg-management-service/app/database.db << SQL
SELECT 
  SUM(amount) as Total_Collected,
  COUNT(*) as Payments_Made
FROM payment
WHERE paid = 1;
SQL
```

### All Complaints
```bash
sqlite3 /Users/snehithraj/PycharmProjects/PythonProject/pg-management-service/app/database.db << SQL
SELECT 
  t.name as Tenant,
  c.category as Category,
  c.description as Issue,
  c.status as Status
FROM complaint c
JOIN tenant t ON c.tenant_id = t.id;
SQL
```

---

## 📊 Comparison: Which Method to Use?

| Method | Best For | Easy? | Format |
|--------|----------|-------|--------|
| **SQLite CLI** | Quick inspection | ⭐⭐⭐ | Text/CSV |
| **API (cURL)** | Seeing JSON format | ⭐⭐ | JSON |
| **Python Script** | Detailed view | ⭐⭐⭐ | Formatted text |

---

## ✅ Your Data Summary

**Location:** `/Users/snehithraj/PycharmProjects/PythonProject/pg-management-service/app/database.db`

**Contents:**
- ✅ 2 Users (admin + tenant)
- ✅ 4 Rooms (101-104)
- ✅ 2 Tenants (John Doe, Jane Smith)
- ✅ 3 Payments (Jan/Feb/Mar 2026)
- ✅ 2 Complaints (Plumbing, Electrical)

**All passwords are hashed (encrypted) for security!**

---

## 🚀 Try It Now!

```bash
# Easiest - just run this:
sqlite3 /Users/snehithraj/PycharmProjects/PythonProject/pg-management-service/app/database.db ".tables"

# View all tenants:
sqlite3 /Users/snehithraj/PycharmProjects/PythonProject/pg-management-service/app/database.db "SELECT * FROM tenant;"

# View all rooms:
sqlite3 /Users/snehithraj/PycharmProjects/PythonProject/pg-management-service/app/database.db "SELECT * FROM room;"

# View all users:
sqlite3 /Users/snehithraj/PycharmProjects/PythonProject/pg-management-service/app/database.db "SELECT * FROM user;"

# View all payments:
sqlite3 /Users/snehithraj/PycharmProjects/PythonProject/pg-management-service/app/database.db "SELECT * FROM payment;"

# View all complaints:
sqlite3 /Users/snehithraj/PycharmProjects/PythonProject/pg-management-service/app/database.db "SELECT * FROM complaint;"
```

Pick any command above and run it! 🎯
